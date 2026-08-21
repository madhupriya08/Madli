import { AdminShell } from '../layout/AdminShell';
import { Card } from '../../components/core/Card';
import { useGemCandidates } from '../../data/hooks';

// S47: gap score is local rank minus outside fame. Cafe Bahar scores highest
// but has only 61 ratings — the queue shows both so the trade-off is
// visible. Ranking history per candidate (place_rank_snapshots) stops a
// one-week spike becoming a gem — not modeled at length in this mock pass.
export function GemSelectionScreen() {
  const { data: candidates = [] } = useGemCandidates();
  const sorted = [...candidates].sort((a, b) => b.gemScore - a.gemScore);

  return (
    <AdminShell title="Gem selection">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {sorted.map((c) => (
          <Card
            key={c.placeId}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div>
              <div style={{ font: 'var(--type-label)' }}>{c.name}</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                #{c.localRank} local vs. #{c.outsideFameRank} outside · {c.locals.toLocaleString()}{' '}
                locals
              </div>
            </div>
            <div style={{ font: 'var(--type-h4)', color: 'var(--coral-500)' }}>{c.gemScore}</div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
