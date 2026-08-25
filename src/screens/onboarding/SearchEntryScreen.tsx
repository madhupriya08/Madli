import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { SearchField } from '../../components/forms/SearchField';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { useSearch } from '../../lib/searchState';

// S52: what the bottom-nav Search tab opens — not part of the linear intake
// flow. The escape hatch at the bottom goes to guided intake, so the two
// entry paths are reversible in both directions. Guest state removes the
// recent list entirely and says why, instead of showing an empty container.
export function SearchEntryScreen() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { persona } = usePersona();
  const { search } = useSearch();
  const resultsPath = search.door === 'explore' ? '/results/explore' : '/results/eat';

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
          onChange={(e) => setQuery(e.target.value)}
          onSubmit={() => navigate(resultsPath)}
          onClear={() => setQuery('')}
          size="lg"
        />

        {persona === 'guest' ? (
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
