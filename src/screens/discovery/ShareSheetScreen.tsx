import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';

export interface SharePlaceState {
  name: string;
  /** Path under origin, including ?shared=1 when applicable. */
  path: string;
  photoUrl?: string;
}

// S22: the recipient preview is shown inline so you can see exactly what
// lands in WhatsApp before sending. "No account needed, never expires" is the
// promise that makes sharing the cheapest acquisition path — stated as copy,
// not decoration.
export function ShareSheetScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { breakpoint } = usePersona();
  const { show } = useToast();
  const shared = (location.state as SharePlaceState | null) ?? null;
  const name = shared?.name?.trim() || 'This place';
  const path =
    shared?.path ||
    `${window.location.pathname}${window.location.search.includes('shared=1') ? '' : '?shared=1'}`;
  const shareUrl = `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;

  return (
    <Dialog
      open
      title="Share this pick"
      onClose={() => navigate(-1)}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <Card elevation="xs" style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-cream)',
              flex: '0 0 auto',
              overflow: 'hidden',
              backgroundImage: shared?.photoUrl ? `url(${shared.photoUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div>
            <div style={{ font: 'var(--type-label)' }}>
              {name} · Madli
            </div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              3 picks. 1 reason. 2 minutes.
            </div>
          </div>
        </Card>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          No account needed, never expires.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            iconLeft={<Icon name="share-2" size={17} color="currentColor" />}
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).catch(() => {});
              show('Link copied.');
            }}
          >
            Copy link
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
