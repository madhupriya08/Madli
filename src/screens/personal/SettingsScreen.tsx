import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';

// S33: "Claim a business" (S34) was removed on explicit request — Madli has
// no owner-onboarding path any more (see registry.ts). Sign out is a ghost
// button at the bottom.
export function SettingsScreen() {
  const navigate = useNavigate();
  const { signOut } = usePersona();

  return (
    <AppShell title="Settings">
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <Button variant="secondary" onClick={() => navigate('/settings/notifications')}>
          Notifications
        </Button>
        <Button variant="secondary" onClick={() => navigate('/settings/privacy')}>
          Privacy
        </Button>
        <button
          onClick={() => {
            void signOut();
            navigate('/');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            marginTop: 'var(--space-6)',
            textAlign: 'left',
          }}
        >
          Sign out
        </button>
      </div>
    </AppShell>
  );
}
