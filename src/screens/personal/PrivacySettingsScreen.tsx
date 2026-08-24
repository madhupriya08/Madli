import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Dialog } from '../../components/feedback/Dialog';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { Switch } from '../../components/forms/Switch';
import { usePersona } from '../../dev/PersonaContext';
import { useDeleteOwnAccount } from '../../data/hooks';

const CONFIRM_PHRASE = 'DELETE';

// S36: delete is guarded by a typed confirmation and states exactly what is
// lost, including that rankings recalculate without you. Location history is
// listed here as a user right — S51 is the same data from the other side,
// and that read is logged.
export function PrivacySettingsScreen() {
  const navigate = useNavigate();
  const { signOut } = usePersona();
  const deleteAccount = useDeleteOwnAccount();
  const [showConfirm, setShowConfirm] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [shareLocationHistory, setShareLocationHistory] = useState(true);

  const canDelete = typedPhrase === CONFIRM_PHRASE;

  return (
    <AppShell title="Privacy" onBack={() => navigate(-1)} showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        <Switch
          label="Location history"
          description="What Madli has recorded from your searches and logged visits — this is your data, viewable here"
          checked={shareLocationHistory}
          onChange={setShareLocationHistory}
        />
        <div>
          <h3
            style={{
              font: 'var(--type-h4)',
              color: 'var(--status-error-fg)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Delete account
          </h3>
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-3)',
            }}
          >
            This deletes your ranked list, bookmarks, and plans permanently. Rankings recalculate
            without you — this cannot be undone.
          </p>
          <Button variant="secondary" onClick={() => setShowConfirm(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      <Dialog
        open={showConfirm}
        title="Type DELETE to confirm"
        onClose={() => setShowConfirm(false)}
      >
        <p
          style={{
            font: 'var(--type-body-sm)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          This permanently deletes your ranked list, bookmarks, and plans. Rankings recalculate
          without you.
        </p>
        <Input
          label={`Type "${CONFIRM_PHRASE}" to confirm`}
          value={typedPhrase}
          onChange={(e) => setTypedPhrase(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
          <Button
            variant="accent"
            disabled={!canDelete}
            onClick={async () => {
              await deleteAccount.mutateAsync();
              await signOut();
              navigate('/landing');
            }}
          >
            Delete permanently
          </Button>
          <Button variant="ghost" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </AppShell>
  );
}
