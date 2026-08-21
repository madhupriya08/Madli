import { AdminShell } from '../layout/AdminShell';
import { Card } from '../../components/core/Card';
import { usePersona } from '../../dev/PersonaContext';
import { places } from '../../fixtures/places';
import { mockDb } from '../../fixtures/mockDb';

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

  const values: Record<string, string> = {
    'Total places': String(places.length),
    'Active users (30d)': '—',
    'Ranked visits logged': String(mockDb.rankedEntries.length),
    'Guest → signup rate': '—',
    'Avg. search-to-pick time': '—',
    'Claims pending': String(mockDb.businessClaims.filter((c) => c.status === 'pending').length),
    'Reports open': String(mockDb.reports.filter((r) => r.status === 'open').length),
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
