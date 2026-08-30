import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { SearchField } from '../../components/forms/SearchField';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { searchPlacesByName } from '../../fixtures/places';

// S52: what the bottom-nav Search tab opens — not part of the linear intake
// flow. The escape hatch at the bottom goes to guided intake, so the two
// entry paths are reversible in both directions. Guest state removes the
// recent list entirely and says why, instead of showing an empty container.
//
// Phase 6 §2 fix: submitting used to ignore the typed text outright and
// navigate to whatever generic filtered results were already in search
// state — so a query for a real, seeded place name returned unrelated
// results (or nothing, on a fresh session with no filters set at all). A
// real name search against the catalogue now drives submit directly.
export function SearchEntryScreen() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const navigate = useNavigate();
  const { persona } = usePersona();

  const matches = submittedQuery ? searchPlacesByName(submittedQuery) : [];

  return (
    <AppShell title="Search">
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <SearchField
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSubmittedQuery(null);
          }}
          onSubmit={() => setSubmittedQuery(query)}
          onClear={() => {
            setQuery('');
            setSubmittedQuery(null);
          }}
          size="lg"
        />

        {submittedQuery ? (
          matches.length > 0 ? (
            <div>
              <h2
                style={{
                  font: 'var(--type-eyebrow)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </h2>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                {matches.map((place) => (
                  <li key={place.id}>
                    <button
                      onClick={() => navigate(`/places/${encodeURIComponent(place.slug)}`)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-4)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        font: 'var(--type-body)',
                        color: 'var(--text-heading)',
                      }}
                    >
                      {place.name} · {place.neighborhood}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon="search-x"
              title="No matches"
              body={`Nothing in the catalogue matched "${submittedQuery}". Try a shorter word or a different spelling.`}
            />
          )
        ) : persona === 'guest' ? (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Recent searches are saved once you have an account — sign up to keep a history here.
          </p>
        ) : (
          <div>
            <h2
              style={{
                font: 'var(--type-eyebrow)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Recent
            </h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>
              Jubilee Hills · Biryani and kebab
            </p>
          </div>
        )}

        <Button variant="secondary" onClick={() => navigate('/intake')}>
          Or answer three quick questions
        </Button>
      </div>
    </AppShell>
  );
}
