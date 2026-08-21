import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { PickCard } from '../../components/trust/PickCard';
import { Badge } from '../../components/core/Badge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockDb } from '../../fixtures/mockDb';
import { placeById } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';

// S24: map plus both stops, reflowed. Shared-link state shows the same
// content to an anonymous visitor via the plan's share token.
export function SavedPlanDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isSharedLink = searchParams.get('shared') === '1';
  const navigate = useNavigate();

  const plan = mockDb.plans.find((p) => p.id === id);
  const eat = plan ? placeById(plan.eatPlaceId) : undefined;
  const explore = plan ? placeById(plan.explorePlaceId) : undefined;

  if (!plan || !eat || !explore) {
    return (
      <AppShell title="Plan" onBack={() => navigate(-1)}>
        <EmptyState icon="map-pin-off" title="We can't find that plan" />
      </AppShell>
    );
  }

  return (
    <AppShell title={plan.name ?? 'Saved plan'} onBack={() => navigate(-1)}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter-mobile)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {isSharedLink ? (
          <Badge tone="teal">Shared link — no account needed, never expires</Badge>
        ) : null}
        <div
          style={{
            height: 200,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Map placeholder — both stops
          </span>
        </div>
        <PickCard
          rank={1}
          name={eat.name}
          category={categoryName(eat.categoryId)}
          neighborhood={eat.neighborhood}
          reason={eat.reason}
          locals={eat.locals}
          visitors={eat.visitors}
          gapTone={eat.gapTone ?? 'clear'}
        />
        <PickCard
          rank={1}
          name={explore.name}
          category={categoryName(explore.categoryId)}
          neighborhood={explore.neighborhood}
          reason={explore.reason}
          gapTone="clear"
        />
      </div>
    </AppShell>
  );
}
