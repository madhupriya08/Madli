import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { SearchField } from '../../components/forms/SearchField';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { searchPlacesByName, placeByGooglePlaceId } from '../../fixtures/places';
import { searchPlacesByQuery, type GoogleCandidate } from '../../lib/placesSearch';
import { hasMapsApiKey } from '../../lib/googleMaps';
import { Tag } from '../../components/core/Tag';
import { Icon } from '../../components/core/Icon';
import { listRecentSearches } from '../../lib/recentSearches';
import { CUISINE_OPTIONS, useSearch, type SearchState } from '../../lib/searchState';

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
//
// Phase 8 §5: catalogue-only meant a search for any real place outside the
// 17 seeded ones came back "No matches" — this now also searches live
// Google Places, unrestricted by door (a name search should find a place
// whether it's an Eat or Explore door pick, or neither). Catalogue matches
// still surface first and instantly (no network round trip, and they carry
// real ranking/reason data a bare Google result doesn't) — Google results
// that resolve back to one of those catalogue entries are de-duplicated
// rather than shown twice.
export function SearchEntryScreen() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const navigate = useNavigate();
  const { persona, userId } = usePersona();
  const { search, setSearch, effectiveCenter } = useSearch();

  // P12 §5: a typed search is a filter, not just a lookup. Applying one
  // writes it into the same search state the results screens read, so the
  // picks that come back are the ones matching the craving, the cuisine or
  // the place name — and the query leaves as an editable chip alongside
  // every other applied filter.
  const applyAsFilter = (text: string, extra: Partial<SearchState> = {}) => {
    const door = extra.door ?? search.door;
    setSearch({ queryText: text.trim(), ...extra });
    navigate(door === 'explore' ? '/results/explore' : '/results/eat');
  };

  // A typed word that is literally one of the cuisine filters ("south
  // indian", "bakery") is offered as that real structured filter, not only
  // as free text — the filter narrows the search properly where free text
  // only nudges Google's relevance.
  const matchedCuisine = (() => {
    const q = (submittedQuery ?? query).trim().toLowerCase();
    if (q.length < 3) return null;
    return (
      CUISINE_OPTIONS.find(
        (c) => c.toLowerCase() === q || c.toLowerCase().includes(q) || q.includes(c.toLowerCase()),
      ) ?? null
    );
  })();

  // P12 §7: the real last-five, not the hardcoded "Jubilee Hills · Biryani
  // and kebab" line that used to sit here pretending to be history.
  const recentSearches = listRecentSearches(userId);

  const localMatches = submittedQuery ? searchPlacesByName(submittedQuery) : [];
  const localGooglePlaceIds = new Set(
    localMatches.map((p) => p.googlePlaceId).filter((id): id is string => id !== null),
  );

  const googleSearch = useQuery({
    queryKey: ['placeSearch', submittedQuery, effectiveCenter.lat, effectiveCenter.lng],
    queryFn: () => searchPlacesByQuery(submittedQuery!, effectiveCenter),
    enabled: Boolean(submittedQuery) && hasMapsApiKey(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const googleMatches = (googleSearch.data ?? []).filter(
    (c) => !localGooglePlaceIds.has(c.placeId),
  );

  const totalMatches = localMatches.length + googleMatches.length;
  const stillSearching = Boolean(submittedQuery) && googleSearch.isLoading;

  function openCandidate(candidate: GoogleCandidate) {
    const catalogue = placeByGooglePlaceId(candidate.placeId);
    navigate(`/places/${encodeURIComponent(catalogue ? catalogue.slug : candidate.placeId)}`);
  }

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

        {query.trim() ? (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Button onClick={() => applyAsFilter(submittedQuery ?? query)}>
              Show matching places
            </Button>
            {matchedCuisine ? (
              <Tag
                onClick={() =>
                  applyAsFilter(matchedCuisine, { cuisine: matchedCuisine, door: 'eat' })
                }
              >
                Filter by {matchedCuisine}
              </Tag>
            ) : null}
          </div>
        ) : null}

        {submittedQuery ? (
          totalMatches > 0 ? (
            <div>
              <h2
                style={{
                  font: 'var(--type-eyebrow)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {totalMatches} {totalMatches === 1 ? 'match' : 'matches'}
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
                {localMatches.map((place) => (
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
                {googleMatches.map((candidate) => (
                  <li key={candidate.placeId}>
                    <button
                      onClick={() => openCandidate(candidate)}
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
                      {candidate.name}
                      {candidate.address ? ` · ${candidate.address}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : stillSearching ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Searching…</p>
          ) : (
            <EmptyState
              icon="search-x"
              title="No matches"
              body={`Nothing found for "${submittedQuery}". Try a shorter word or a different spelling.`}
              action={
                <Button variant="secondary" onClick={() => applyAsFilter(submittedQuery)}>
                  Search the picks for it instead
                </Button>
              }
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
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-eyebrow)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Your last{' '}
              {recentSearches.length === 1 ? 'search' : `${recentSearches.length} searches`}
            </h2>
            {recentSearches.length === 0 ? (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                Nothing yet — the last five searches you run will show up here.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                {recentSearches.map((recent) => (
                  <li key={recent.id}>
                    <button
                      onClick={() => {
                        setSearch(recent.snapshot);
                        navigate(
                          recent.snapshot.door === 'explore' ? '/results/explore' : '/results/eat',
                        );
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
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
                      <Icon name="clock" size={16} color="var(--text-muted)" />
                      <span style={{ flex: 1 }}>{recent.label}</span>
                      <Icon name="chevron-right" size={16} color="var(--text-muted)" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Button variant="secondary" onClick={() => navigate('/intake')}>
          Or answer three quick questions
        </Button>
      </div>
    </AppShell>
  );
}
