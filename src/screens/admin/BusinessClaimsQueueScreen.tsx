import { AdminShell } from '../layout/AdminShell';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { useToast } from '../../components/feedback/ToastProvider';
import { useBusinessClaims } from '../../data/hooks';
import { adminMarkClaimCalled, adminResolveClaim } from '../../data/businessClaims';
import { placeById } from '../../fixtures/places';
import { useQueryClient } from '@tanstack/react-query';

// S48: the other side of S37/S38. The Maps link and phone number are on the
// row because they're what the reviewer acts on. Mark-as-called is separate
// from approve — the phone call is a recorded step, not an assumption.
export function BusinessClaimsQueueScreen() {
  const { data: claims = [] } = useBusinessClaims();
  const { show } = useToast();
  const qc = useQueryClient();

  const refresh = () => void qc.invalidateQueries({ queryKey: ['businessClaims'] });

  return (
    <AdminShell title="Business claims">
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '8px' }}>Business</th>
            <th>Contact</th>
            <th>Maps link</th>
            <th>Status</th>
            <th>Called</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => {
            const place = placeById(c.placeId);
            return (
              <tr key={c.id} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '8px' }}>{place?.name ?? c.businessName}</td>
                <td>{c.contactPhone}</td>
                <td>
                  <a href={c.mapsLink} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                </td>
                <td>
                  <Badge
                    tone={
                      c.status === 'verified'
                        ? 'success'
                        : c.status === 'rejected'
                          ? 'warn'
                          : 'neutral'
                    }
                  >
                    {c.status}
                  </Badge>
                </td>
                <td>{c.calledAt ? 'Yes' : 'No'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {!c.calledAt ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await adminMarkClaimCalled(c.id);
                        refresh();
                        show('Marked as called.');
                      }}
                    >
                      Mark called
                    </Button>
                  ) : null}
                  {c.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await adminResolveClaim(c.id, 'verified');
                          refresh();
                          show('Claim approved.');
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await adminResolveClaim(c.id, 'rejected');
                          refresh();
                          show('Claim rejected.');
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminShell>
  );
}
