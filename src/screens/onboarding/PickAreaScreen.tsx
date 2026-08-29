import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { SearchField } from '../../components/forms/SearchField';
import { Switch } from '../../components/forms/Switch';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { DEFAULT_CENTER, haversineMeters, useSearch } from '../../lib/searchState';
import { areas, nearestArea, type Area } from '../../fixtures/areas';
import { fetchHomeAreaId, setHomeAreaId } from '../../data/homeArea';
import { hasMapsApiKey } from '../../lib/googleMaps';
import {
  reverseGeocodeArea,
  resolveAreaCenter,
  suggestAreas,
  type AreaSuggestion,
} from '../../lib/placesSearch';

/**
 * How far a GPS reading can be from the nearest seeded neighbourhood and
 * still be treated as it — roughly the seeded eight's own spread plus a
 * margin, not a hard administrative boundary. Madli is not restricted to one
 * city: a reading from anywhere else in the world should get its own real
 * name (via reverse geocoding) rather than being mislabelled as whichever of
 * the eight happens to be least-far away.
 */
const SEEDED_AREA_RADIUS_METERS = 30_000;

interface AreaNavState {
  /** Where to continue once an area is chosen. Defaults to Home. */
  next?: string;
}

/**
 * S8, merged: what used to be two screens run back-to-back — an OS
 * permission prompt that fired cold on mount, with a typed-area screen
 * (S9) sitting behind it only as the fallback for a denial.
 *
 * That shape is gone. Location is Madli's primary filter — every ranking,
 * gap, and sample size is scoped to an area — so this is one required step
 * between the auth choice and Home, not an interruption sitting after a door
 * tap. There is no skip: an unscoped search returns rankings that mean
 * nothing, so nothing downstream in this session runs without a real area
 * attached.
 *
 * The two ways to answer sit at equal weight, not primary-and-fallback:
 * the GPS button and the searchable list are both live from the first
 * paint. Geolocation fires ONLY from that button tap — never on mount — and
 * a denial is not an error: it just leaves you looking at the list that was
 * already there. The button visually softens after a decline rather than
 * showing an alert or a separate state.
 *
 * Not restricted to Hyderabad. The eight seeded neighbourhoods are the ones
 * with real ranking depth, so they stay the quick picks, but typing anything
 * else runs a live Google Places search (`suggestAreas`/`resolveAreaCenter`
 * — built for the old S9 typed-area screen, unused since that screen was
 * merged away, revived here) so a real area anywhere in the world resolves
 * to a real centre. GPS mirrors this: a reading near the eight snaps to the
 * nearest one as before, but a reading far from all of them (someone
 * actually elsewhere) is reverse-geocoded to its own real name instead of
 * being mislabelled as whichever Hyderabad neighbourhood is least-far away.
 *
 * "Set as my home area" is the one guest/user difference. It writes to
 * `profiles.home_area_id`, real persistence a signed-in person carries into
 * their next visit; guests have no profile row to hold it, so they re-pick
 * every time — the switch is simply absent for them, not disabled.
 */
export function PickAreaScreen() {
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [locationDeclined, setLocationDeclined] = useState(false);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [homeOverride, setHomeOverride] = useState<string | null | undefined>(undefined);
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { show } = useToast();
  const { persona, userId } = usePersona();
  const { setSearch } = useSearch();
  const next = (routerLocation.state as AreaNavState | null)?.next ?? '/app';

  const homeAreaQuery = useQuery({
    queryKey: ['home-area-id', userId],
    queryFn: () => fetchHomeAreaId(userId),
    enabled: persona !== 'guest' && !!userId,
    retry: false,
  });
  // Reflects Supabase directly, not a synced copy: the query result until a
  // toggle actually succeeds, then whatever that toggle just wrote. Nothing
  // here is optimistic ahead of a real write landing.
  const currentHomeAreaId = homeOverride !== undefined ? homeOverride : (homeAreaQuery.data ?? null);

  const filtered = areas.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  // Live search for anywhere the seeded eight don't cover — debounced so
  // typing doesn't fire a Google call per keystroke. `hasMapsApiKey()` gates
  // the whole thing off cleanly when Maps isn't configured, same as every
  // other live-search surface in this app.
  useEffect(() => {
    if (!hasMapsApiKey() || query.trim().length < 2) {
      // Deriving local UI state from `query` becoming too short to search —
      // not a side effect on an external system, so this is the accepted
      // exception rather than something to route through an event handler.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestLoading(true);
    const timer = setTimeout(() => {
      suggestAreas(query, DEFAULT_CENTER)
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .catch(() => {
          // No key, network blip, API not enabled — the seeded list above is
          // still fully usable, so this just quietly offers nothing extra.
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSuggestLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const chooseArea = (area: Area) => {
    // The seeded neighbourhoods now carry real centroids, so a manual pick
    // gets a real center too — not just text. Leaving center unset here is
    // the exact bug this screen replaces: results silently re-centring on
    // Hyderabad's default point instead of the area someone just chose.
    setSearch({
      areaText: area.name,
      areaPlaceId: null,
      center: { lat: area.lat, lng: area.lng },
      centerSource: 'area',
    });
    // Through the local/visitor ask rather than straight to `next` — that
    // question runs once, right after settling on an area, for every path
    // that reaches this screen.
    navigate('/local-or-visitor', { state: { next } });
  };

  const chooseLiveSuggestion = async (suggestion: AreaSuggestion) => {
    setResolvingPlaceId(suggestion.placeId);
    try {
      const center = await resolveAreaCenter(suggestion.placeId);
      setSearch({
        areaText: suggestion.label,
        areaPlaceId: suggestion.placeId,
        center,
        centerSource: 'area',
      });
      navigate('/local-or-visitor', { state: { next } });
    } catch (err) {
      setResolvingPlaceId(null);
      show(err instanceof Error ? err.message : 'Could not look up that place.');
    }
  };

  const toggleHome = async (area: Area, on: boolean) => {
    const value = on ? area.id : null;
    try {
      await setHomeAreaId(userId, value);
      setHomeOverride(value);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save your home area.');
    }
  };

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationDeclined(true);
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = nearestArea(point);
        const distanceToNearest = haversineMeters(point, { lat: nearest.lat, lng: nearest.lng });

        if (distanceToNearest <= SEEDED_AREA_RADIUS_METERS) {
          // Close enough to one of the eight — the real device position
          // stays as `center` (more accurate for distance math than the
          // neighbourhood centroid), and the neighbourhood name is what
          // "resolving to the nearest seeded area" actually means.
          setSearch({
            areaText: nearest.name,
            areaPlaceId: null,
            center: point,
            centerSource: 'geolocation',
          });
          setAsking(false);
          navigate('/local-or-visitor', { state: { next } });
          return;
        }

        // Nowhere near the seeded eight — actually somewhere else. Reverse
        // geocode for a real name rather than force-fitting it into
        // whichever of the eight happens to be least-far away. Raced against
        // a timeout: a stalled network call must not leave the person stuck
        // on "Finding you…" forever.
        let areaText = 'Your current location';
        try {
          const label = await Promise.race([
            reverseGeocodeArea(point),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
          ]);
          if (label) areaText = label;
        } catch {
          // No maps key, network blip, geocoding disabled — still proceed
          // with a generic label rather than blocking the flow entirely.
        }
        setSearch({ areaText, areaPlaceId: null, center: point, centerSource: 'geolocation' });
        setAsking(false);
        navigate('/local-or-visitor', { state: { next } });
      },
      () => {
        // Not an error path. Stay on this screen — the list below is already
        // the fallback, so there is nothing else to route to or explain.
        setAsking(false);
        setLocationDeclined(true);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return (
    <AppShell title="Pick your area" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
          Every ranking Madli shows is scoped to a neighbourhood. Use your location, or pick one
          below — either way takes you straight in.
        </p>

        <Button
          variant={locationDeclined ? 'ghost' : 'secondary'}
          block
          onClick={requestLocation}
          disabled={asking}
          iconLeft={<Icon name="navigation" size={18} />}
        >
          {asking ? 'Finding you…' : 'Use my current location'}
        </Button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a neighbourhood"
            onClear={() => setQuery('')}
          />

          {filtered.length === 0 ? (
            query.trim() && hasMapsApiKey() ? (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                None of our eight home-turf neighbourhoods match that — search below for any other
                place.
              </p>
            ) : (
              <EmptyState
                icon="map-pin-off"
                title="Nothing matches that"
                body="We have real ranking depth in eight neighbourhoods so far. Try one of those, or search for wherever you are."
              />
            )
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
                    onClick={() => chooseArea(a)}
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
                      checked={currentHomeAreaId === a.id}
                      onChange={(v) => void toggleHome(a, v)}
                      label="Home"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasMapsApiKey() && query.trim().length >= 2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h4 style={{ font: 'var(--type-label)', color: 'var(--text-muted)' }}>
              Or search any other location
            </h4>
            {suggestLoading ? (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Searching…</p>
            ) : suggestions.length === 0 ? (
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                Nothing found yet — keep typing.
              </p>
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
                {suggestions.map((s) => (
                  <li key={s.placeId}>
                    <button
                      onClick={() => void chooseLiveSuggestion(s)}
                      disabled={resolvingPlaceId === s.placeId}
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
                      {resolvingPlaceId === s.placeId ? 'Finding it…' : s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
