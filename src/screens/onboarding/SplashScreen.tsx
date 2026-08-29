import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/core/Logo';
import { Button } from '../../components/core/Button';

// S6: all three auth choices are weighted the same on purpose — continuing
// as guest must not feel penalised, so none of the three is coral or smaller
// than the others. Desktop gets no splash (the same content renders as the
// landing page's top block) — this route is mobile-primary.
//
// Every path from here now lands on S8 (`/area`) before Home: location is
// scoped per-neighbourhood for every ranking Madli shows, so it belongs in
// this setup moment rather than being asked later, mid-search.
export function SplashScreen() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-9)',
        padding: 'var(--gutter)',
        textAlign: 'center',
      }}
    >
      <Logo variant="full" height={64} />
      <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)', maxWidth: '32ch' }}>
        3 picks. 1 reason. 2 minutes.
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          width: '100%',
          maxWidth: 320,
        }}
      >
        <Button size="lg" block variant="secondary" onClick={() => navigate('/signup')}>
          Sign up free
        </Button>
        <Button size="lg" block variant="secondary" onClick={() => navigate('/login')}>
          Log in
        </Button>
        <Button size="lg" block variant="secondary" onClick={() => navigate('/area')}>
          Look around as a guest
        </Button>
      </div>
    </div>
  );
}
