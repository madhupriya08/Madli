import { useState } from 'react';
import { AdminShell } from '../layout/AdminShell';
import { Button } from '../../components/core/Button';
import { Badge } from '../../components/core/Badge';

type Stage = 'upload' | 'preview' | 'summary';

// S45: three explicit steps with a stepper. The error report is per-row with
// the reason. Failed rows never block the successful ones.
export function BulkImportScreen() {
  const [stage, setStage] = useState<Stage>('upload');
  const rows = [
    { row: 2, name: 'Paradise Biryani', status: 'ok' as const },
    { row: 3, name: '', status: 'error' as const, reason: 'Missing name' },
    { row: 4, name: 'Cafe Niloufer', status: 'ok' as const },
  ];

  return (
    <AdminShell title="Bulk import">
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {(['upload', 'preview', 'summary'] as Stage[]).map((s, i) => (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              font: 'var(--type-caption)',
              color: stage === s ? 'var(--teal-600)' : 'var(--text-faint)',
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: stage === s ? 'var(--teal-500)' : 'var(--surface-sunken)',
                color: stage === s ? 'var(--white)' : 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i + 1}
            </span>
            {s}
          </div>
        ))}
      </div>

      {stage === 'upload' ? (
        <div>
          <p
            style={{
              font: 'var(--type-body-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Upload a CSV of places to add in bulk.
          </p>
          <Button onClick={() => setStage('preview')}>Choose file (mock)</Button>
        </div>
      ) : null}

      {stage === 'preview' ? (
        <div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              font: 'var(--type-body-sm)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th>Row</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.row} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <td>{r.row}</td>
                  <td>{r.name || '—'}</td>
                  <td>
                    <Badge tone={r.status === 'ok' ? 'success' : 'warn'}>
                      {r.status === 'ok' ? 'Valid' : r.reason}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button onClick={() => setStage('summary')}>Import valid rows</Button>
        </div>
      ) : null}

      {stage === 'summary' ? (
        <div>
          <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-3)' }}>
            2 places added, 1 row failed.
          </p>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              cursor: 'pointer',
            }}
          >
            Download error report
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
