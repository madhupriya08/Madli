import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';

// S28: the consequence of dismissing is printed. Hiding it would convert
// slightly better and be dishonest. Highest-intent gate in the product — the
// person has already done the work.
export function SaveYourListGateScreen() {
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  return (
    <Dialog
      open
      title="Save your list?"
      onClose={() => navigate('/')}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
        You just ranked a place. Without an account, this list disappears when you close the app —
        nothing is saved anywhere.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Button onClick={() => navigate('/signup')}>Sign up to keep it</Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          No thanks, I understand it&apos;ll be lost
        </Button>
      </div>
    </Dialog>
  );
}
