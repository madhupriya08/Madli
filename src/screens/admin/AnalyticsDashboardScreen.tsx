import { AdminShell } from '../layout/AdminShell';
import { Card } from '../../components/core/Card';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';
import {
  useBusinessClaims,
  useReports,
  useRankedEntriesCount,
  useActiveUserCount,
  usePlanStats,
  useFunnelStats,
  useGemCandidates,
  useAuditLog,
} from '../../data/hooks';

// S42: dense desktop, top-5-KPI mobile (real divergence). Loading is
// skeleton charts — a blank dashboard reads as broken (not modeled at
// length here; the KPI tiles below stand in for the fuller chart set).
const METRICS_DESKTOP = [
  'Total places',
  'Active users (30d)',
  'Ranked visits logged',
  'Guest → signup rate',
  'Avg. search-to-pick time',
  'Picks shown',
  'Two-more rate',
  'Shares sent',
  'Plans saved',
  'Claims pending',
  'Reports open',
  'Comparison-1 abandonment',
  'Comparison-2 abandonment',
  'Gem candidates',
  'Admin actions (24h)',
];

/** '—' rather than 0%/NaN% when there is no data yet — a real absence, not a real zero. */
function ratePercent(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatSeconds(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Plain helper, not a component/hook — keeps the Date.now() read out of the render body. */
function countWithinWindow(rows: { when: string }[], windowMs: number): number {
  const now = Date.now();
  return rows.filter((r) => now - new Date(r.when).getTime() <= windowMs).length;
}

export function AnalyticsDashboardScreen() {
  const { breakpoint } = usePersona();
  const topFive = METRICS_DESKTOP.slice(0, 5);
  const shown = breakpoint === 'desktop' ? METRICS_DESKTOP : topFive;

  // Real counts (Phase 4 §6 — this screen was still reading Phase 2's mock
  // store; see fn_admin_count_ranked_entries's migration for why
  // ranked-visits specifically needed a new admin-gated function while
  // claims/reports didn't: business_claims/reports RLS already lets an
  // admin see every row, ranked_entries' RLS is strictly owner-only).
  const { data: rankedEntriesCount } = useRankedEntriesCount();
  const { data: allClaims = [] } = useBusinessClaims();
  const { data: allReports = [] } = useReports();
  // Phase 7 §2/§5: the rest of this dashboard used to be a wall of '—'
  // placeholders — see PHASE_7 notes / the admin_analytics_metrics
  // migration for exactly which of these needed a brand-new first-party
  // events table (analytics_events) versus data that already existed but
  // was unreadable by an admin session (plans, auth.users.last_sign_in_at).
  const { data: activeUsers } = useActiveUserCount(30);
  const { data: planStats } = usePlanStats();
  const { data: funnel } = useFunnelStats(30);
  const { data: gemCandidates } = useGemCandidates();
  const { data: auditLog = [] } = useAuditLog();

  // Only active places count as "the catalogue" — the one inactive fixture
  // (Deccan Grill House) exists purely as an admin-mock example row and was
  // being counted as a real listing here, inflating this by one.
  const activePlaceCount = places.filter((p) => p.isActive).length;

  const adminActionsLast24h = countWithinWindow(auditLog, TWENTY_FOUR_HOURS_MS);

  const values: Record<string, string> = {
    'Total places': String(activePlaceCount),
    'Active users (30d)': activeUsers === undefined ? '…' : String(activeUsers),
    'Ranked visits logged': rankedEntriesCount === undefined ? '…' : String(rankedEntriesCount),
    'Guest → signup rate': funnel
      ? ratePercent(funnel.signupsCompleted, funnel.sessionsStarted)
      : '…',
    'Avg. search-to-pick time': funnel ? formatSeconds(funnel.avgSearchToPickSeconds) : '…',
    'Picks shown': funnel ? String(funnel.totalPicksShown) : '…',
    'Two-more rate': funnel
      ? ratePercent(funnel.showTwoMoreClicks, funnel.resultsShownEvents)
      : '…',
    'Shares sent': planStats ? String(planStats.sharedPlans) : '…',
    'Plans saved': planStats ? String(planStats.totalPlans) : '…',
    'Claims pending': String(allClaims.filter((c) => c.status === 'pending').length),
    'Reports open': String(allReports.filter((r) => r.status === 'open').length),
    'Comparison-1 abandonment': funnel
      ? ratePercent(funnel.comparison1Started - funnel.comparison1Completed, funnel.comparison1Started)
      : '…',
    'Comparison-2 abandonment': funnel
      ? ratePercent(funnel.comparison2Started - funnel.comparison2Completed, funnel.comparison2Started)
      : '…',
    'Gem candidates': gemCandidates === undefined ? '…' : String(gemCandidates.length),
    'Admin actions (24h)': String(adminActionsLast24h),
  };

  return (
    <AdminShell title="Analytics">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
          gap: 'var(--space-4)',
        }}
      >
        {shown.map((m) => (
          <Card key={m} elevation="xs">
            <div
              style={{ font: 'var(--type-evidence)', color: 'var(--text-muted)', marginBottom: 4 }}
            >
              {m}
            </div>
            <div style={{ font: 'var(--type-h3)' }}>{values[m] ?? '—'}</div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
