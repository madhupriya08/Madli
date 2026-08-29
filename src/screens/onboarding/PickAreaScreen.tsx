import { useState } from 'react';
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
import { useSearch } from '../../lib/searchState';
import { areas, nearestArea, type Area } from '../../fixtures/areas';
import { fetchHomeAreaId, setHomeAreaId } from '../../data/homeArea';

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
 * nothing, so nothing downstream in this session runs without one of the
 * eight seeded neighbourhoods attached.
 *
 * The two ways to answer sit at equal weight, not primary-and-fallback:
 * the GPS button and the searchable list are both live from the first
 * paint. Geolocation fires ONLY from that button tap — never on mount — and
 * a denial is not an error: it just leaves you looking at the list that was
 * already there. The button visually softens after a decline rather than
 * showing an alert or a separate state.
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
    navigate(next);
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
      (pos) => {
        setAsking(false);
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = nearestArea(point);
        // The real device position stays as `center` — it is more accurate
        // for distance math than the neighbourhood centroid would be. The
        // neighbourhood name is what "resolving to the nearest seeded area"
        // actually means: which of the eight this search is scoped to.
        setSearch({
          areaText: nearest.name,
          areaPlaceId: null,
          center: point,
          centerSource: 'geolocation',
        });
        navigate(next);
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
      </div>
    </AppShell>
  );
}
