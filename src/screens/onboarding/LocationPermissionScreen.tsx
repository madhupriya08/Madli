import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { useSearch, type Door } from '../../lib/searchState';

interface LocationNavState {
  door?: Door;
  /** Where to go once an origin is set (or the person declines). */
  next?: string;
}

// S8: denied is not an error. It routes into S9 and every downstream screen
// stays fully functional with a typed area. Reason copy sits above the
// buttons, not in a tooltip.
export function LocationPermissionScreen() {
  const [denied, setDenied] = useState(false);
  const [asking, setAsking] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { search, setSearch } = useSearch();
  const navState = location.state as LocationNavState | null;
  const door = navState?.door ?? search.door;
  // Signup sends people here with the ranking step queued behind it; anyone
  // arriving without a destination in mind continues into intake.
  const next = navState?.next ?? '/intake';

  // No auto-skip here. This screen is now reached once, on the way out of
  // signup, rather than on every door click — so there is no Allow → /app →
  // Eat → here loop left to break. Redirecting from inside this screen also
  // made it permanently unreachable once an origin was stored: the origin
  // lives in sessionStorage, so a grant from an earlier visit in the same tab
  // meant the prompt could never be shown again, which reads as "location is
  // never asked". Landing here deliberately re-asks.

  const goToNext = (patch: Parameters<typeof setSearch>[0]) => {
    setSearch({ door, ...patch });
    navigate(next);
  };

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDenied(true);
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAsking(false);
        goToNext({
          center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          centerSource: 'geolocation',
        });
      },
      () => {
        setAsking(false);
        setDenied(true);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return (
    <AppShell title="Find places near you" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-9) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        <Icon name="map-pin" size={40} color="var(--teal-500)" />
        <h1 style={{ font: 'var(--type-h3)' }}>Share your location</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-body)', maxWidth: '38ch' }}>
          We use it to find picks near you and estimate drive times. You can also type your area
          instead — nothing here is required.
        </p>
        {denied ? (
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--status-warn-fg)' }}>
            Location access was denied. That&apos;s fine — type your area on the next screen
            instead.
          </p>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            width: '100%',
            maxWidth: 320,
          }}
        >
          <Button onClick={requestLocation} disabled={asking}>
            {asking ? 'Asking…' : 'Allow location'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/area', { state: { door, next } })}>
            Type my area instead
          </Button>
          <button
            onClick={() => navigate(next)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
              font: 'var(--type-body-sm)',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </AppShell>
  );
}
