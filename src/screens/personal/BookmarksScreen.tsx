import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { useBookmarks, usePlans } from '../../data/hooks';
import { placeById } from '../../fixtures/places';
import { listSavedGooglePlaces } from '../../lib/savedGooglePlaces';
import { listOutingPlans } from '../../lib/outingPlans';

// S23: Places and Plans are one list with a toggle, not two screens.
// Bridge "Add to plan" writes a real, arbitrary-length plan to Supabase for
// a signed-in User (plan_items — P5 §4); a Guest gets the same multi-stop
// experience, but local-only (outingPlans.ts), since there is no account to
// persist it under.
export function BookmarksScreen() {
  const [tab, setTab] = useState<'places' | 'plans'>('places');
  const navigate = useNavigate();
  const { userId } = usePersona();
  const { data: bookmarks = [] } = useBookmarks(userId);
  const { data: cataloguePlans = [] } = usePlans(userId);
  // Re-read on each tab switch so saves from detail / bridge show up after navigate.
  const googleSaved = useMemo(() => listSavedGooglePlaces(), [tab, bookmarks.length]);
  const outingPlans = useMemo(() => listOutingPlans(), [tab]);

  const catalogueRows = bookmarks
    .map((b) => {
      const place = placeById(b.placeId);
      if (!place) return null;
      return { key: b.id, name: place.name, placeId: place.id, kind: 'catalogue' as const };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const googleRows = googleSaved.map((g) => ({
    key: g.placeId,
    name: g.name,
    placeId: g.placeId,
    kind: 'google' as const,
    address: g.address,
  }));

  const placeRows = [...googleRows, ...catalogueRows];

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
          placeRows.length === 0 ? (
            <EmptyState
              icon="bookmark"
              title="Nothing saved yet"
              body="Bookmark a place from its detail page to see it here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {placeRows.map((row) => (
                <Card
                  key={row.key}
                  interactive={row.kind === 'google'}
                  onClick={
                    row.kind === 'google'
                      ? () => navigate(`/places/${encodeURIComponent(row.placeId)}`)
                      : undefined
                  }
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: 'var(--type-body)' }}>{row.name}</div>
                    {row.kind === 'google' && 'address' in row && row.address ? (
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
                  </div>
                  {row.kind === 'catalogue' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/log-visit', { state: { placeId: row.placeId } })}
                    >
                      Mark as visited
                    </Button>
                  ) : null}
                </Card>
              ))}
            </div>
          )
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
    </AppShell>
  );
}
