import { useState } from 'react';
import { AdminShell } from '../layout/AdminShell';
import { Badge } from '../../components/core/Badge';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { Input } from '../../components/forms/Input';
import { Select } from '../../components/forms/Select';
import { Switch } from '../../components/forms/Switch';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { useAuditLog, useAdminAccounts, useCreateAdminAccount } from '../../data/hooks';
import type { AdminTier } from '../../fixtures/admin';

// Phase 4 §5: real admin-accounts listing via fn_admin_list_accounts (a
// SECURITY DEFINER function joining auth.users.email with profiles,
// admin-gated) — replaces Phase 2/3's fixture data. See
// PHASE_4_QA_REPORT.md §5 for the design decision and live verification.

// S50: the audit log is marked read-only and stated as immutable — it sits
// below the account table because it's the proof, not the control.
// Permission rows spell out the two dangerous capabilities (ranking
// override, location history) per role. Real divergence: full table
// (desktop) vs. condensed list (mobile).

const TIER_OPTIONS: { value: AdminTier; label: string }[] = [
  { value: 'moderation', label: 'Moderation' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'superadmin', label: 'Superadmin' },
];

/**
 * Phase 7 §7: "add a feature to add another admin". Only rendered for a
 * superadmin session — fn_admin_create_admin_account enforces the same
 * restriction server-side, so a non-superadmin admin never sees a form that
 * would just come back as a real 403.
 */
function CreateAdminAccountForm() {
  const { show } = useToast();
  const { mutateAsync, isPending } = useCreateAdminAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminTier, setAdminTier] = useState<AdminTier>('moderation');
  const [canOverrideRanking, setCanOverrideRanking] = useState(false);
  const [canAccessLocationHistory, setCanAccessLocationHistory] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (reason.trim().length === 0) {
      setError('A written reason is required. It goes in the audit log.');
      return;
    }
    setError(null);
    try {
      await mutateAsync({
        email,
        password,
        displayName: displayName.trim() || undefined,
        adminTier,
        canOverrideRanking,
        canAccessLocationHistory,
        reason,
      });
      show(`Admin account created for ${email}.`, { tone: 'success' });
      setEmail('');
      setPassword('');
      setDisplayName('');
      setAdminTier('moderation');
      setCanOverrideRanking(false);
      setCanAccessLocationHistory(false);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <Card elevation="xs" style={{ marginBottom: 'var(--space-7)' }}>
      <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-1)' }}>
        Create another admin
      </h3>
      <p
        style={{
          font: 'var(--type-caption)',
          color: 'var(--text-faint)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Creates a brand-new account and grants it admin access directly. The
        person does not sign up themselves. Recorded in the audit log below.
      </p>
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 420 }}
      >
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
        <Input
          label="Temporary password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters. Share it with them out of band."
          autoComplete="new-password"
        />
        <Input
          label="Name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="off"
        />
        <Select
          label="Admin tier"
          value={adminTier}
          onChange={(e) => setAdminTier(e.target.value as AdminTier)}
          options={TIER_OPTIONS}
        />
        <Switch
          label="Can override ranking"
          checked={canOverrideRanking}
          onChange={setCanOverrideRanking}
        />
        <Switch
          label="Can access location history"
          checked={canAccessLocationHistory}
          onChange={setCanAccessLocationHistory}
        />
        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why this account, at this tier?"
          error={error && error.toLowerCase().includes('reason') ? error : undefined}
        />
        {error && !error.toLowerCase().includes('reason') ? (
          <span role="alert" style={{ font: 'var(--type-caption)', color: 'var(--status-error-fg)' }}>
            {error}
          </span>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create admin account'}
        </Button>
      </form>
    </Card>
  );
}

export function RolesAccountsAuditScreen() {
  const { breakpoint, adminTier } = usePersona();
  const { data: auditLog = [] } = useAuditLog();
  const { data: adminAccounts = [] } = useAdminAccounts();

  return (
    <AdminShell title="Roles, accounts, audit log">
      {adminTier === 'superadmin' ? <CreateAdminAccountForm /> : null}

      <section style={{ marginBottom: 'var(--space-7)' }}>
        <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-3)' }}>Admin accounts</h3>
        {breakpoint === 'desktop' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>Email</th>
                <th>Tier</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {adminAccounts.map((a) => (
                <tr key={a.email} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <td style={{ padding: '8px' }}>{a.email}</td>
                  <td>{a.tier}</td>
                  <td>{a.lastActive}</td>
                  <td>
                    <Badge tone={a.status === 'Active' ? 'success' : 'warn'}>{a.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {adminAccounts.map((a) => (
              <div
                key={a.email}
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--surface-card)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>{a.email}</div>
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  {a.tier} · {a.lastActive}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-2)' }}>Audit log</h3>
        <p
          style={{
            font: 'var(--type-caption)',
            color: 'var(--text-faint)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Read-only. Immutable: no edit or delete path exists, for any role.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {auditLog.map((a) => (
            <div key={a.id} style={{ font: 'var(--type-body-sm)' }}>
              <span style={{ color: 'var(--text-faint)' }}>{a.when}</span> ·{' '}
              <strong>{a.who}</strong> {a.what}
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
