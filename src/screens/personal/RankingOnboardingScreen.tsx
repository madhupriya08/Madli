import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { places } from '../../fixtures/places';

// S29: runs straight after signup so personalisation has something to work
// with from the first search. Same comparison mechanic as S26 — one thing
// learned once. Skip is allowed and the consequence is stated plainly.
export function RankingOnboardingScreen() {
  const navigate = useNavigate();
  const suggestion = places.find((p) => p.type === 'eat' && p.isActive);

  return (
    <AppShell title="Rank a favourite" showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-7) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          textAlign: 'center',
        }}
      >
        <p style={{ font: 'var(--type-body-lg)', color: 'var(--text-body)' }}>
          Have you already been to somewhere in Hyderabad you loved? Log it now and your picks start
          personalising immediately.
        </p>
        {suggestion ? (
          <Button onClick={() => navigate('/log-visit', { state: { placeId: suggestion.id } })}>
            Log {suggestion.name}
          </Button>
        ) : null}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-link)',
            cursor: 'pointer',
            font: 'var(--type-body-sm)',
          }}
        >
          Skip for now — you can do this anytime, but picks stay generic until you do
        </button>
      </div>
    </AppShell>
  );
}
