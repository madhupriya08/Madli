import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { SearchField } from '../../components/forms/SearchField';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { DEFAULT_CENTER, useSearch } from '../../lib/searchState';
import { useHomeArea } from '../../data/homeArea';
import { hasMapsApiKey } from '../../lib/googleMaps';
import { setResidentStatus } from '../../data/googleRankings';
import {
  reverseGeocodeArea,
  resolveAreaCenter,
  suggestAreas,
  type AreaSuggestion,
} from '../../lib/placesSearch';

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
 * P14: this used to offer a fixed quick-pick list of eight demo
 * neighbourhoods alongside live search — a leftover of the original seeded
 * catalogue, not something that generalises to a real product covering
 * anywhere in the world. Live search (`suggestAreas`/`resolveAreaCenter`)
 * and GPS (reverse-geocoded via `reverseGeocodeArea`) are now the only two
 * ways in, both live from the first paint, neither privileged over the
 * other. "Set as home" lives on Home now (see that screen's own doc
 * comment) — this screen only reads it, to power the one-tap "Home"
 * shortcut and to skip the local/visitor ask when the area picked here
 * already is the marked home.
 */
export function PickAreaScreen() {
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [locationDeclined, setLocationDeclined] = useState(false);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [goingHome, setGoingHome] = useState(false);
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { show } = useToast();
  const { persona } = usePersona();
  const { setSearch } = useSearch();
  const next = (routerLocation.state as AreaNavState | null)?.next ?? '/app';

  const { areaText: currentHomeAreaText } = useHomeArea();

  // Live search for anywhere in the world — debounced so typing doesn't fire
  // a Google call per keystroke. `hasMapsApiKey()` gates the whole thing off
  // cleanly when Maps isn't configured, same as every other live-search
  // surface in this app.
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
          // No key, network blip, API not enabled — quietly offer nothing.
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

  // P13 §4: choosing the area you already marked as home answers "do you
  // live here" by definition — asking it again right after is redundant.
  // `setResidentStatus` runs in the background rather than being awaited:
  // this is an inferred answer, not something the person consciously
  // stopped to confirm, so a slow network must not visibly hold up getting
  // to `next`. A failure here just means the ask was not skippable after
  // all; it is not worth interrupting navigation over.
  const proceedAfterArea = (isHome: boolean, areaText: string) => {
    if (isHome && persona !== 'guest') {
      setResidentStatus('local', areaText).catch(() => {
        show('Could not save that you live here. You can still answer it from your profile.');
      });
      navigate(next);
      return;
    }
    // Through the local/visitor ask rather than straight to `next` — that
    // question runs once, right after settling on an area, for every path
    // that reaches this screen.
    navigate('/local-or-visitor', { state: { next } });
  };

  const chooseLiveSuggestion = async (suggestion: AreaSuggestion) => {
    setResolvingPlaceId(suggestion.placeId);
    try {
      const { center, countryCode } = await resolveAreaCenter(suggestion.placeId);
      setSearch({
        areaText: suggestion.label,
        areaPlaceId: suggestion.placeId,
        countryCode,
        center,
        centerSource: 'area',
      });
      proceedAfterArea(currentHomeAreaText === suggestion.label, suggestion.label);
    } catch (err) {
      setResolvingPlaceId(null);
      show(err instanceof Error ? err.message : 'Could not look up that place.');
    }
  };

  // P13 §3: "if he wants to check out places near his home, there is no
  // point making him search for it again" — a one-tap shortcut back to
  // whichever area is marked home, the same weight as "Use my current
  // location". Absent entirely when nothing is marked home yet, or for a
  // Guest (who has no home area to jump to in the first place).
  const goHome = async () => {
    if (!currentHomeAreaText) return;
    setGoingHome(true);
    try {
      const matches = await suggestAreas(currentHomeAreaText, DEFAULT_CENTER);
      const match = matches.find((m) => m.label === currentHomeAreaText) ?? matches[0];
      if (!match) throw new Error(`Could not find "${currentHomeAreaText}" any more.`);
      const { center, countryCode } = await resolveAreaCenter(match.placeId);
      setSearch({
        areaText: currentHomeAreaText,
        areaPlaceId: match.placeId,
        countryCode,
        center,
        centerSource: 'area',
      });
      proceedAfterArea(true, currentHomeAreaText);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not look up your home area.');
    } finally {
      setGoingHome(false);
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
        // Reverse geocode for a real name (and country) — raced against a
        // timeout so a stalled network call can't leave the person stuck on
        // "Finding you…" forever.
        let areaText = 'Your current location';
        let countryCode: string | null = null;
        try {
          const resolved = await Promise.race([
            reverseGeocodeArea(point),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
          ]);
          if (resolved?.label) areaText = resolved.label;
          if (resolved?.countryCode) countryCode = resolved.countryCode;
        } catch {
          // No maps key, network blip, geocoding disabled — still proceed
          // with a generic label rather than blocking the flow entirely.
        }
        setSearch({
          areaText,
          areaPlaceId: null,
          countryCode,
          center: point,
          centerSource: 'geolocation',
        });
        setAsking(false);
        proceedAfterArea(currentHomeAreaText === areaText, areaText);
      },
      () => {
        // Not an error path. Stay on this screen — the search box is
        // already the fallback, so there is nothing else to route to.
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
          Every ranking Madli shows is scoped to a neighbourhood, anywhere in the world. Use your
          location, or search for one below.
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

        {currentHomeAreaText ? (
          <Button
            variant="secondary"
            block
            onClick={() => void goHome()}
            disabled={goingHome}
            iconLeft={<Icon name="home" size={18} />}
          >
            {goingHome ? 'Finding your home area…' : `Home · ${currentHomeAreaText}`}
          </Button>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a neighbourhood, city, or landmark"
            onClear={() => setQuery('')}
          />

          {!hasMapsApiKey() ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Live area search is not configured, so there is nothing to search here yet.
            </p>
          ) : query.trim().length < 2 ? null : suggestLoading ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Searching…</p>
          ) : suggestions.length === 0 ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Nothing found yet. Keep typing.
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
                <li
                  key={s.placeId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <button
                    onClick={() => void chooseLiveSuggestion(s)}
                    disabled={resolvingPlaceId === s.placeId}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      font: 'var(--type-body)',
                      color: 'var(--text-heading)',
                    }}
                  >
                    {resolvingPlaceId === s.placeId ? 'Finding it…' : s.label}
                  </button>
                  {currentHomeAreaText === s.label ? <Badge tone="teal">Home</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
