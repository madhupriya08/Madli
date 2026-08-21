import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Tabs } from '../../components/navigation/Tabs';
import { RankBadge } from '../../components/trust/RankBadge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { useVisibleRankedEntries } from '../../data/hooks';
import { categories } from '../../fixtures/categories';
import { placeById } from '../../fixtures/places';

// S31: disliked places drop out of the visible list but stay logged — they
// keep contributing to ranking without cluttering the list. Real divergence:
// desktop is multi-column by category, mobile is one column with category tabs.
export function MyRankedListScreen() {
  const { breakpoint, userId } = usePersona();
  const navigate = useNavigate();
  const { data: entries = [] } = useVisibleRankedEntries(userId);
  const usedCategoryIds = [...new Set(entries.map((e) => e.categoryId))];
  const usedCategories = categories.filter((c) => usedCategoryIds.includes(c.id));
  const [selectedCategory, setSelectedCategory] = useState<string>();
  // Derived rather than synced via effect: `entries` only resolves after this
  // component's first render (it's behind a TanStack Query call), so a plain
  // useState(usedCategories[0]?.id) initializer would capture "no categories
  // yet" once and never update — falls back to the first used category
  // whenever the current selection isn't (or is no longer) one of them.
  const activeCategory =
    selectedCategory && usedCategoryIds.includes(selectedCategory)
      ? selectedCategory
      : usedCategories[0]?.id;

  if (entries.length === 0) {
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

  const columnFor = (categoryId: string) => (
    <div key={categoryId}>
      <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-3)' }}>
        {categories.find((c) => c.id === categoryId)?.name}
      </h3>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {entries
          .filter((e) => e.categoryId === categoryId)
          .map((e) => {
            const place = placeById(e.placeId);
            return (
              <li
                key={e.id}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
              >
                <RankBadge rank={Math.min(e.position, 3) as 1 | 2 | 3} size="sm" />
                <span style={{ font: 'var(--type-body)' }}>{place?.name}</span>
                <span
                  style={{
                    font: 'var(--type-caption)',
                    color: 'var(--text-faint)',
                    marginLeft: 'auto',
                  }}
                >
                  #{e.position}
                </span>
              </li>
            );
          })}
      </ol>
    </div>
  );

  return (
    <AppShell title="My ranked list">
      <div style={{ padding: 'var(--space-5) var(--gutter-mobile)' }}>
        {breakpoint === 'desktop' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${usedCategories.length}, 1fr)`,
              gap: 'var(--space-7)',
            }}
          >
            {usedCategories.map((c) => columnFor(c.id))}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 'var(--space-5)', overflowX: 'auto' }}>
              <Tabs
                items={usedCategories.map((c) => ({ value: c.id, label: c.name }))}
                value={activeCategory}
                onChange={setSelectedCategory}
              />
            </div>
            {activeCategory ? columnFor(activeCategory) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
