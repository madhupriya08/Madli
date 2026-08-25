/// <reference types="google.maps" />
import { loadGoogleMaps, asMapsError } from './googleMaps';
import type { LatLng } from './searchState';

/**
 * Travel time and route geometry for S21.
 *
 * Uses the Maps JavaScript `DirectionsService` rather than the Routes REST
 * API on purpose: it returns the same two things this screen needs (a
 * duration and a decodable polyline) and it is covered by the browser key
 * already in the bundle. The REST Routes API would need a server-side key,
 * which means an Edge Function and a second secret to hold — real cost for
 * no user-visible gain here. If server-side routing is ever needed (batch
 * ETAs, ranking by travel time), that is the point to add the function.
 */

export interface RouteResult {
  /** "22 min", straight from Google — not recomputed or rounded further. */
  durationText: string;
  /** "9.4 km". */
  distanceText: string;
  /** Decoded path, ready to hand to a map polyline. */
  path: LatLng[];
}

export async function fetchRoute(origin: LatLng, destination: LatLng): Promise<RouteResult> {
  const maps = await loadGoogleMaps();

  try {
    const { DirectionsService, DirectionsStatus } = (await maps.importLibrary(
      'routes',
    )) as google.maps.RoutesLibrary;

    const service = new DirectionsService();
    const response = await service.route({
      origin,
      destination,
      travelMode: maps.TravelMode.DRIVING,
    });

    const route = response.routes[0];
    const leg = route?.legs[0];
    if (!leg) throw new Error(String(DirectionsStatus.ZERO_RESULTS));

    return {
      durationText: leg.duration?.text ?? 'Unknown',
      distanceText: leg.distance?.text ?? '',
      path: (route.overview_path ?? []).map((p) => ({ lat: p.lat(), lng: p.lng() })),
    };
  } catch (err) {
    throw asMapsError(err, 'Directions/Routes API');
  }
}

/** Straight-line distance in metres — used only to sort or filter, never shown as travel distance. */
export { haversineMeters } from './searchState';
