import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { SearchField } from '../../components/forms/SearchField';
import { Switch } from '../../components/forms/Switch';
import { EmptyState } from '../../components/feedback/EmptyState';
import { areas } from '../../fixtures/areas';
import { usePersona } from '../../dev/PersonaContext';
import { useSearch, DEFAULT_CENTER } from '../../lib/searchState';
import { suggestAreas, resolveAreaCenter, type AreaSuggestion } from '../../lib/placesSearch';
import { hasMapsApiKey } from '../../lib/googleMaps';

// S9: the area list filters live as you type against the eight seeded
// neighbourhoods; Alwal is deliberately below ranking threshold so the
// thin-coverage path is reachable. Set-as-home is User only — guests have no
// persistence, so the toggle is absent rather than disabled.
export function ManualAreaScreen() {
  const [query, setQuery] = useState('');
  const [homeArea, setHomeArea] = useState<string | null>(null);
  const navigate = useNavigate();
  const { persona } = usePersona();
  const { setSearch } = useSearch();
  const filtered = areas.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  // Google autocomplete sits *alongside* the seeded neighbourhoods rather
  // than replacing them: the eight Madli areas are the ones with real ranking
  // depth, so they stay the primary list. Autocomplete is how someone reaches
  // an area Madli has not seeded yet, and it is purely additive — if the
  // Places API is unavailable the screen degrades to exactly what it was.
  // Stored with the query they belong to, so the visible list is derived
  // during render: a query that is too short, or one whose results have not
  // arrived yet, simply shows nothing without an effect clearing state.
  const [fetched, setFetched] = useState<{ query: string; items: AreaSuggestion[] }>({
    query: '',
    items: [],
  });
  const trimmed = query.trim();
  const suggestions = fetched.query === trimmed ? fetched.items : [];

  useEffect(() => {
    if (!hasMapsApiKey() || trimmed.length < 2) return;
    let cancelled = false;
    // Debounced: autocomplete is billed per keystroke session, and firing on
    // every character is both slow and wasteful.
    const t = setTimeout(() => {
      suggestAreas(trimmed, DEFAULT_CENTER)
        .then((items) => {
          if (!cancelled) setFetched({ query: trimmed, items });
        })
        .catch(() => {
          // Places unavailable — the seeded neighbourhood list above still
          // works, so this degrades to the pre-Google behaviour.
          if (!cancelled) setFetched({ query: trimmed, items: [] });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed]);

  const chooseSeededArea = (name: string) => {
    setSearch({ areaText: name, areaPlaceId: null, centerSource: 'area' });
    navigate(name === 'Alwal' ? '/neighbourhoods/Alwal' : '/results/eat');
  };

  const chooseSuggestion = async (s: AreaSuggestion) => {
    setSearch({ areaText: s.label, areaPlaceId: s.placeId });
    try {
      const center = await resolveAreaCenter(s.placeId);
      setSearch({ center, centerSource: 'area' });
    } catch {
      // Keep the typed area even if coordinates could not be resolved — the
      // text still narrows the search, it just cannot centre the map.
    }
    navigate('/results/eat');
  };

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
                  onClick={() => chooseSeededArea(a.name)}
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

        {suggestions.length > 0 ? (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4
              style={{
                font: 'var(--type-eyebrow)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Other places
            </h4>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    onClick={() => void chooseSuggestion(s)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                      font: 'var(--type-body)',
                      color: 'var(--text-heading)',
                    }}
                  >
                    {s.label}
                    <span
                      style={{
                        display: 'block',
                        font: 'var(--type-evidence)',
                        color: 'var(--evidence-text)',
                      }}
                    >
                      Not ranked by Madli yet
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
