import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Button } from '../../components/core/Button';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import { usePersona } from '../../dev/PersonaContext';
import { useSearch, type LatLng } from '../../lib/searchState';
import { fetchRoute, type RouteResult } from '../../lib/routes';
import { placeBySlug } from '../../fixtures/places';

// S21: a real route now, not a labelled panel — Google draws the map and the
// polyline, and the travel time is the one Directions returns rather than the
// hand-typed `drive` string on the place row. "Open in Google Maps" stays
// exactly what it was: the exit, below the in-app actions, not an embed.
// Real divergence held: desktop is map + side panel, mobile is a full-width
// map with the details as a sheet beneath it.
export function MapScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { breakpoint } = usePersona();
  const { effectiveCenter } = useSearch();
  const place = slug ? placeBySlug(decodeURIComponent(slug)) : undefined;

  const destination: LatLng | null =
    place?.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null;

  // The result is stored together with the trip it belongs to, so a stale
  // route is discarded by comparison during render rather than by clearing
  // state at the top of the effect.
  const tripKey = destination
    ? `${effectiveCenter.lat},${effectiveCenter.lng}->${destination.lat},${destination.lng}`
    : null;
  const [fetched, setFetched] = useState<{
    key: string;
    route: RouteResult | null;
    error: Error | null;
  } | null>(null);
  const current = fetched && fetched.key === tripKey ? fetched : null;
  const route = current?.route ?? null;
  const routeError = current?.error ?? null;

  useEffect(() => {
    if (!destination || !tripKey) return;
    let cancelled = false;
    fetchRoute(effectiveCenter, destination)
      .then((r) => {
        if (!cancelled) setFetched({ key: tripKey, route: r, error: null });
      })
      .catch((err: unknown) => {
        // A failed route must not blank the screen: the map and the
        // "Open in Google Maps" handoff are still useful without it.
        if (!cancelled) {
          setFetched({
            key: tripKey,
            route: null,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tripKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapPanel = (
    <GoogleMapView
      height={breakpoint === 'desktop' ? 480 : 300}
      center={destination ?? effectiveCenter}
      markers={
        destination
          ? [
              {
                id: 'destination',
                position: destination,
                title: place?.name ?? 'Destination',
                rank: 1,
              },
            ]
          : []
      }
      polyline={route?.path}
      emptyLabel={destination ? undefined : 'No coordinates for this place yet — nothing to map.'}
    />
  );

  const details = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: breakpoint === 'desktop' ? 0 : 'var(--space-5) var(--gutter)',
      }}
    >
      <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>
        {route
          ? `${route.durationText} · ${route.distanceText}`
          : routeError
            ? 'Travel time unavailable right now.'
            : destination
              ? 'Working out the route…'
              : 'Drive time unavailable — this place has no coordinates yet.'}
      </p>
      {routeError ? (
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          {routeError.message}
        </p>
      ) : null}
      <Button
        variant="secondary"
        onClick={() =>
          window.open(
            destination
              ? `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`
              : `https://maps.google.com/?q=${encodeURIComponent(place?.address ?? '')}`,
            '_blank',
            'noopener',
          )
        }
      >
        Open in Google Maps
      </Button>
    </div>
  );

  return (
    <AppShell title="Directions" onBack={() => navigate(-1)}>
      {breakpoint === 'desktop' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 'var(--space-6)',
            padding: 'var(--space-6) var(--gutter)',
          }}
        >
          {mapPanel}
          <div>{details}</div>
        </div>
      ) : (
        <div>
          {mapPanel}
          {details}
        </div>
      )}
    </AppShell>
  );
}
