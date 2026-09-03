import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { Switch } from '../../components/forms/Switch';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { Dialog } from '../../components/feedback/Dialog';
import { RankGooglePlaceForm } from '../../components/ranking/RankGooglePlaceForm';
import { useAllRankedEntries, LOCAL_STATUS_THRESHOLD } from '../../data/hooks';
import { useMyGoogleRankings, type RankedGooglePlace } from '../../data/googleRankings';
import { subtypeFor } from '../../data/rankedSubtypes';
import { categories } from '../../fixtures/categories';
import { placeById } from '../../fixtures/places';
import type { Tier } from '../../fixtures/mockDb';
import type { Door } from '../../lib/searchState';

const DOOR_LABEL: Record<Door, string> = { eat: 'Eat', explore: 'Explore' };

// Mirrors the design handoff's own CAT_META (prototype's S31 section,
// "Madli Prototype.dc.html" ~line 3796) — icon + accent colour per catalogue
// category. Falls back to a plain list icon for anything not in this map.
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Breakfast and tiffin': { icon: 'utensils', color: 'var(--teal-500)' },
  'Biryani and kebab': { icon: 'utensils', color: 'var(--coral-400)' },
  Cafes: { icon: 'utensils', color: 'var(--sky-400)' },
  'Lakes and viewpoints': { icon: 'map-pin', color: 'var(--teal-600)' },
  Historical: { icon: 'map-pin', color: 'var(--slate-500)' },
  Nightlife: { icon: 'sparkles', color: 'var(--coral-500)' },
  'Concerts and events': { icon: 'sparkles', color: 'var(--sky-500)' },
};

const TIER_LABEL: Record<'loved' | 'fine', string> = {
  loved: 'Been and loved',
  fine: 'Been and fine',
};

/** What "Re-rank" actually does for this row — the two ranking mechanics this app has, each with its own re-rank path (P13 §6). */
type Rerank =
  | { kind: 'catalogue'; placeId: string }
  | { kind: 'google'; googlePlaceId: string; name: string; door: Door; types: string[] };

interface Row {
  key: string;
  pos: number;
  name: string;
  tier: Tier;
  rerank?: Rerank;
}

interface Column {
  id: string;
  label: string;
  icon: string;
  color: string;
  totalCount: number;
  rows: Row[];
  hiddenCount: number;
}

function hideVisitedKey(userId: string) {
  return `madli.hideVisitedElsewhere.${userId}`;
}

// S31: the design's own README says this toggle "only affects the you
// haven't-been-here slot elsewhere in the app" — no such slot exists
// anywhere else in this build yet (there is nothing to grep for). Stored
// locally so the choice at least survives a refresh instead of being purely
// decorative; wire a real consumer to it once that slot is built.
function readHideVisited(userId: string): boolean {
  try {
    return localStorage.getItem(hideVisitedKey(userId)) === '1';
  } catch {
    return false;
  }
}

function writeHideVisited(userId: string, value: boolean): void {
  try {
    localStorage.setItem(hideVisitedKey(userId), value ? '1' : '0');
  } catch {
    // Private mode / quota — the toggle just won't survive a refresh.
  }
}

function buildShareText(columns: Column[]): string {
  const lines = ['My ranked list — Madli'];
  for (const column of columns) {
    if (column.rows.length === 0) continue;
    lines.push('', column.label);
    for (const row of column.rows) lines.push(`#${row.pos} ${row.name}`);
  }
  return lines.join('\n');
}

function toColumn(
  id: string,
  label: string,
  meta: { icon: string; color: string },
  all: Array<{
    id: string;
    position: number;
    tier: Tier;
    name: string;
    rerank?: Rerank;
  }>,
): Column {
  const sorted = [...all].sort((a, b) => a.position - b.position);
  const visible = sorted.filter((e) => e.tier !== 'disliked');
  return {
    id,
    label,
    icon: meta.icon,
    color: meta.color,
    totalCount: sorted.length,
    // Display position is a renumbering of the visible rows, not the raw
    // stored `position` — both ranked_entries and google_place_rankings scope
    // that column per category/door *including* disliked rows, so a hidden
    // disliked entry would otherwise leave a gap (#1, #2, #4). The design
    // handoff's own S31 rendering re-numbers from the filtered array's index
    // for exactly this reason.
    rows: visible.map((e, i) => ({
      key: e.id,
      pos: i + 1,
      name: e.name,
      tier: e.tier,
      rerank: e.rerank,
    })),
    hiddenCount: sorted.length - visible.length,
  };
}

/**
 * P13 §7: one column per door was the coarsest possible split once someone
 * has ranked more than a handful of real places — "categorize the places...
 * even divide the places based on... breakfast spots, bar and restaurant,
 * pub, or temples, concerts etc." Google's own `types` on each ranking
 * (subtypeFor, rankedSubtypes.ts) decide a finer bucket; a column exists
 * only once something in it has actually been ranked, so an area with
 * nothing but cafes ranked never shows five empty "Bars & pubs"-style
 * columns.
 */
function subtypeColumns(door: Door, entries: RankedGooglePlace[]): Column[] {
  const buckets = new Map<
    string,
    {
      label: string;
      icon: string;
      color: string;
      rows: Array<Parameters<typeof toColumn>[3][number]>;
    }
  >();
  for (const e of entries) {
    const subtype = subtypeFor(door, e.types);
    const bucketId = `door:${door}:${subtype.id}`;
    if (!buckets.has(bucketId)) {
      buckets.set(bucketId, {
        label: `${DOOR_LABEL[door]} · ${subtype.label}`,
        icon: subtype.icon,
        color: subtype.color,
        rows: [],
      });
    }
    buckets.get(bucketId)!.rows.push({
      id: e.id,
      position: e.position,
      tier: e.tier,
      name: e.placeName,
      rerank: {
        kind: 'google',
        googlePlaceId: e.googlePlaceId,
        name: e.placeName,
        door: e.door,
        types: e.types,
      },
    });
  }
  return [...buckets.entries()].map(([id, b]) => toColumn(id, b.label, b, b.rows));
}

// S31: disliked places drop out of the visible list but stay logged — they
// keep contributing to ranking without cluttering the list. Real divergence
// (design_handoff_madli/README.md's own S31 note): desktop is multi-column by
// category, mobile is one column with category tabs.
//
// P10 §6: a person's ranked list used to only ever show catalogue places
// (the 17 seeded fixtures) — anything ranked via the onboarding ask or the
// "I've been here" button on a real (Google-sourced) place's own page never
// appeared here at all, even though it was really saved. Google rankings are
// door-scoped rather than category-scoped (there is no finer catalogue
// category for an arbitrary real place), so they render as one extra column
// per door alongside the catalogue's per-category columns, not merged into
// them — both kinds are real, visible ranked lists; they just group at a
// different granularity, and both get the same card treatment below.
//
// P13 §7: the Google side is subtype-scoped now, not just door-scoped — see
// subtypeColumns above.
export function MyRankedListScreen() {
  const { breakpoint, userId, persona } = usePersona();
  const navigate = useNavigate();
  const { show } = useToast();
  const { data: entries = [] } = useAllRankedEntries(userId);
  const { data: googleEntries = [] } = useMyGoogleRankings(undefined, persona !== 'guest');
  const [hideVisited, setHideVisitedState] = useState(() => readHideVisited(userId));
  // P12 §9/P13 §6: "my ranked list ... should ask the user to rank the
  // place ... and follow up by comparing against the existing list." A
  // Google-sourced row's "Re-rank" reuses the exact ranking card the
  // post-visit nudge and "I've been here" button use; a catalogue row's
  // routes into the same pairwise mechanic S25-S27 already use, now that
  // fn_log_ranked_visit accepts re-ranking a place instead of refusing it
  // (20260904100000_rerank_catalogue_visit.sql) — either way it is the same
  // in-category comparison, never a hardcoded, unrelated place.
  const [reranking, setReranking] = useState<Extract<Rerank, { kind: 'google' }> | null>(null);

  const usedCategoryIds = [...new Set(entries.map((e) => e.categoryId))];
  const usedCategories = categories.filter((c) => usedCategoryIds.includes(c.id));

  const columns: Column[] = [
    ...usedCategories.map((c) =>
      toColumn(
        c.id,
        c.name,
        CATEGORY_META[c.name] ?? { icon: 'list-ordered', color: 'var(--teal-500)' },
        entries
          .filter((e) => e.categoryId === c.id)
          .map((e) => ({
            id: e.id,
            position: e.position,
            tier: e.tier,
            name: placeById(e.placeId)?.name ?? '',
            rerank: { kind: 'catalogue' as const, placeId: e.placeId },
          })),
      ),
    ),
    ...subtypeColumns(
      'eat',
      googleEntries.filter((e) => e.door === 'eat'),
    ),
    ...subtypeColumns(
      'explore',
      googleEntries.filter((e) => e.door === 'explore'),
    ),
  ].filter((c) => c.rows.length > 0 || c.hiddenCount > 0);

  const totalCount = columns.reduce((n, c) => n + c.totalCount, 0);

  const [selectedColumn, setSelectedColumn] = useState<string>();
  // Derived rather than synced via effect: both queries only resolve after
  // this component's first render, so a plain useState initializer would
  // capture "no columns yet" once and never update — falls back to the
  // first available column whenever the current selection isn't (or is no
  // longer) one of them.
  const activeColumnId =
    selectedColumn && columns.some((c) => c.id === selectedColumn)
      ? selectedColumn
      : columns[0]?.id;
  const activeColumn = columns.find((c) => c.id === activeColumnId);

  const toggleHideVisited = (next: boolean) => {
    setHideVisitedState(next);
    writeHideVisited(userId, next);
  };

  const startRerank = (rerank: Rerank) => {
    if (rerank.kind === 'google') {
      setReranking(rerank);
      return;
    }
    // Catalogue path: the real pairwise comparison screens (S25-S27),
    // exactly like "I've been here" everywhere else in the app — not the
    // old global button's hardcoded, unrelated fallback place.
    navigate('/log-visit', { state: { placeId: rerank.placeId } });
  };

  if (columns.length === 0) {
    return (
      <AppShell title="My ranked list">
        <EmptyState
          icon="list-ordered"
          title="Nothing ranked yet"
          body="Rank three places you have already been and the picks start bending toward what you actually like."
          action={
            <button
              // P13 §6: this used to also go to '/log-visit' with no place
              // named, hitting the same hardcoded-fallback bug the global
              // "Re-rank by comparing" button had. There is nothing ranked
              // yet to re-rank, so the honest destination is somewhere a
              // real place can actually be found and rated for the first
              // time.
              onClick={() => navigate('/search')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-link)',
                cursor: 'pointer',
              }}
            >
              Find a place to rank
            </button>
          }
        />
      </AppShell>
    );
  }

  const columnBody = (column: Column) => (
    <div
      key={column.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--white)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px var(--space-4)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon name={column.icon} size={17} color={column.color} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h3
            style={{
              margin: 0,
              font: 'var(--type-label)',
              color: 'var(--text-heading)',
            }}
          >
            {column.label}
          </h3>
          <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
            {column.totalCount} ranked
          </span>
        </div>
      </div>
      {column.rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-hairline)',
          }}
        >
          <span
            style={{
              font: 'var(--type-label)',
              color: 'var(--text-muted)',
              width: 30,
              flex: 'none',
            }}
          >
            #{row.pos}
          </span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-heading)' }}>
              {row.name}
            </span>
            <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
              {TIER_LABEL[row.tier as 'loved' | 'fine']}
            </span>
          </div>
          {row.rerank ? (
            <Button size="sm" variant="quiet" onClick={() => startRerank(row.rerank!)}>
              Re-rank
            </Button>
          ) : null}
        </div>
      ))}
      {column.hiddenCount > 0 ? (
        <div
          style={{
            padding: '10px var(--space-4)',
            font: 'var(--type-evidence)',
            color: 'var(--evidence-text)',
            background: 'var(--slate-50)',
          }}
        >
          {column.hiddenCount} disliked, hidden but still counted
        </div>
      ) : null}
    </div>
  );

  return (
    <AppShell title="My ranked list">
      <div
        style={{
          padding: 'var(--space-5) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, font: 'var(--type-h3)', color: 'var(--text-display)' }}>
              My ranked list
            </h1>
            <span style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
              {totalCount} {totalCount === 1 ? 'place' : 'places'} ranked · {LOCAL_STATUS_THRESHOLD}{' '}
              needed for full ranking weight
            </span>
          </div>
          {/* P13 §6: the old "Re-rank by comparing" button here named no
              place at all — it could not, a screen-level button has no one
              row in mind — so it fell back to an arbitrary fixed catalogue
              place every time. Re-ranking is a per-row action now (below,
              on every row), the same one comparison mechanic, run on the
              actual place someone taps. */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(buildShareText(columns)).catch(() => {});
              show('Ranked list copied — paste it anywhere.');
            }}
          >
            Share the list
          </Button>
        </div>

        <div
          style={{
            padding: '12px var(--space-4)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--white)',
          }}
        >
          <Switch
            label="Hide visited places elsewhere in the app"
            description="Only affects the you-haven't-been-here slot"
            checked={hideVisited}
            onChange={toggleHideVisited}
          />
        </div>

        {breakpoint === 'desktop' ? (
          <div
            className="madli-stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-5)',
              alignItems: 'start',
            }}
          >
            {columns.map(columnBody)}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <Tabs
                items={columns.map((c) => ({ value: c.id, label: c.label }))}
                value={activeColumnId}
                onChange={setSelectedColumn}
              />
            </div>
            {activeColumn ? columnBody(activeColumn) : null}
          </>
        )}
      </div>

      {reranking ? (
        <Dialog
          open
          title="Rank this place"
          variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
          onClose={() => setReranking(null)}
        >
          <RankGooglePlaceForm
            candidate={{
              placeId: reranking.googlePlaceId,
              name: reranking.name,
              door: reranking.door,
              types: reranking.types,
            }}
            onDone={() => setReranking(null)}
          />
        </Dialog>
      ) : null}
    </AppShell>
  );
}
