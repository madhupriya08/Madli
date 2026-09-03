import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Button } from '../../components/core/Button';

// S10: not an error screen, and not a single-city gate — Madli opens to
// wherever someone searches (see LandingPage's own note on this), it just
// takes real local ranking activity before an area's picks are worth much.
// A real reason is given for that, plus two exits. Not currently reachable
// from anywhere in the app (nothing navigates here), but kept correct in
// case that changes.
export function OutOfCoverageScreen() {
  const navigate = useNavigate();
  return (
    <AppShell title="Not enough local data yet" onBack={() => navigate(-1)} showTabBar={false}>
      <EmptyState
        icon="map-pin-off"
        title="We don't have local rankings here yet"
        body="Madli ranks places with real local ratings, and that takes real people ranking nearby first. Try another area, or be one of the first to rank here."
        action={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              width: '100%',
              maxWidth: 280,
              marginTop: 'var(--space-4)',
            }}
          >
            <Button onClick={() => navigate('/area')}>Search another area</Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Rank places here anyway
            </Button>
          </div>
        }
      />
    </AppShell>
  );
}
