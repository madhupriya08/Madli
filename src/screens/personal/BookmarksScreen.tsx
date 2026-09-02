import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { Tag } from '../../components/core/Tag';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { Input } from '../../components/forms/Input';
import { Dialog } from '../../components/feedback/Dialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { RankGooglePlaceForm } from '../../components/ranking/RankGooglePlaceForm';
import { usePersona } from '../../dev/PersonaContext';
import { useBookmarks, useRemoveBookmark, useSetBookmarkNote, usePlans } from '../../data/hooks';
import { placeById } from '../../fixtures/places';
import { areas } from '../../fixtures/areas';
import { categories } from '../../fixtures/categories';
import {
  listSavedGooglePlaces,
  removeSavedGooglePlace,
  setSavedGooglePlaceNote,
} from '../../lib/savedGooglePlaces';
import { listOutingPlans } from '../../lib/outingPlans';
import { haversineMeters, useSearch, type Door } from '../../lib/searchState';
import { inferDoorFromTypes } from '../../lib/placesSearch';

/** Close enough to "you're right by it" to surface the nearby banner (S23). */
const NEARBY_RADIUS_METERS = 2000;

interface PlaceRow {
  key: string;
  placeId: string;
  name: string;
  kind: 'catalogue' | 'google';
  note: string | null;
  address?: string;
  areaId?: string | null;
  categoryId?: string;
  door?: Door;
  types?: string[];
  location: { lat: number; lng: number } | null;
}

// S23: Places and Plans are one list with a toggle, not two screens. Bridge
// "Add to plan" writes a real, arbitrary-length plan to Supabase for a
// signed-in User (plan_items — P5 §4); a Guest gets the same multi-stop
// experience, but local-only (outingPlans.ts), since there is no account to
// persist it under.
//
// The note/filter/nearby/remove features below are Places-tab only — a
// multi-stop plan has no single area or category to filter by, and a
// freeform "why I saved this" reads oddly attached to a whole route rather
// than one place, so Plans keeps its existing (P8 §3) edit/remove surface
// unchanged.
export function BookmarksScreen() {
  const [tab, setTab] = useState<'places' | 'plans'>('places');
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [rankingRow, setRankingRow] = useState<PlaceRow | null>(null);
  const [googleTick, setGoogleTick] = useState(0);
  const navigate = useNavigate();
  const { userId } = usePersona();
  const { effectiveCenter, search } = useSearch();
  const { data: bookmarks = [] } = useBookmarks(userId);
  const { data: cataloguePlans = [] } = usePlans(userId);
  const removeBookmark = useRemoveBookmark(userId);
  const setBookmarkNote = useSetBookmarkNote(userId);
  // Re-read on each tab switch (or after a Google-side write here) so saves
  // from detail / bridge, and removes / notes made right on this screen,
  // both show up without needing a full remount.
  const googleSaved = useMemo(
    () => listSavedGooglePlaces(),
    [tab, bookmarks.length, googleTick],
  );
  const outingPlans = useMemo(() => listOutingPlans(), [tab]);

  const catalogueRows: PlaceRow[] = bookmarks
    .map((b): PlaceRow | null => {
      const place = placeById(b.placeId);
      if (!place) return null;
      return {
        key: b.id,
        placeId: place.id,
        name: place.name,
        kind: 'catalogue',
        note: b.note,
        areaId: place.areaId,
        categoryId: place.categoryId,
        door: place.type,
        location: place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null,
      };
    })
    .filter((r): r is PlaceRow => r !== null);

  const googleRows: PlaceRow[] = googleSaved.map((g) => ({
    key: g.placeId,
    placeId: g.placeId,
    name: g.name,
    kind: 'google',
    note: g.note ?? null,
    address: g.address,
    types: g.types,
    door: inferDoorFromTypes(g.types),
    location: g.location ?? null,
  }));

  // Area/category filters only ever apply to catalogue rows — a Google-
  // sourced bookmark has neither a seeded area nor a catalogue category, so
  // it stays visible rather than being silently hidden by a filter it has no
  // way to answer.
  const filteredCatalogueRows = catalogueRows.filter(
    (r) =>
      (!areaFilter || r.areaId === areaFilter) &&
      (!categoryFilter || r.categoryId === categoryFilter),
  );
  const placeRows = [...googleRows, ...filteredCatalogueRows];

  const usedAreaIds = [
    ...new Set(catalogueRows.map((r) => r.areaId).filter((id): id is string => !!id)),
  ];
  const usedAreas = areas.filter((a) => usedAreaIds.includes(a.id));
  const usedCategoryIds = [...new Set(catalogueRows.map((r) => r.categoryId).filter(Boolean))];
  const usedCategories = categories.filter((c) => usedCategoryIds.includes(c.id));

  const nearbyRows = placeRows.filter(
    (r) => r.location && haversineMeters(effectiveCenter, r.location) <= NEARBY_RADIUS_METERS,
  );

  const removeRow = (row: PlaceRow) => {
    if (row.kind === 'catalogue') removeBookmark.mutate(row.placeId);
    else {
      removeSavedGooglePlace(row.placeId);
      setGoogleTick((n) => n + 1);
    }
  };

  const startNote = (row: PlaceRow) => {
    setEditingKey(row.key);
    setNoteDraft(row.note ?? '');
  };

  const saveNote = (row: PlaceRow) => {
    if (row.kind === 'catalogue') setBookmarkNote.mutate({ placeId: row.placeId, note: noteDraft });
    else {
      setSavedGooglePlaceNote(row.placeId, noteDraft);
      setGoogleTick((n) => n + 1);
    }
    setEditingKey(null);
  };

  const markVisited = (row: PlaceRow) => {
    if (row.kind === 'catalogue') {
      navigate('/log-visit', { state: { placeId: row.placeId } });
      return;
    }
    setRankingRow(row);
  };

  const planRows = [
    ...outingPlans.map((p) => ({
      key: `outing:${p.anchorPlaceId}`,
      id: p.anchorPlaceId,
      kind: 'outing' as const,
      name: `${p.name ?? p.anchorName} · ${p.stops.length} stop${p.stops.length === 1 ? '' : 's'}`,
      subtitle: p.stops.map((s) => s.name).join(' · '),
    })),
    ...cataloguePlans.map((p) => ({
      key: p.id,
      id: p.id,
      kind: 'catalogue' as const,
      name: p.name ?? 'Saved plan',
      subtitle: `${p.anchorName} · ${p.stops.length} stop${p.stops.length === 1 ? '' : 's'}`,
    })),
  ];

  const placeCard = (row: PlaceRow) => (
    <Card key={row.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/places/${encodeURIComponent(row.placeId)}`)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
            minWidth: 0,
            flex: 1,
          }}
        >
          <div style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>{row.name}</div>
          {row.address ? (
            <div
              style={{
                font: 'var(--type-caption)',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.address}
            </div>
          ) : null}
        </button>
        <Button size="sm" variant="secondary" onClick={() => markVisited(row)}>
          Mark as visited
        </Button>
        <Button size="sm" variant="ghost" onClick={() => removeRow(row)}>
          Remove
        </Button>
      </div>

      {editingKey === row.key ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Why did you save this?"
              maxLength={280}
            />
          </div>
          <Button size="sm" onClick={() => saveNote(row)}>
            Save
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => startNote(row)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            font: 'var(--type-caption)',
            color: row.note ? 'var(--text-body)' : 'var(--text-link)',
          }}
        >
          {row.note || 'Add a note — why did you save this?'}
        </button>
      )}
    </Card>
  );

  return (
    <AppShell title="Bookmarks">
      <div style={{ padding: 'var(--space-5) var(--gutter)' }}>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Tabs
            items={[
              { value: 'places', label: 'Places' },
              { value: 'plans', label: 'Plans' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as 'places' | 'plans')}
          />
        </div>

        {tab === 'places' ? (
          <>
            {(usedAreas.length > 0 || usedCategories.length > 0) && placeRows.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                {usedAreas.map((a) => (
                  <Tag
                    key={a.id}
                    selected={areaFilter === a.id}
                    onClick={() => setAreaFilter(areaFilter === a.id ? null : a.id)}
                  >
                    {a.name}
                  </Tag>
                ))}
                {usedCategories.map((c) => (
                  <Tag
                    key={c.id}
                    selected={categoryFilter === c.id}
                    onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
                  >
                    {c.name}
                  </Tag>
                ))}
              </div>
            ) : null}

            {nearbyRows.length > 0 ? (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <h2
                  style={{
                    font: 'var(--type-eyebrow)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-eyebrow)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Nearby now
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {nearbyRows.map(placeCard)}
                </div>
              </div>
            ) : null}

            {placeRows.length === 0 ? (
              <EmptyState
                icon="bookmark"
                title="Nothing saved yet"
                body="Bookmark a place from its detail page to see it here."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {placeRows.map(placeCard)}
              </div>
            )}
          </>
        ) : planRows.length === 0 ? (
          <EmptyState
            icon="map"
            title="No plans saved"
            body="From a place detail page, open nearby picks and tap Add to plan."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {planRows.map((p) => (
              <Card
                key={p.key}
                interactive
                onClick={() =>
                  navigate(
                    p.kind === 'outing'
                      ? `/plans/${encodeURIComponent(p.id)}`
                      : `/plans/${p.id}`,
                  )
                }
              >
                <div style={{ font: 'var(--type-body)' }}>{p.name}</div>
                {p.subtitle ? (
                  <div
                    style={{
                      marginTop: 4,
                      font: 'var(--type-caption)',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.subtitle}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={rankingRow !== null}
        title="Rank this place"
        onClose={() => setRankingRow(null)}
        variant="sheet"
      >
        {rankingRow ? (
          <RankGooglePlaceForm
            candidate={{
              placeId: rankingRow.placeId,
              name: rankingRow.name,
              door: rankingRow.door ?? 'eat',
              location: rankingRow.location,
              areaText: search.areaText.trim() || null,
              types: rankingRow.types,
            }}
            onDone={() => setRankingRow(null)}
          />
        ) : null}
      </Dialog>
    </AppShell>
  );
}
