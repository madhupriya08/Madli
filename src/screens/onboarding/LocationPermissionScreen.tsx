import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';

// S8: denied is not an error. It routes into S9 and every downstream screen
// stays fully functional with a typed area. Reason copy sits above the
// buttons, not in a tooltip.
export function LocationPermissionScreen() {
  const [denied, setDenied] = useState(false);
  const navigate = useNavigate();

  return (
    <AppShell title="Find places near you" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-9) var(--gutter-mobile)',
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
          <Button
            onClick={() => {
              // Simulate a browser permission prompt outcome.
              setDenied(true);
            }}
          >
            Allow location
          </Button>
          <Button variant="secondary" onClick={() => navigate('/area')}>
            Type my area instead
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
