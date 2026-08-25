import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../layout/AppShell';
import { PhotoFrame } from '../../components/core/PhotoFrame';
import { RankBadge, type Rank } from '../../components/trust/RankBadge';
import { ReasonNote } from '../../components/trust/ReasonNote';
import { Button } from '../../components/core/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PickSkeleton } from '../../components/feedback/Skeleton';
import { GoogleMapView, type MapMarker } from '../../components/map/GoogleMapView';
import { usePersona } from '../../dev/PersonaContext';
import { useToast } from '../../components/feedback/ToastProvider';
import { placeBySlug } from '../../fixtures/places';
import { fetchPlaceDetails, searchCandidates, type GoogleCandidate } from '../../lib/placesSearch';
import { haversineMeters, type Door, type LatLng } from '../../lib/searchState';
import { hasMapsApiKey } from '../../lib/googleMaps';
import { pickReason } from '../../data/hybridPicks';
import { addOutingStop, isStopInOuting } from '../../lib/outingPlans';

const NEARBY_RADIUS_M = 12_000;
const MAX_NEARBY = 3;

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

function isEatPlace(types: string[], catalogueType?: string): boolean {
  if (catalogueType === 'eat') return true;
  if (catalogueType === 'explore') return false;
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
 * From an eat place → three closest explore spots.
 * From an explore place → three closest places to eat.
 */
export function BridgeTapScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const { show } = useToast();
  const [planVersion, setPlanVersion] = useState(0);
  const decoded = slug ? decodeURIComponent(slug) : undefined;

  const catalogue = decoded ? placeBySlug(decoded) : undefined;

  const googleAnchorQuery = useQuery({
    queryKey: ['googlePlace', decoded, 'bridge-anchor'],
    queryFn: () =>
      fetchPlaceDetails(
        catalogue?.googlePlaceId && catalogue.lat == null ? catalogue.googlePlaceId : decoded!,
      ),
    enabled:
      Boolean(decoded) &&
      hasMapsApiKey() &&
      (!catalogue || (catalogue.lat == null && Boolean(catalogue.googlePlaceId)) || !catalogue),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const anchor: Anchor | null = useMemo(() => {
    if (catalogue?.lat != null && catalogue.lng != null) {
      return {
        id: catalogue.googlePlaceId ?? catalogue.id,
        name: catalogue.name,
        location: { lat: catalogue.lat, lng: catalogue.lng },
        bridgeDoor: catalogue.type === 'explore' ? 'eat' : 'explore',
      };
    }
    if (googleAnchorQuery.data) {
      const g = googleAnchorQuery.data;
      return {
        id: g.placeId,
        name: catalogue?.name ?? g.name,
        location: g.location,
        bridgeDoor: isEatPlace(g.types, catalogue?.type) ? 'explore' : 'eat',
      };
    }
    return null;
  }, [catalogue, googleAnchorQuery.data]);

  const nearbyQuery = useQuery({
    queryKey: [
      'bridgeNearby',
      anchor?.id,
      anchor?.bridgeDoor,
      anchor?.location.lat,
      anchor?.location.lng,
    ],
    queryFn: async (): Promise<NearbyStop[]> => {
      if (!anchor) return [];
      const candidates = await searchCandidates({
        door: anchor.bridgeDoor,
        center: anchor.location,
        radiusMeters: NEARBY_RADIUS_M,
        areaText: '',
        clipToRadius: true,
        maxResults: 20,
      });
      return candidates
        .filter((c) => c.placeId !== anchor.id)
        .map((c) => {
          const distanceMeters = haversineMeters(anchor.location, c.location);
          return {
            ...c,
            distanceMeters,
            driveLabel: formatDrive(distanceMeters),
          };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, MAX_NEARBY);
    },
    enabled: Boolean(anchor) && hasMapsApiKey(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const nearby = nearbyQuery.data ?? [];
  const loading =
    (!catalogue && googleAnchorQuery.isLoading) ||
    (Boolean(catalogue) && catalogue?.lat == null && googleAnchorQuery.isLoading) ||
    (Boolean(anchor) && nearbyQuery.isLoading);

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

  const headline =
    anchor?.bridgeDoor === 'eat'
      ? 'The three closest places to eat afterwards'
      : 'The three closest places worth stopping at afterwards';
  const screenTitle = anchor?.bridgeDoor === 'eat' ? 'Eat nearby' : 'Explore nearby';

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

  // planVersion forces a re-read of localStorage after Add to plan.
  void planVersion;

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
            Anchored to {anchor.name}, nearest first. Add as many as you want — each one joins the
            route without leaving this screen.
          </p>
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
            center={anchor.location}
            onMapClick={() => openGoogleMapsRoute(anchor, nearby)}
            markers={[
              {
                id: anchor.id,
                position: anchor.location,
                title: anchor.name,
              },
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
              style={{
                display: 'grid',
                gap: 'var(--space-5)',
                gridTemplateColumns: breakpoint === 'desktop' ? 'repeat(3, 1fr)' : '1fr',
              }}
            >
              {nearby.map((stop, i) => {
                const added = isStopInOuting(anchor.id, stop.placeId);
                const category = typeLabel(stop.types);
                return (
                  <article
                    key={stop.placeId}
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
                    <div style={{ position: 'relative' }}>
                      <PhotoFrame
                        src={stop.photoUrl}
                        label={stop.name}
                        alt={stop.name}
                        ratio="16 / 10"
                        radius="0"
                        overlay
                      >
                        <div style={{ position: 'absolute', top: 12, left: 12 }}>
                          <RankBadge rank={(i + 1) as Rank} size="md" />
                        </div>
                      </PhotoFrame>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-5)',
                        flex: 1,
                      }}
                    >
                      <div>
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
                      </div>
                      <ReasonNote label="Why this one">{pickReason(stop, null)}</ReasonNote>
                      <p
                        style={{
                          margin: 0,
                          font: 'var(--type-evidence)',
                          color: 'var(--evidence-text)',
                        }}
                      >
                        {stop.driveLabel} from {anchor.name}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginTop: 'auto',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Button
                          size="sm"
                          variant="quiet"
                          onClick={() =>
                            navigate(`/places/${encodeURIComponent(stop.placeId)}`)
                          }
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (added) {
                              show('Already on your plan.');
                              return;
                            }
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
      </div>
    </AppShell>
  );
}
