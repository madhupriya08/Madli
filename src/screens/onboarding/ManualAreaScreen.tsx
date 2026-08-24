import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { SearchField } from '../../components/forms/SearchField';
import { Switch } from '../../components/forms/Switch';
import { EmptyState } from '../../components/feedback/EmptyState';
import { areas } from '../../fixtures/areas';
import { usePersona } from '../../dev/PersonaContext';

// S9: the area list filters live as you type against the eight seeded
// neighbourhoods; Alwal is deliberately below ranking threshold so the
// thin-coverage path is reachable. Set-as-home is User only — guests have no
// persistence, so the toggle is absent rather than disabled.
export function ManualAreaScreen() {
  const [query, setQuery] = useState('');
  const [homeArea, setHomeArea] = useState<string | null>(null);
  const navigate = useNavigate();
  const { persona } = usePersona();
  const filtered = areas.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell title="Choose your area" onBack={() => navigate(-1)} showTabBar={false}>
      <div style={{ padding: 'var(--space-6) var(--gutter)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a neighbourhood"
            onClear={() => setQuery('')}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="map-pin-off"
            title="Nothing matches that"
            body="We rank eight Hyderabad neighbourhoods so far. Try one of those, or ask us to add yours."
          />
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            {filtered.map((a) => (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <button
                  onClick={() =>
                    navigate(a.name === 'Alwal' ? '/neighbourhoods/Alwal' : '/results/eat')
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  <div style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>
                    {a.name}
                  </div>
                  <div style={{ font: 'var(--type-evidence)', color: 'var(--evidence-text)' }}>
                    {a.coverageDepthLabel}
                  </div>
                </button>
                {persona !== 'guest' ? (
                  <Switch
                    checked={homeArea === a.id}
                    onChange={(v) => setHomeArea(v ? a.id : null)}
                    label="Home"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
