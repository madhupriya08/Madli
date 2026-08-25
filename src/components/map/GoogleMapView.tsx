/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import {
  loadGoogleMaps,
  hasMapsApiKey,
  MissingMapsKeyError,
  MapsApiNotEnabledError,
  asMapsError,
} from '../../lib/googleMaps';
import type { LatLng } from '../../lib/searchState';
import { EmptyState } from '../feedback/EmptyState';

export interface MapMarker {
  id: string;
  position: LatLng;
  title: string;
  /** Ranked picks get the numbered teal pin; unranked get a quiet dot. */
  rank?: 1 | 2 | 3;
  onClick?: () => void;
}

export interface GoogleMapViewProps {
  markers?: MapMarker[];
  center?: LatLng;
  zoom?: number;
  /** Drawn as a teal route line when supplied (S21 directions). */
  polyline?: LatLng[];
  height?: number | string;
  /** Shown instead of the map when there is nothing to plot. */
  emptyLabel?: string;
}

const FALLBACK_CENTER: LatLng = { lat: 17.385, lng: 78.4867 };

/**
 * A real Google map, or an honest explanation of why there isn't one.
 *
 * Every failure mode here is somebody's fixable setup problem, so each gets
 * its own message rather than one generic "map unavailable": no key is a
 * `.env.local` edit, a disabled API is a Cloud Console toggle, and a load
 * failure is usually a referrer restriction. A blank grey box would hide all
 * three.
 */
export function GoogleMapView({
  markers = [],
  center,
  zoom = 13,
  polyline,
  height = 320,
  emptyLabel,
}: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerObjectsRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  // Whether a key exists is a synchronous read of import.meta.env, so it is
  // derived here rather than pushed into state from an effect.
  const keyMissing = !hasMapsApiKey();
  const error: Error | null = keyMissing ? new MissingMapsKeyError() : loadError;

  const resolvedCenter = center ?? markers[0]?.position ?? FALLBACK_CENTER;

  // Create the map once, then keep it — re-creating on every prop change
  // would restart the tile load and visibly flash.
  useEffect(() => {
    if (keyMissing) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: resolvedCenter,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(asMapsError(err, 'Maps JavaScript API'));
      });

    return () => {
      cancelled = true;
    };
    // Center/zoom are applied by the effects below once the map exists, so
    // they are deliberately not dependencies of this one-time creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setCenter(resolvedCenter);
  }, [ready, resolvedCenter.lat, resolvedCenter.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Markers are fully rebuilt on change: the sets here are small (a handful
  // of picks), and diffing them would be more code than it saves.
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const maps = window.google.maps;

    for (const m of markerObjectsRef.current) m.setMap(null);
    markerObjectsRef.current = [];

    const bounds = new maps.LatLngBounds();
    for (const marker of markers) {
      const isRanked = marker.rank !== undefined;
      const gm = new maps.Marker({
        map: mapRef.current,
        position: marker.position,
        title: marker.title,
        label: isRanked
          ? { text: String(marker.rank), color: '#ffffff', fontWeight: '700', fontSize: '12px' }
          : undefined,
        icon: isRanked
          ? {
              path: maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#0f766e',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }
          : {
              path: maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#94a3b8',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
            },
      });
      if (marker.onClick) gm.addListener('click', marker.onClick);
      markerObjectsRef.current.push(gm);
      bounds.extend(marker.position);
    }

    // Fit only when there is more than one point; fitting a single marker
    // zooms to street level and loses all context.
    if (markers.length > 1) mapRef.current.fitBounds(bounds, 48);
  }, [ready, markers]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    if (!polyline || polyline.length < 2) return;

    polylineRef.current = new window.google.maps.Polyline({
      map: mapRef.current,
      path: polyline,
      strokeColor: '#0f766e',
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
  }, [ready, polyline]);

  if (error) {
    const isKey = error instanceof MissingMapsKeyError;
    const isDisabled = error instanceof MapsApiNotEnabledError;
    return (
      <div
        style={{
          height,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-sunken)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-5)',
        }}
      >
        <EmptyState
          icon="map-pin-off"
          title={
            isKey ? 'Map not configured' : isDisabled ? 'Map API not enabled' : "Map couldn't load"
          }
          body={error.message}
        />
      </div>
    );
  }

  if (markers.length === 0 && !polyline && emptyLabel) {
    return (
      <div
        style={{
          height,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-sunken)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          {emptyLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map"
      style={{
        height,
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--surface-sunken)',
      }}
    />
  );
}
