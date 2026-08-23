import { AdminShell } from '../layout/AdminShell';
import { Card } from '../../components/core/Card';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';
import { useBusinessClaims, useReports, useRankedEntriesCount } from '../../data/hooks';

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
  'None-of-these rate',
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

  const values: Record<string, string> = {
    'Total places': String(places.length),
    'Active users (30d)': '—',
    'Ranked visits logged': rankedEntriesCount === undefined ? '…' : String(rankedEntriesCount),
    'Guest → signup rate': '—',
    'Avg. search-to-pick time': '—',
    'Claims pending': String(allClaims.filter((c) => c.status === 'pending').length),
    'Reports open': String(allReports.filter((r) => r.status === 'open').length),
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
