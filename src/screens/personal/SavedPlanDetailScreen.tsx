import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { PickCard } from '../../components/trust/PickCard';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { usePlans, useSharedPlan, useCreatePlanShareToken } from '../../data/hooks';
import { placeById } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';

// S24: map plus both stops, reflowed. Shared-link state shows the same
// content to an anonymous visitor via the plan's share token — for real: the
// `:id` route param IS the share token in that state (the URL a real shared
// link contains, per the x-share-token header contract in
// src/data/plans.ts), not the plan's own row id, which an anonymous visitor
// never sees. "Share this plan" (owner's own view only) is the UI entry
// point for minting that token — Phase 2 never built one even though the
// backend supported it end to end; found while writing Phase 3's shared-plan
// E2E coverage (PHASE_3_COMPLETION_REPORT.md §5).
export function SavedPlanDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isSharedLink = searchParams.get('shared') === '1';
  const navigate = useNavigate();
  const { userId } = usePersona();
  const { show } = useToast();
  const createShareToken = useCreatePlanShareToken();

  const { data: sharedPlan, isLoading: sharedLoading } = useSharedPlan(
    isSharedLink ? id : undefined,
  );
  const { data: ownPlans = [], isLoading: ownLoading } = usePlans(isSharedLink ? '' : userId);
  const plan = isSharedLink ? sharedPlan : ownPlans.find((p) => p.id === id);

  if (sharedLoading || ownLoading) return null;

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
          padding: 'var(--space-6) var(--gutter)',
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
        {isSharedLink ? null : (
          <Button
            variant="secondary"
            disabled={createShareToken.isPending}
            onClick={async () => {
              const token = await createShareToken.mutateAsync(plan.id);
              const url = `${window.location.origin}/plans/${token}?shared=1`;
              await navigator.clipboard?.writeText(url).catch(() => {});
              show('Share link copied. No account needed, never expires.');
            }}
          >
            Share this plan
          </Button>
        )}
      </div>
    </AppShell>
  );
}
