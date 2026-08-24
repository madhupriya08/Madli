import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { Card } from '../../components/core/Card';
import { usePersona } from '../../dev/PersonaContext';

// S33: "Claim a business" is the primary owner-onboarding path and gets the
// one inverted block on the page. Sign out is a ghost button at the bottom.
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
        <Card style={{ background: 'var(--surface-inverse)', color: 'var(--text-on-dark)' }}>
          <h3 style={{ font: 'var(--type-h4)', marginBottom: 4 }}>Claim a business</h3>
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: 'var(--text-on-dark-muted)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Own a place on Madli? Claim it to edit your hours, contact info, and photos.
          </p>
          <Button variant="inverse" onClick={() => navigate('/settings/claim')}>
            Claim a business
          </Button>
        </Card>
        <button
          onClick={() => {
            void signOut();
            navigate('/landing');
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
