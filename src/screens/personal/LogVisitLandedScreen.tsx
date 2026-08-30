import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { RankBadge } from '../../components/trust/RankBadge';
import { Button } from '../../components/core/Button';
import { usePersona } from '../../dev/PersonaContext';

interface LandedState {
  landedPosition: number;
  totalInCategory: number;
  placeName: string;
}

// S27: the payoff is the position, so the list is the screen. Guest sees the
// same screen; the gate fires on exit, after the work is done, not before.
export function LogVisitLandedScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { persona } = usePersona();
  const state = location.state as LandedState | null;

  // Phase 4 §9: navigate() moved into an effect, not called during render —
  // calling it directly during render is a real React anti-pattern that can
  // leave the whole tree unmounted with no ErrorBoundary to catch it
  // (PHASE_4_QA_REPORT.md §9).
  useEffect(() => {
    if (!state) navigate('/app');
  }, [state, navigate]);

  if (!state) return null;

  return (
    <AppShell title="Added to your list" showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-9) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        <RankBadge rank={Math.min(state.landedPosition, 3) as 1 | 2 | 3} size="lg" />
        <h1 style={{ font: 'var(--type-h2)' }}>
          {state.placeName} landed at #{state.landedPosition}
        </h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          out of {state.totalInCategory} places you&apos;ve ranked in this category.
        </p>
        {persona === 'guest' ? (
          <Button onClick={() => navigate('/save-your-list')}>Save this to your list</Button>
        ) : (
          <Button onClick={() => navigate('/my-list')}>See my ranked list</Button>
        )}
      </div>
    </AppShell>
  );
}
