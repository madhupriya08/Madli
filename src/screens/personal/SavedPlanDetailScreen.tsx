import { useReducer } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Badge } from '../../components/core/Badge';
import { Button } from '../../components/core/Button';
import { Card } from '../../components/core/Card';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import { usePersona } from '../../dev/PersonaContext';
import { usePlans, useSharedPlan, useCreatePlanShareToken, useRemovePlanItem } from '../../data/hooks';
import type { Plan } from '../../data/plans';
import { GoogleMapView, type MapMarker } from '../../components/map/GoogleMapView';
import { getOuting, removeOutingPlan, removeOutingStop, type OutingPlan } from '../../lib/outingPlans';

/** A real, backend plan rendered through the exact same view as a local Outing — same shape, same component, one fewer rendering path to keep honest. */
function planToOutingView(plan: Plan): OutingPlan {
  return {
    anchorPlaceId: plan.anchorKey,
    anchorName: plan.anchorName,
    anchorLat: plan.anchorLat ?? undefined,
    anchorLng: plan.anchorLng ?? undefined,
    stops: plan.stops.map((s) => ({
      placeId: s.googlePlaceId,
      name: s.placeName,
      address: s.address ?? '',
      lat: s.lat ?? undefined,
      lng: s.lng ?? undefined,
      addedAt: 0,
    })),
  };
}

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
  isSharedLink = false,
  onShare,
  shareBusy = false,
  onRemoveStop,
  removingStopId = null,
}: {
  plan: OutingPlan;
  onBack: () => void;
  /** Whole-plan removal — fires from the last stop going too, or the explicit "Remove plan" button. */
  onRemoved?: () => void;
  /** True for an anonymous visitor on a share link — read-only, no owner actions. */
  isSharedLink?: boolean;
  /** Present only for a real, signed-in-User-owned plan — local Outings have no account to share from. */
  onShare?: () => void;
  shareBusy?: boolean;
  /** Phase 8 §3: per-stop removal — present for both a real Plan and a Guest Outing. */
  onRemoveStop?: (placeId: string) => void;
  /** The stop currently being removed, so its button reads busy instead of double-submitting. */
  removingStopId?: string | null;
}) {
  const navigate = useNavigate();
  const { show } = useToast();

  // Phase 8 §2: always the order stops were actually added in — a Phase 6 §9
  // shortest-route recompute used to run here on every render, which meant
  // adding one new stop could reshuffle every other stop's displayed
  // position too (a real behavior, not a bug in that algorithm, but one the
  // person building the outing experienced as positions randomly rotating).
  // Removed outright rather than hidden: nothing here reorders `plan.stops`
  // any more, for the list or for the Google Maps route link.
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
        {isSharedLink ? (
          <Badge tone="teal">Shared link — no account needed, never expires</Badge>
        ) : null}
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
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <div style={{ font: 'var(--type-label)', color: 'var(--text-muted)' }}>
                  Stop {i + 1}
                </div>
                <div style={{ font: 'var(--type-body)' }}>{stop.name}</div>
                {stop.address ? (
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                    {stop.address}
                  </div>
                ) : null}
              </div>
              {onRemoveStop && !isSharedLink ? (
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={removingStopId === stop.placeId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStop(stop.placeId);
                  }}
                >
                  {removingStopId === stop.placeId ? 'Removing…' : 'Remove'}
                </Button>
              ) : null}
            </Card>
          ))}
        </div>

        {isSharedLink ? null : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/places/${encodeURIComponent(plan.anchorPlaceId)}/bridge`)
              }
            >
              Add another stop
            </Button>
            {onShare ? (
              <Button variant="secondary" disabled={shareBusy} onClick={onShare}>
                Share this plan
              </Button>
            ) : null}
            {onRemoved ? (
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
            ) : null}
          </div>
        )}
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
  const removePlanItem = useRemovePlanItem(userId);
  // Guest outings live in localStorage, not TanStack Query — getOuting()
  // below re-reads it fresh on every render, so this only needs to force
  // one after a stop is removed (Phase 8 §3), same idea as BridgeTapScreen's
  // own planVersion counter.
  const [, forceOutingRefresh] = useReducer((n: number) => n + 1, 0);

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
        onRemoveStop={(placeId) => {
          const wholePlanRemoved = removeOutingStop(outing.anchorPlaceId, placeId);
          if (wholePlanRemoved) {
            show('Plan removed.');
            navigate('/bookmarks', { replace: true });
          } else {
            forceOutingRefresh();
          }
        }}
      />
    );
  }

  if (sharedLoading || ownLoading) return null;

  if (!plan) {
    return (
      <AppShell title="Plan" onBack={() => navigate(-1)}>
        <EmptyState icon="map-pin-off" title="We can't find that plan" />
      </AppShell>
    );
  }

  return (
    <OutingPlanDetail
      plan={planToOutingView(plan)}
      onBack={() => navigate(-1)}
      isSharedLink={isSharedLink}
      shareBusy={createShareToken.isPending}
      onShare={
        isSharedLink
          ? undefined
          : async () => {
              const token = await createShareToken.mutateAsync(plan.id);
              const url = `${window.location.origin}/plans/${token}?shared=1`;
              await navigator.clipboard?.writeText(url).catch(() => {});
              show('Share link copied. No account needed, never expires.');
            }
      }
      removingStopId={removePlanItem.isPending ? removePlanItem.variables?.googlePlaceId : null}
      onRemoveStop={
        isSharedLink
          ? undefined
          : async (placeId) => {
              try {
                const wholePlanRemoved = await removePlanItem.mutateAsync({
                  planId: plan.id,
                  googlePlaceId: placeId,
                });
                if (wholePlanRemoved) {
                  show('Plan removed.');
                  navigate('/bookmarks', { replace: true });
                }
              } catch (err) {
                show(err instanceof Error ? err.message : 'Could not remove that stop.', {
                  tone: 'error',
                });
              }
            }
      }
    />
  );
}
