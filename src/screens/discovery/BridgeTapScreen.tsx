import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { RankBadge, type Rank } from '../../components/trust/RankBadge';
import { ReasonNote } from '../../components/trust/ReasonNote';
import { Button } from '../../components/core/Button';
import { Tabs } from '../../components/navigation/Tabs';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PickSkeleton } from '../../components/feedback/Skeleton';
import { GoogleMapView, type MapMarker } from '../../components/map/GoogleMapView';
import { usePersona } from '../../dev/PersonaContext';
import { useToast } from '../../components/feedback/ToastProvider';
import { fetchPlaceDetails, searchCandidates, type GoogleCandidate } from '../../lib/placesSearch';
import { haversineMeters, useSearch, type Door, type LatLng } from '../../lib/searchState';
import { hasMapsApiKey } from '../../lib/googleMaps';
import { pickReason, reviewDistanceScore, spreadOutPicks } from '../../data/hybridPicks';
import { addOutingStop, getOuting, isStopInOuting } from '../../lib/outingPlans';
import { usePlans, useCreatePlan, useAddPlanItem } from '../../data/hooks';

const NEARBY_RADIUS_M = 12_000;
const MAX_NEARBY = 3;

/**
 * P12 §4: this screen used to sort strictly by distance and take the three
 * nearest, which on a busy street is three doors of the same street — the
 * opposite of "where should we go next". Two changes, both here:
 *
 *  - Anything closer than this to where the outing currently is counts as
 *    the same stop, not a next one, so it is dropped outright.
 *  - What is left is ordered by how good the place actually is (Google
 *    rating weighted by review volume) with distance as a real but
 *    secondary cost, then spread across streets by spreadOutPicks. Over
 *    this screen's 12km radius the penalty below is worth up to ~6 points
 *    against a review score that tops out near 18: a genuinely great place
 *    a few kilometres on wins, a mediocre one across the city does not.
 */
const SAME_STOP_METERS = 200;
const BRIDGE_DISTANCE_PENALTY = 0.5;

const EAT_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'meal_takeaway',
  'bar',
  'meal_delivery',
  'food',
]);

type Anchor = {
  id: string;
  name: string;
  location: LatLng;
  /** What to search for from here: eat place → explore nearby; explore → eat nearby. */
  bridgeDoor: Door;
};

type NearbyStop = GoogleCandidate & {
  distanceMeters: number;
  driveLabel: string;
};

function formatDrive(meters: number): string {
  const km = meters / 1000;
  if (km < 1) return `${Math.max(1, Math.round(meters / 80))} min · ${km.toFixed(1)} km`;
  const mins = Math.max(1, Math.round((km / 20) * 60));
  return `${mins} min · ${km.toFixed(1)} km`;
}

function typeLabel(types: string[]): string | undefined {
  const t = types.find((x) => x !== 'point_of_interest' && x !== 'establishment');
  return t ? t.replace(/_/g, ' ') : undefined;
}

function isEatPlace(types: string[]): boolean {
  return types.some((t) => EAT_TYPES.has(t));
}

/** Google Maps multi-stop directions: origin + waypoints + destination. */
function openGoogleMapsRoute(anchor: Anchor, stops: Array<{ location: LatLng }>) {
  const origin = `${anchor.location.lat},${anchor.location.lng}`;
  if (stops.length === 0) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${origin}&travelmode=driving`,
      '_blank',
      'noopener',
    );
    return;
  }
  const destination = `${stops[stops.length - 1].location.lat},${stops[stops.length - 1].location.lng}`;
  const middle = stops.slice(0, -1);
  const waypoints = middle.map((s) => `${s.location.lat},${s.location.lng}`).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * S20 — Places nearby after a pick.
 * From an eat place → three explore spots worth the trip, by default.
 * From an explore place → three places to eat worth the trip, by default.
 * "Worth the trip", not "closest": see SAME_STOP_METERS above for why.
 *
 * Phase 6 §7: that default is now a starting point, not the only option —
 * two Eat/Explore buttons let a person search the other door instead. And
 * the search is no longer always centred on the place first tapped: for a
 * plan already being built, it centres on whichever stop was added most
 * recently, so "nearby" means nearby *where the outing currently is*, not
 * nearby the very first stop from an hour ago. Stated plainly, since this
 * was a pre-decided interpretation, not a guess: the priority is (1) the
 * most recently added stop, (2) the plan's anchor — read here as its
 * "first stop", since a Plan's anchor fields (anchor_lat/anchor_lng) are
 * literally the outing's starting point, stored separately from `stops`
 * only because that is how the schema records it — and (3) the user's
 * current location. Tier 3 only matters if tier 2 could somehow be empty;
 * in this screen it never is once `anchor` itself resolves (the screen
 * shows an empty state before that point), so it is wired in for
 * completeness/robustness rather than because it is reachable today.
 */
export function BridgeTapScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { breakpoint, hasSession, userId } = usePersona();
  const { show } = useToast();
  const { effectiveCenter } = useSearch();
  const [planVersion, setPlanVersion] = useState(0);
  // Keyed by anchor id rather than reset via an effect: this component stays
  // mounted across a route-param change (a new slug), so a manual door
  // choice must not silently carry over to a different place's default.
  const [doorOverrideFor, setDoorOverrideFor] = useState<{ anchorId: string; door: Door } | null>(
    null,
  );
  const decoded = slug ? decodeURIComponent(slug) : undefined;

  // Signed-in Users get a real, shareable plan (P5 §4); a Guest keeps the
  // existing local-only Outing (no account to persist a real one under).
  const { data: ownPlans = [] } = usePlans(hasSession ? userId : '');
  const createPlan = useCreatePlan(userId);
  const addPlanItem = useAddPlanItem(userId);

  // `decoded` is always a real Google place id — either from a place's own
  // detail page (place.placeId), or from SavedPlanDetailScreen's "Add
  // another stop" (the plan's raw anchorKey, which is the same id).
  const googleAnchorQuery = useQuery({
    queryKey: ['googlePlace', decoded, 'bridge-anchor'],
    queryFn: () => fetchPlaceDetails(decoded!),
    enabled: Boolean(decoded) && hasMapsApiKey(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const anchor: Anchor | null = useMemo(() => {
    if (!googleAnchorQuery.data) return null;
    const g = googleAnchorQuery.data;
    return {
      id: g.placeId,
      name: g.name,
      location: g.location,
      bridgeDoor: isEatPlace(g.types) ? 'explore' : 'eat',
    };
  }, [googleAnchorQuery.data]);

  const existingPlan =
    hasSession && anchor ? ownPlans.find((p) => p.anchorKey === anchor.id) : undefined;
  // Phase 8 §12: once this anchor already has a plan or outing under way —
  // one stop was already added — "View plan" lets someone jump straight to
  // the full thing without leaving this add-more-stops screen. Before that
  // first stop there is nothing yet to view, so the button stays absent
  // rather than opening onto an empty plan.
  const viewPlanHref = hasSession
    ? existingPlan
      ? `/plans/${existingPlan.id}`
      : null
    : anchor && getOuting(anchor.id)
      ? `/plans/${encodeURIComponent(anchor.id)}`
      : null;
  const doorOverride =
    anchor && doorOverrideFor?.anchorId === anchor.id ? doorOverrideFor.door : null;
  const effectiveDoor: Door = doorOverride ?? anchor?.bridgeDoor ?? 'eat';

  const referencePoint: { location: LatLng; name: string } = useMemo(() => {
    const fallback = { location: anchor?.location ?? effectiveCenter, name: anchor?.name ?? '' };
    if (!anchor) return fallback;
    if (hasSession) {
      const stops = existingPlan?.stops ?? [];
      const lastStop = stops[stops.length - 1];
      if (lastStop?.lat != null && lastStop.lng != null) {
        return { location: { lat: lastStop.lat, lng: lastStop.lng }, name: lastStop.placeName };
      }
      if (existingPlan?.anchorLat != null && existingPlan.anchorLng != null) {
        return {
          location: { lat: existingPlan.anchorLat, lng: existingPlan.anchorLng },
          name: existingPlan.anchorName,
        };
      }
      return fallback;
    }
    // Guest — the local-only outing plays the same role as a signed-in
    // User's Plan (anchor + ordered stops), just stored client-side.
    const outing = getOuting(anchor.id);
    const stops = outing?.stops ?? [];
    const lastStop = stops[stops.length - 1];
    if (lastStop?.lat != null && lastStop.lng != null) {
      return { location: { lat: lastStop.lat, lng: lastStop.lng }, name: lastStop.name };
    }
    if (outing?.anchorLat != null && outing?.anchorLng != null) {
      return {
        location: { lat: outing.anchorLat, lng: outing.anchorLng },
        name: outing.anchorName,
      };
    }
    return fallback;
    // planVersion forces this to re-read localStorage after a Guest adds a stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, hasSession, existingPlan, effectiveCenter, planVersion]);

  const nearbyQuery = useQuery({
    queryKey: [
      'bridgeNearby',
      anchor?.id,
      effectiveDoor,
      referencePoint.location.lat,
      referencePoint.location.lng,
    ],
    queryFn: async (): Promise<NearbyStop[]> => {
      if (!anchor) return [];
      const candidates = await searchCandidates({
        door: effectiveDoor,
        center: referencePoint.location,
        radiusMeters: NEARBY_RADIUS_M,
        areaText: '',
        clipToRadius: true,
        maxResults: 20,
      });
      const scored = candidates
        .filter((c) => c.placeId !== anchor.id)
        .map((c) => {
          const distanceMeters = haversineMeters(referencePoint.location, c.location);
          return {
            ...c,
            distanceMeters,
            driveLabel: formatDrive(distanceMeters),
          };
        })
        .filter((c) => c.distanceMeters >= SAME_STOP_METERS)
        .sort(
          (a, b) =>
            reviewDistanceScore(b, referencePoint.location, BRIDGE_DISTANCE_PENALTY) -
            reviewDistanceScore(a, referencePoint.location, BRIDGE_DISTANCE_PENALTY),
        );

      return spreadOutPicks(scored.map((c) => ({ candidate: c, location: c.location })))
        .map((p) => p.candidate)
        .slice(0, MAX_NEARBY);
    },
    enabled: Boolean(anchor) && hasMapsApiKey(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const nearby = nearbyQuery.data ?? [];
  const loading = googleAnchorQuery.isLoading || (Boolean(anchor) && nearbyQuery.isLoading);

  const markers: MapMarker[] = useMemo(() => {
    if (!anchor) return [];
    return nearby.map((n, i) => ({
      id: n.placeId,
      position: n.location,
      title: n.name,
      rank: (i + 1) as Rank,
      onClick: () => navigate(`/places/${encodeURIComponent(n.placeId)}`),
    }));
  }, [nearby, navigate]);

  const referenceIsAnchor =
    anchor != null &&
    referencePoint.location.lat === anchor.location.lat &&
    referencePoint.location.lng === anchor.location.lng;

  // P12 §4: "closest" was both the old sort and the old promise. Neither is
  // what this screen does now — it picks the three best places worth the
  // trip from here, which is what someone building an outing actually wants.
  const headline =
    effectiveDoor === 'eat'
      ? 'Three places worth eating at after this'
      : 'Three places worth stopping at after this';
  const screenTitle = effectiveDoor === 'eat' ? 'Eat nearby' : 'Explore nearby';

  if (!decoded) {
    return (
      <AppShell title="Nearby" onBack={() => navigate(-1)}>
        <EmptyState icon="map-pin-off" title="Nothing to pair yet" />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title={screenTitle} onBack={() => navigate(-1)}>
        <div
          style={{
            padding: 'var(--space-6) var(--gutter)',
            display: 'grid',
            gap: 'var(--space-5)',
            gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(3, 1fr)' : '1fr',
          }}
        >
          <PickSkeleton />
          <PickSkeleton />
          <PickSkeleton />
        </div>
      </AppShell>
    );
  }

  if (!anchor) {
    return (
      <AppShell title={screenTitle} onBack={() => navigate(-1)}>
        <EmptyState
          icon="map-pin-off"
          title="Can't place this spot yet"
          body="We need a location for this place before we can find what's nearby."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title={screenTitle} onBack={() => navigate(-1)}>
      <div
        style={{
          padding: 'var(--space-6) var(--gutter) var(--space-9)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              font: 'var(--type-eyebrow)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-eyebrow)',
              color: 'var(--text-muted)',
            }}
          >
            Build the rest of the outing
          </div>
          <h1
            style={{
              margin: 0,
              font: 'var(--type-h3)',
              color: 'var(--text-display)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {headline}
          </h1>
          <p
            style={{
              margin: 0,
              font: 'var(--type-body)',
              color: 'var(--text-body)',
              maxWidth: 'var(--reason-max)',
            }}
          >
            {referenceIsAnchor
              ? `Best-rated first, within reach of ${anchor.name}.`
              : `Best-rated first, within reach of ${referencePoint.name}, the stop you added most recently.`}{' '}
            Add as many as you want. Each one joins the route without leaving this screen.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ font: 'var(--type-label)', color: 'var(--text-muted)' }}>
                Search nearby for
              </span>
              <Tabs
                size="sm"
                items={[
                  { value: 'eat', label: 'Eat' },
                  { value: 'explore', label: 'Explore' },
                ]}
                value={effectiveDoor}
                onChange={(v) => setDoorOverrideFor({ anchorId: anchor.id, door: v as Door })}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--surface-card)',
          }}
        >
          <GoogleMapView
            height={breakpoint === 'desktop' ? 280 : 200}
            center={referencePoint.location}
            onMapClick={() => openGoogleMapsRoute(anchor, nearby)}
            markers={[
              {
                id: anchor.id,
                position: anchor.location,
                title: anchor.name,
              },
              ...(referenceIsAnchor
                ? []
                : [
                    {
                      id: `${anchor.id}-reference`,
                      position: referencePoint.location,
                      title: `${referencePoint.name} (searching from here)`,
                    },
                  ]),
              ...markers,
            ]}
            emptyLabel="Map · tap to open the route in Google Maps"
          />
          <button
            type="button"
            onClick={() => openGoogleMapsRoute(anchor, nearby)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 14px',
              font: 'var(--type-label)',
              color: 'var(--text-link)',
              background: 'var(--surface-card)',
              border: 'none',
              borderTop: '1px solid var(--border-hairline)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Open route in Google Maps →
          </button>
        </div>

        {nearbyQuery.error || (nearby.length === 0 && !nearbyQuery.isLoading) ? (
          <EmptyState
            icon="map-pin-off"
            title="Nothing nearby yet"
            body="Try a different starting place, or widen your search."
          />
        ) : (
          <>
            <div
              className="madli-stagger"
              style={{
                display: 'grid',
                gap: 'var(--space-5)',
                gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(3, 1fr)' : '1fr',
              }}
            >
              {nearby.map((stop, i) => {
                const added = hasSession
                  ? (existingPlan?.stops.some((s) => s.googlePlaceId === stop.placeId) ?? false)
                  : isStopInOuting(anchor.id, stop.placeId);
                const category = typeLabel(stop.types);
                const openDetail = () => navigate(`/places/${encodeURIComponent(stop.placeId)}`);
                return (
                  <article
                    key={stop.placeId}
                    className="madli-hover-lift"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-xl)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* P13 §5: the photo and the name/reason block open the
                        place's own detail page — previously only the
                        separate "Details" button did, so tapping the thing
                        someone is actually looking at (the picture, the
                        name) did nothing. */}
                    <button
                      type="button"
                      onClick={openDetail}
                      style={{
                        display: 'block',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <PhotoFrame
                          src={stop.photoUrl}
                          label={stop.name}
                          alt={stop.name}
                          ratio="16 / 10"
                          radius="0"
                          overlay
                          className="madli-hover-zoom"
                        >
                          <div style={{ position: 'absolute', top: 12, left: 12 }}>
                            <RankBadge rank={(i + 1) as Rank} size="md" />
                          </div>
                        </PhotoFrame>
                      </div>
                    </button>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-5)',
                        flex: 1,
                      }}
                    >
                      <button
                        type="button"
                        onClick={openDetail}
                        style={{
                          display: 'block',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            font: 'var(--type-h3)',
                            letterSpacing: 'var(--tracking-display)',
                          }}
                        >
                          {stop.name}
                        </h3>
                        <p
                          style={{
                            margin: '4px 0 0',
                            font: 'var(--type-body-sm)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {[category, stop.address.split(',').slice(-2).join(',').trim()]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </button>
                      <ReasonNote label="Why this one">{pickReason(stop, null)}</ReasonNote>
                      <p
                        style={{
                          margin: 0,
                          font: 'var(--type-evidence)',
                          color: 'var(--evidence-text)',
                        }}
                      >
                        {stop.driveLabel} from {referencePoint.name}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginTop: 'auto',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Button size="sm" variant="quiet" onClick={openDetail}>
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={createPlan.isPending || addPlanItem.isPending}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (added) {
                              show('Already on your plan.');
                              return;
                            }

                            if (hasSession && userId) {
                              try {
                                if (existingPlan) {
                                  await addPlanItem.mutateAsync({
                                    planId: existingPlan.id,
                                    stop: {
                                      googlePlaceId: stop.placeId,
                                      placeName: stop.name,
                                      address: stop.address,
                                      lat: stop.location.lat,
                                      lng: stop.location.lng,
                                    },
                                  });
                                } else {
                                  await createPlan.mutateAsync({
                                    anchor: {
                                      key: anchor.id,
                                      name: anchor.name,
                                      lat: anchor.location.lat,
                                      lng: anchor.location.lng,
                                    },
                                    firstStop: {
                                      googlePlaceId: stop.placeId,
                                      placeName: stop.name,
                                      address: stop.address,
                                      lat: stop.location.lat,
                                      lng: stop.location.lng,
                                    },
                                  });
                                }
                                show(`Added ${stop.name} to your plan.`);
                              } catch (err) {
                                show(
                                  err instanceof Error
                                    ? err.message
                                    : 'Could not save that to your plan.',
                                );
                              }
                              return;
                            }

                            // Guest: no account to persist a real plan under
                            // — same multi-stop experience, local-only.
                            addOutingStop(
                              anchor.id,
                              anchor.name,
                              {
                                placeId: stop.placeId,
                                name: stop.name,
                                address: stop.address,
                                photoUrl: stop.photoUrl,
                                lat: stop.location.lat,
                                lng: stop.location.lng,
                              },
                              anchor.location,
                            );
                            setPlanVersion((n) => n + 1);
                            show(`Added ${stop.name} to your plan.`);
                          }}
                        >
                          {added ? 'Added' : 'Add to plan'}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <p style={{ margin: 0, font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Add as many stops as you want. Tap the map to open the full route in Google Maps.
            </p>
          </>
        )}

        {/* P14: this used to be a small secondary button crowded next to the
            Eat/Explore tabs, easy to miss on a screen whose whole job is
            adding stops. It belongs at the bottom, once there is a plan
            worth going to look at, and it should look like the one obvious
            next step rather than one option among several. */}
        {viewPlanHref ? (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              marginTop: 'var(--space-4)',
              marginLeft: 'calc(-1 * var(--gutter))',
              marginRight: 'calc(-1 * var(--gutter))',
              padding: 'var(--space-4) var(--gutter)',
              background: 'var(--bar-scrim)',
              backdropFilter: 'var(--blur-bar)',
              WebkitBackdropFilter: 'var(--blur-bar)',
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <Button size="lg" variant="primary" block onClick={() => navigate(viewPlanHref)}>
              View plan
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
