import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { PickCard } from '../../components/trust/PickCard';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { Card } from '../../components/core/Card';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { usePlans, useSharedPlan, useCreatePlanShareToken } from '../../data/hooks';
import { placeById } from '../../fixtures/places';
import { categoryName } from '../../fixtures/categories';
import { placePhotoUrl } from '../../lib/placePhoto';
import { GoogleMapView, type MapMarker } from '../../components/map/GoogleMapView';
import { getOuting, removeOutingPlan, type OutingPlan } from '../../lib/outingPlans';

function openOutingInGoogleMaps(plan: OutingPlan) {
  const withCoords = plan.stops.filter(
    (s): s is typeof s & { lat: number; lng: number } => s.lat != null && s.lng != null,
  );
  if (withCoords.length === 0) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.anchorName)}`,
      '_blank',
      'noopener',
    );
    return;
  }

  const hasAnchor = plan.anchorLat != null && plan.anchorLng != null;
  const origin = hasAnchor
    ? `${plan.anchorLat},${plan.anchorLng}`
    : `${withCoords[0].lat},${withCoords[0].lng}`;
  const routeStops = hasAnchor ? withCoords : withCoords.slice(1);

  if (routeStops.length === 0) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(`${withCoords[0].lat},${withCoords[0].lng}`)}&travelmode=driving`,
      '_blank',
      'noopener',
    );
    return;
  }

  const destination = `${routeStops[routeStops.length - 1].lat},${routeStops[routeStops.length - 1].lng}`;
  const middle = routeStops.slice(0, -1);
  const waypoints = middle.map((s) => `${s.lat},${s.lng}`).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  window.open(url, '_blank', 'noopener');
}

function OutingPlanDetail({
  plan,
  onBack,
  onRemoved,
}: {
  plan: OutingPlan;
  onBack: () => void;
  onRemoved: () => void;
}) {
  const navigate = useNavigate();
  const { show } = useToast();

  const markers: MapMarker[] = plan.stops
    .filter((s): s is typeof s & { lat: number; lng: number } => s.lat != null && s.lng != null)
    .map((s, i) => ({
      id: s.placeId,
      position: { lat: s.lat, lng: s.lng },
      title: s.name,
      rank: (Math.min(i + 1, 5) as 1 | 2 | 3 | 4 | 5),
      onClick: () => navigate(`/places/${encodeURIComponent(s.placeId)}`),
    }));

  return (
    <AppShell title={plan.anchorName} onBack={onBack}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-body)' }}>
          Outing from {plan.anchorName} · {plan.stops.length} stop
          {plan.stops.length === 1 ? '' : 's'}
        </p>

        <GoogleMapView
          height={220}
          markers={markers}
          onMapClick={() => openOutingInGoogleMaps(plan)}
          emptyLabel="Stops need coordinates before we can map the route."
        />

        <Button variant="primary" onClick={() => openOutingInGoogleMaps(plan)}>
          Open route in Google Maps
        </Button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {plan.stops.map((stop, i) => (
            <Card
              key={stop.placeId}
              interactive
              onClick={() => navigate(`/places/${encodeURIComponent(stop.placeId)}`)}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <div style={{ font: 'var(--type-label)', color: 'var(--text-muted)' }}>
                Stop {i + 1}
              </div>
              <div style={{ font: 'var(--type-body)' }}>{stop.name}</div>
              {stop.address ? (
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  {stop.address}
                </div>
              ) : null}
            </Card>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/places/${encodeURIComponent(plan.anchorPlaceId)}/bridge`)
            }
          >
            Edit nearby picks
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              removeOutingPlan(plan.anchorPlaceId);
              show('Plan removed.');
              onRemoved();
            }}
          >
            Remove plan
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

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

  const decodedId = id ? decodeURIComponent(id) : undefined;
  const outing = !isSharedLink && decodedId ? getOuting(decodedId) : undefined;

  const { data: sharedPlan, isLoading: sharedLoading } = useSharedPlan(
    isSharedLink ? id : undefined,
  );
  const { data: ownPlans = [], isLoading: ownLoading } = usePlans(
    isSharedLink || outing ? '' : userId,
  );
  const plan = isSharedLink ? sharedPlan : ownPlans.find((p) => p.id === id);

  if (outing) {
    return (
      <OutingPlanDetail
        plan={outing}
        onBack={() => navigate(-1)}
        onRemoved={() => navigate('/bookmarks', { replace: true })}
      />
    );
  }

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

  // Both stops when both have coordinates, one when only one does — a plan
  // is still worth mapping half-known.
  const planMarkers: MapMarker[] = [];
  if (eat.lat != null && eat.lng != null) {
    planMarkers.push({
      id: eat.id,
      position: { lat: eat.lat, lng: eat.lng },
      title: eat.name,
      rank: 1,
    });
  }
  if (explore.lat != null && explore.lng != null) {
    planMarkers.push({
      id: explore.id,
      position: { lat: explore.lat, lng: explore.lng },
      title: explore.name,
      rank: 2,
    });
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
        <GoogleMapView
          height={220}
          markers={planMarkers}
          emptyLabel="Neither stop has coordinates yet — nothing to map."
        />
        <PickCard
          rank={1}
          name={eat.name}
          category={categoryName(eat.categoryId)}
          neighborhood={eat.neighborhood}
          reason={eat.reason}
          locals={eat.locals}
          visitors={eat.visitors}
          gapTone={eat.gapTone ?? 'clear'}
          photoSrc={placePhotoUrl(eat.slug)}
          photoLabel={eat.name}
        />
        <PickCard
          rank={1}
          name={explore.name}
          category={categoryName(explore.categoryId)}
          neighborhood={explore.neighborhood}
          reason={explore.reason}
          gapTone="clear"
          photoSrc={placePhotoUrl(explore.slug)}
          photoLabel={explore.name}
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
