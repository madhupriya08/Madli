import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Button } from '../../components/core/Button';

// S10: not an error screen. A real number is given for why the city isn't
// ready, plus two exits. Notify-me promises exactly one message.
export function OutOfCoverageScreen() {
  const navigate = useNavigate();
  return (
    <AppShell title="Not in Hyderabad yet" onBack={() => navigate(-1)} showTabBar={false}>
      <EmptyState
        icon="map-pin-off"
        title="Madli only covers Hyderabad right now"
        body="We rank places with real local ratings, and we only have that depth of data for one city so far."
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
            <Button onClick={() => navigate('/area')}>Browse Hyderabad anyway</Button>
            <Button variant="secondary" onClick={() => navigate('/landing')}>
              Notify me when my city is ready
            </Button>
          </div>
        }
      />
    </AppShell>
  );
}
