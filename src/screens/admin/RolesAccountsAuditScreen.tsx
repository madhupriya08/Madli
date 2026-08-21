import { AdminShell } from '../layout/AdminShell';
import { Badge } from '../../components/core/Badge';
import { usePersona } from '../../dev/PersonaContext';
import { adminAccounts } from '../../fixtures/admin';
import { useAuditLog } from '../../data/hooks';

// S50: the audit log is marked read-only and stated as immutable — it sits
// below the account table because it's the proof, not the control.
// Permission rows spell out the two dangerous capabilities (ranking
// override, location history) per role. Real divergence: full table
// (desktop) vs. condensed list (mobile).
export function RolesAccountsAuditScreen() {
  const { breakpoint } = usePersona();
  const { data: auditLog = [] } = useAuditLog();

  return (
    <AdminShell title="Roles, accounts, audit log">
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
          Read-only. Immutable — no edit or delete path exists, for any role.
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
