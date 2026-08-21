import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { PickCard } from '../../components/trust/PickCard';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { usePersona } from '../../dev/PersonaContext';
import { useCreatePlan } from '../../data/hooks';
import { places, placeBySlug } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';

// S20: Guest sees the whole module as a teaser and the tap opens the signup
// prompt rather than the plan. "Save the pair as a plan" writes into
// Bookmarks under the Plans tab (S24 reopens it from there). Real divergence:
// split map on desktop, stacked with a map tab on mobile.
export function BridgeTapScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { persona, breakpoint, userId } = usePersona();
  const createPlan = useCreatePlan(userId);
  const [saved, setSaved] = useState(false);

  const eatPlace = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;
  const explorePick = places.find((p) => p.type === 'explore' && p.isActive);

  if (!eatPlace || !explorePick) {
    return (
      <AppShell title="Bridge" onBack={() => navigate(-1)}>
        <EmptyState icon="map-pin-off" title="Nothing to pair yet" />
      </AppShell>
    );
  }

  if (persona === 'guest') {
    return (
      <AppShell title="Pair it with something to do" onBack={() => navigate(-1)} showTabBar={false}>
        <div style={{ padding: 'var(--space-6) var(--gutter-mobile)', textAlign: 'center' }}>
          <p style={{ font: 'var(--type-body)', marginBottom: 'var(--space-5)' }}>
            Sign up to save {eatPlace.name} paired with a nearby Explore pick as a plan.
          </p>
          <Button onClick={() => navigate('/signup')}>Sign up</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Bridge tap" onBack={() => navigate(-1)}>
      <div
        style={{
          display: breakpoint === 'desktop' ? 'grid' : 'flex',
          flexDirection: breakpoint === 'desktop' ? undefined : 'column',
          gridTemplateColumns: breakpoint === 'desktop' ? '1fr 1fr' : undefined,
          gap: 'var(--space-6)',
          padding: 'var(--space-6) var(--gutter-mobile)',
        }}
      >
        <PickCard
          rank={1}
          name={eatPlace.name}
          category={categoryName(eatPlace.categoryId)}
          neighborhood={eatPlace.neighborhood}
          reason={eatPlace.reason}
          locals={eatPlace.locals}
          visitors={eatPlace.visitors}
          gapTone={eatPlace.gapTone ?? 'clear'}
        />
        <PickCard
          rank={1}
          name={explorePick.name}
          category={categoryName(explorePick.categoryId)}
          neighborhood={explorePick.neighborhood}
          reason={explorePick.reason}
          gapTone="clear"
        />
      </div>
      <div style={{ padding: '0 var(--gutter-mobile) var(--space-6)' }}>
        <Button
          disabled={saved}
          onClick={async () => {
            await createPlan.mutateAsync({
              eatPlaceId: eatPlace.id,
              explorePlaceId: explorePick.id,
            });
            setSaved(true);
          }}
        >
          {saved ? 'Saved as a plan' : 'Save the pair as a plan'}
        </Button>
      </div>
    </AppShell>
  );
}
