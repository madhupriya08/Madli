import { useState } from 'react';
import { AdminShell } from '../layout/AdminShell';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { Input } from '../../components/forms/Input';
import { Dialog } from '../../components/feedback/Dialog';
import { useToast } from '../../components/feedback/ToastProvider';
import { useAdminOverrideRanking } from '../../data/hooks';
import { places } from '../../fixtures/places';
import { usePersona } from '../../dev/PersonaContext';

const ABUSE_QUEUE = [
  {
    name: 'user 7714',
    flag: 'Device cluster',
    detail: '9 accounts, same device, all rating one place first',
  },
  {
    name: 'user 3390',
    flag: 'Owner overlap',
    detail: 'Logged the business they claimed, 14 times',
  },
];

// S46: the control room. Four panels: why a place ranks, who contributed,
// the weight curve, and the abuse queue. Manual override is guarded — a
// written reason is required and the entry is permanent in the audit log.
export function RankingAndTrustScreen() {
  const { canOverrideRanking } = usePersona();
  const { show } = useToast();
  const override = useAdminOverrideRanking();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const place = places[0];

  return (
    <AdminShell title="Ranking and trust">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        <Card>
          <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-3)' }}>
            Why {place.name} ranks #1
          </h3>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            {place.locals.toLocaleString()} local ratings, gap {place.gapPoints} pts over #2.
          </p>
          {canOverrideRanking ? (
            <Button
              size="sm"
              variant="secondary"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => setConfirming(place.id)}
            >
              Override ranking
            </Button>
          ) : (
            <p
              style={{
                font: 'var(--type-caption)',
                color: 'var(--text-faint)',
                marginTop: 'var(--space-3)',
              }}
            >
              Your account does not have the ranking-override grant.
            </p>
          )}
        </Card>
        <Card>
          <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-3)' }}>
            Top contributors
          </h3>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Weight curve/thresholds are an open item from Phase 1 — not invented here.
          </p>
        </Card>
        <Card>
          <h3 style={{ font: 'var(--type-h4)', marginBottom: 'var(--space-3)' }}>Abuse queue</h3>
          {ABUSE_QUEUE.map((a) => (
            <div key={a.name} style={{ marginBottom: 'var(--space-2)' }}>
              <div style={{ font: 'var(--type-label)' }}>
                {a.name} · {a.flag}
              </div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                {a.detail}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Dialog open={!!confirming} title="Override ranking" onClose={() => setConfirming(null)}>
        <Input
          label="Reason (required, permanent)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Button
            disabled={!reason.trim()}
            onClick={async () => {
              try {
                await override.mutateAsync({
                  placeId: place.id,
                  gapTone: 'clear',
                  gapPoints: place.gapPoints,
                  reason,
                });
                show('Override logged.');
                setConfirming(null);
                setReason('');
              } catch (err) {
                show(err instanceof Error ? err.message : 'Failed.', { tone: 'error' });
              }
            }}
          >
            Confirm override
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </AdminShell>
  );
}
