import { useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Card } from '../../components/core/Card';
import { Button } from '../../components/core/Button';
import { useBusinessClaims } from '../../data/hooks';
import { usePersona } from '../../dev/PersonaContext';
import { placeById } from '../../fixtures/places';

// S40: deliberately not a User profile — no ranked list, no local status.
// Stating that in the UI prevents the obvious support question.
export function OwnerProfileScreen() {
  const navigate = useNavigate();
  const { userId } = usePersona();
  const { data: allClaims = [] } = useBusinessClaims({ userId });
  const claims = allClaims.filter((c) => c.status === 'verified');

  return (
    <AppShell title="Owner profile" showTabBar={false}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter-mobile)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          This is your owner profile — it doesn&apos;t show a ranked list or local status, since
          those are User-only features unrelated to owning a listing.
        </p>
        {claims.map((c) => {
          const place = placeById(c.placeId);
          if (!place) return null;
          return (
            <Card
              key={c.id}
              interactive
              onClick={() => navigate(`/owner/${encodeURIComponent(place.slug)}/edit`)}
            >
              {place.name}
            </Card>
          );
        })}
        <Button variant="secondary" onClick={() => navigate('/settings')}>
          Settings
        </Button>
      </div>
    </AppShell>
  );
}
