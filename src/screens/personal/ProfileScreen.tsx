import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';
import { useVisibleRankedEntries } from '../../data/hooks';

const LOCAL_STATUS_THRESHOLD = 25;

// S32: local status is tied to ranking depth, not time served or a badge
// scheme. Progress toward 25 is shown because the weight curve behind it is
// real (Phase 1 flagged the exact curve as unresolved — this is a count, not
// the weighting formula itself).
export function ProfileScreen() {
  const navigate = useNavigate();
  const { userId } = usePersona();
  const { data: entries = [] } = useVisibleRankedEntries(userId);
  const progress = Math.min(entries.length, LOCAL_STATUS_THRESHOLD);

  return (
    <AppShell title="Profile">
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <Card>
          <h2 style={{ font: 'var(--type-h4)', marginBottom: 4 }}>Local status</h2>
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-3)',
            }}
          >
            {progress} of {LOCAL_STATUS_THRESHOLD} places ranked
          </p>
          <div
            style={{
              height: 6,
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <div
              style={{
                width: `${(progress / LOCAL_STATUS_THRESHOLD) * 100}%`,
                height: '100%',
                background: 'var(--teal-500)',
                borderRadius: 'var(--radius-pill)',
              }}
            />
          </div>
        </Card>
        <Button variant="secondary" onClick={() => navigate('/my-list')}>
          My ranked list
        </Button>
        <Button variant="secondary" onClick={() => navigate('/bookmarks')}>
          Bookmarks
        </Button>
        <Button variant="secondary" onClick={() => navigate('/settings')}>
          Settings
        </Button>
      </div>
    </AppShell>
  );
}
