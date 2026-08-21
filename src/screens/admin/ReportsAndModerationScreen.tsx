import { useState } from 'react';
import { AdminShell } from '../layout/AdminShell';
import { Tabs } from '../../components/navigation/Tabs';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { useToast } from '../../components/feedback/ToastProvider';
import { useReports } from '../../data/hooks';
import { adminResolveReport } from '../../data/admin';
import { placeById } from '../../fixtures/places';
import { useQueryClient } from '@tanstack/react-query';

// S49: two queues in one table, separated by filter. Bulk resolve exists
// because duplicate reports arrive in clusters — not modeled at length here.
export function ReportsAndModerationScreen() {
  const [filter, setFilter] = useState<'all' | 'duplicate_listing' | 'other'>('all');
  const { data: reports = [] } = useReports();
  const { show } = useToast();
  const qc = useQueryClient();

  const filtered = reports.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'duplicate_listing') return r.type === 'duplicate_listing';
    return r.type !== 'duplicate_listing';
  });

  return (
    <AdminShell title="Reports and moderation">
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Tabs
          items={[
            { value: 'all', label: 'All' },
            { value: 'duplicate_listing', label: 'Duplicate listings' },
            { value: 'other', label: 'Other content' },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
        />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '8px' }}>Report</th>
            <th>Place</th>
            <th>Reported by</th>
            <th>Age</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid var(--border-hairline)' }}>
              <td style={{ padding: '8px' }}>{r.label}</td>
              <td>{placeById(r.placeId)?.name}</td>
              <td>{r.reportedBy}</td>
              <td>{r.ageLabel}</td>
              <td>
                <Badge tone={r.status === 'open' ? 'warn' : 'success'}>{r.status}</Badge>
              </td>
              <td>
                {r.status === 'open' ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await adminResolveReport(r.id, 'resolved', 'Handled by admin');
                      void qc.invalidateQueries({ queryKey: ['reports'] });
                      show('Report resolved.');
                    }}
                  >
                    Resolve
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
