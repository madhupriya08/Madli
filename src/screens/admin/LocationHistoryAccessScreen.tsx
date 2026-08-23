import { useState } from 'react';
import { AdminShell } from '../layout/AdminShell';
import { Select } from '../../components/forms/Select';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/core/Button';
import { Badge } from '../../components/core/Badge';
import { useAdminReadLocationHistory } from '../../data/hooks';
import { locationHistoryReasonOptions } from '../../fixtures/admin';
import { MOCK_USER_ID, usePersona } from '../../dev/PersonaContext';
import type { LocationHistoryRow } from '../../data/admin';

// S51: the gate is the design. A reason is required, written verbatim, and
// the log entry is created before the data loads. Once granted, a persistent
// coral banner states that this read is itself logged — it does not
// disappear on scroll. Coral is used here and nowhere else on this screen.
export function LocationHistoryAccessScreen() {
  const { canAccessLocationHistory } = usePersona();
  const readHistory = useAdminReadLocationHistory();
  const [reasonCategory, setReasonCategory] = useState<string>(
    locationHistoryReasonOptions[0].value,
  );
  const [reasonDetail, setReasonDetail] = useState('');
  const [rows, setRows] = useState<LocationHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grant = async () => {
    if (!reasonDetail.trim()) {
      setError('A reason is required to access location history.');
      return;
    }
    try {
      const reason = `${reasonCategory}: ${reasonDetail}`;
      const data = await readHistory.mutateAsync({
        targetUserId: MOCK_USER_ID,
        reason,
      });
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not authorized.');
    }
  };

  if (!canAccessLocationHistory) {
    return (
      <AdminShell title="Location history access">
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          Your account does not have the location-history-access grant.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Location history access">
      {!rows ? (
        <div
          style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Select
            label="Reason category"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
            options={[...locationHistoryReasonOptions]}
          />
          <Input
            label="Reason detail (stored verbatim)"
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            error={error ?? undefined}
          />
          <Button onClick={grant}>Grant access and load</Button>
        </div>
      ) : (
        <div>
          <div
            style={{
              background: 'var(--coral-50)',
              color: 'var(--coral-600)',
              border: '1px solid var(--coral-200)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-5)',
              font: 'var(--type-body-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Badge tone="coral">Logged</Badge>
            This read of user {MOCK_USER_ID}&apos;s location history is itself logged, permanently.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>When</th>
                <th>Area</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <td style={{ padding: '8px' }}>{r.when}</td>
                  <td>{r.area}</td>
                  <td>{r.actionLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
