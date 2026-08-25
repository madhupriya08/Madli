import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';

// S30: re-engagement, not a review request. Three answers, and only Yes
// costs the person anything. Yes routes into S25, so the nudge and the
// mechanic are the same loop.
export function PostVisitNudgeScreen() {
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const place = places.find((p) => p.isActive)!;

  return (
    <Dialog
      open
      title={`Did you make it to ${place.name}?`}
      onClose={() => navigate('/app')}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Button onClick={() => navigate('/log-visit', { state: { placeId: place.id } })}>
          Yes, log it
        </Button>
        <Button variant="secondary" onClick={() => navigate('/app')}>
          Not yet
        </Button>
        <Button variant="ghost" onClick={() => navigate('/app')}>
          Didn&apos;t go
        </Button>
      </div>
    </Dialog>
  );
}
