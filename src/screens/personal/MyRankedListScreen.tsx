import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { RankBadge } from '../../components/trust/RankBadge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { useVisibleRankedEntries } from '../../data/hooks';
import { useMyGoogleRankings } from '../../data/googleRankings';
import { categories } from '../../fixtures/categories';
import { placeById } from '../../fixtures/places';
import type { Door } from '../../lib/searchState';

const DOOR_COLUMN_LABEL: Record<Door, string> = {
  eat: 'Eat — nearby places',
  explore: 'Explore — nearby places',
};

interface Column {
  id: string;
  label: string;
  rows: Array<{ key: string; position: number; name: string }>;
}

// S31: disliked places drop out of the visible list but stay logged — they
// keep contributing to ranking without cluttering the list. Real divergence:
// desktop is multi-column by category, mobile is one column with category tabs.
//
// P10 §6: a person's ranked list used to only ever show catalogue places
// (the 17 seeded fixtures) — anything ranked via the onboarding ask or the
// "I've been here" button on a real (Google-sourced) place's own page never
// appeared here at all, even though it was really saved. Google rankings are
// door-scoped rather than category-scoped (there is no finer catalogue
// category for an arbitrary real place), so they render as one extra column
// per door alongside the catalogue's per-category columns, not merged into
// them — both kinds are real, visible ranked lists; they just group at a
// different granularity.
export function MyRankedListScreen() {
  const { breakpoint, userId, persona } = usePersona();
  const navigate = useNavigate();
  const { data: entries = [] } = useVisibleRankedEntries(userId);
  const { data: googleEntries = [] } = useMyGoogleRankings(undefined, persona !== 'guest');
  const usedCategoryIds = [...new Set(entries.map((e) => e.categoryId))];
  const usedCategories = categories.filter((c) => usedCategoryIds.includes(c.id));

  const columns: Column[] = [
    ...usedCategories.map((c) => ({
      id: c.id,
      label: c.name,
      rows: entries
        .filter((e) => e.categoryId === c.id)
        .map((e) => ({ key: e.id, position: e.position, name: placeById(e.placeId)?.name ?? '' })),
    })),
    ...(['eat', 'explore'] as const)
      .map((door) => ({
        id: `door:${door}`,
        label: DOOR_COLUMN_LABEL[door],
        rows: googleEntries
          .filter((e) => e.door === door)
          .map((e) => ({ key: e.id, position: e.position, name: e.placeName })),
      }))
      .filter((c) => c.rows.length > 0),
  ];

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

  if (columns.length === 0) {
    return (
      <AppShell title="My ranked list">
        <EmptyState
          icon="list-ordered"
          title="Nothing ranked yet"
          body="Log a visit to a place and it'll show up here, ordered against everything else you've ranked."
          action={
            <button
              onClick={() => navigate('/log-visit')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-link)',
                cursor: 'pointer',
              }}
            >
              Log a visit
            </button>
          }
        />
      </AppShell>
    );
  }

  const columnBody = (column: Column) => (
    <div key={column.id}>
      <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-3)' }}>{column.label}</h3>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {column.rows.map((row) => (
          <li key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <RankBadge rank={Math.min(row.position, 3) as 1 | 2 | 3} size="sm" />
            <span style={{ font: 'var(--type-body)' }}>{row.name}</span>
            <span
              style={{
                font: 'var(--type-caption)',
                color: 'var(--text-faint)',
                marginLeft: 'auto',
              }}
            >
              #{row.position}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <AppShell title="My ranked list">
      <div style={{ padding: 'var(--space-5) var(--gutter)' }}>
        {breakpoint === 'desktop' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              gap: 'var(--space-7)',
            }}
          >
            {columns.map(columnBody)}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 'var(--space-5)', overflowX: 'auto' }}>
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
    </AppShell>
  );
}
