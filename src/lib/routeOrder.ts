import { haversineMeters, type LatLng } from './searchState';

/**
 * Phase 6 §9: shortest visiting order for a multi-stop plan, starting from a
 * fixed origin (the plan's anchor — the outing's first, already-settled
 * point, never itself reordered).
 *
 * Exact, brute-force search over every permutation, not a heuristic — a real
 * outing tops out at a handful of stops, so this stays fast (branch-and-bound
 * pruning drops any partial route already longer than the best complete one
 * found so far). This is a *display*-order computation: callers use it to
 * decide what order to show stops in and what order to hand them to Google
 * Maps for directions, not to rewrite any stored position.
 */
export function optimalStopOrder<T>(
  origin: LatLng,
  stops: readonly T[],
  locationOf: (stop: T) => LatLng,
): T[] {
  if (stops.length <= 1) return [...stops];

  let bestOrder = [...stops];
  let bestDistance = Infinity;

  function search(remaining: T[], chosen: T[], distanceSoFar: number, from: LatLng): void {
    if (distanceSoFar >= bestDistance) return;
    if (remaining.length === 0) {
      bestDistance = distanceSoFar;
      bestOrder = chosen;
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i];
      const nextLocation = locationOf(next);
      const legDistance = haversineMeters(from, nextLocation);
      const rest = remaining.slice(0, i).concat(remaining.slice(i + 1));
      search(rest, [...chosen, next], distanceSoFar + legDistance, nextLocation);
    }
  }

  search([...stops], [], 0, origin);
  return bestOrder;
}
