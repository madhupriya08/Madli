import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/feedback/Dialog';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { placeById, places } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import type { Tier } from '../../fixtures/mockDb';

const TIERS: { value: Tier; label: string }[] = [
  { value: 'loved', label: 'Loved it' },
  { value: 'fine', label: 'It was fine' },
  { value: 'disliked', label: "Didn't like it" },
];

// S25: two taps from here to a ranked place — the whole design constraint on
// S25-S27. The category shown is not decoration: it decides which pairwise
// bucket the place lands in, set on the catalogue record (S44), not chosen here.
export function LogVisitTriggerScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const passedPlaceId = (location.state as { placeId?: string } | null)?.placeId;
  const place = passedPlaceId ? placeById(passedPlaceId) : places.find((p) => p.isActive);
  const [tier, setTier] = useState<Tier | null>(null);

  if (!place) {
    return (
      <Dialog open title="Log a visit" onClose={() => navigate(-1)}>
        <EmptyState icon="map-pin-off" title="Nothing to log" />
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      title="How was it?"
      subtitle={place.name}
      onClose={() => navigate(-1)}
      variant={breakpoint === 'desktop' ? 'modal' : 'sheet'}
    >
      <p
        style={{
          font: 'var(--type-caption)',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Ranked in {categoryName(place.categoryId)}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {TIERS.map((t) => (
          <Button
            key={t.value}
            variant={tier === t.value ? 'primary' : 'secondary'}
            block
            onClick={() => setTier(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-5)' }}>
        <Button
          block
          disabled={!tier}
          onClick={() => navigate('/log-visit/compare', { state: { placeId: place.id, tier } })}
        >
          Continue
        </Button>
      </div>
    </Dialog>
  );
}
