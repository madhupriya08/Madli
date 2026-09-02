import type { GoogleCandidate } from '../lib/placesSearch';
import { haversineMeters, type LatLng } from '../lib/searchState';

/**
 * Discovery is Google-only.
 *
 * Filters (door, area, radius, vibe, pets) go to Places. Candidates are then
 * ordered by Google rating × review volume, with a small distance penalty so
 * a 4.9 across town does not always beat a 4.6 next door.
 */

export const INITIAL_VISIBLE_PICKS = 3;
export const MAX_VISIBLE_PICKS = 5;

export interface RankedPick {
  kind: 'ranked';
  candidate: GoogleCandidate;
  location: LatLng;
}

export interface DiscoveryResult {
  ranked: RankedPick[];
}

export function emptyDiscovery(): DiscoveryResult {
  return { ranked: [] };
}

export interface BuildDiscoveryInput {
  candidates: GoogleCandidate[];
  origin: LatLng;
  /** Phase 9 §3: "Most famous" — see buildDiscovery's own comment. */
  mostFamous?: boolean;
}

/**
 * How much closeness is worth, per kilometre, against a review score that
 * tops out around 18 (a 4.8 with 5,000 reviews).
 *
 * P12 §4: this was 0.12, which inside a typical 3km radius is worth about
 * a third of a rating point — enough that the merely-nearest place kept
 * winning over the one people actually rate as a must-try. Halved: distance
 * still breaks ties between comparable places, but it no longer outvotes
 * being genuinely good.
 */
const DEFAULT_DISTANCE_PENALTY = 0.06;

/**
 * Higher is better: rating weighted by log(reviews), minus a distance
 * penalty. `distancePenalty` is 0 for Phase 9 §3's "Most famous" — someone
 * who explicitly asked for the most famous place wants the most famous
 * place, not the most famous place *near this exact spot*.
 */
export function reviewDistanceScore(
  candidate: GoogleCandidate,
  origin: LatLng,
  distancePenalty = DEFAULT_DISTANCE_PENALTY,
): number {
  const rating = candidate.googleRating ?? 0;
  const reviews = candidate.reviewCount ?? 0;
  const km = haversineMeters(origin, candidate.location) / 1000;
  return rating * Math.log10(reviews + 1) - km * distancePenalty;
}

/**
 * Phase 9 §3: "Most famous" should mean a real, well-reviewed place, not
 * just whichever candidate happens to have the most reviews among a
 * handful of obscure ones. If applying that floor would leave nothing
 * (a quiet area with no genuinely well-known place at all), falling back
 * to the full pool beats an honest-but-empty result — same principle as
 * this codebase's other narrowing filters (e.g. Phase 8 §6's budget
 * intersection).
 */
const MOST_FAMOUS_MIN_REVIEWS = 50;

/**
 * Two picks are "the same place twice" for spread purposes when they sit on
 * the same street or within a couple of hundred metres of each other.
 *
 * 150m is roughly one city block: close enough that walking between them is
 * the same stop, not a second one.
 */
const SAME_BLOCK_METERS = 150;

/** The street-ish head of a Google formatted address ("Road No. 51, Jubilee Hills, …"). */
function streetKey(address: string): string {
  return address.split(',')[0]?.trim().toLowerCase() ?? '';
}

/**
 * P12 §4: "suggestions and bridge tap are showing places on the same street
 * or very close by — the goal is the best places to visit, the must-trys."
 *
 * Google's text search happily returns four doors of the same food street,
 * and a pure score sort keeps all four, so the three visible picks were
 * often one block with three names. This spreads them: walk the
 * already-scored list and take the best candidate from each distinct street
 * and location cluster first, then append whatever was passed over so
 * nothing is ever dropped — a thin pool must still fill the list, and
 * "Show me two more" must still have something to show.
 *
 * Reordering only. Every candidate that came in comes out.
 */
export function spreadOutPicks<T extends { candidate: GoogleCandidate; location: LatLng }>(
  scored: T[],
): T[] {
  const spread: T[] = [];
  const passedOver: T[] = [];
  const streetsTaken = new Set<string>();

  for (const pick of scored) {
    const street = streetKey(pick.candidate.address);
    const tooClose = spread.some(
      (chosen) => haversineMeters(chosen.location, pick.location) < SAME_BLOCK_METERS,
    );
    if (tooClose || (street !== '' && streetsTaken.has(street))) {
      passedOver.push(pick);
      continue;
    }
    if (street !== '') streetsTaken.add(street);
    spread.push(pick);
  }

  return [...spread, ...passedOver];
}

export function buildDiscovery(input: BuildDiscoveryInput): DiscoveryResult {
  const wellReviewed = input.candidates.filter(
    (c) => (c.reviewCount ?? 0) >= MOST_FAMOUS_MIN_REVIEWS,
  );
  const pool = input.mostFamous && wellReviewed.length > 0 ? wellReviewed : input.candidates;
  const distancePenalty = input.mostFamous ? 0 : DEFAULT_DISTANCE_PENALTY;

  const picks: RankedPick[] = pool.map((candidate) => ({
    kind: 'ranked' as const,
    candidate,
    location: candidate.location,
  }));

  picks.sort(
    (a, b) =>
      reviewDistanceScore(b.candidate, input.origin, distancePenalty) -
      reviewDistanceScore(a.candidate, input.origin, distancePenalty),
  );

  return { ranked: spreadOutPicks(picks) };
}

export function pickReason(candidate: GoogleCandidate, vibe: string | null): string {
  if (candidate.editorialSummary) return candidate.editorialSummary;
  const bits: string[] = [];
  if (candidate.googleRating != null) {
    bits.push(`${candidate.googleRating.toFixed(1)} on Google`);
  }
  if (candidate.reviewCount) {
    bits.push(
      `${candidate.reviewCount.toLocaleString()} review${candidate.reviewCount === 1 ? '' : 's'}`,
    );
  }
  if (vibe) bits.push(`matches ${vibe.toLowerCase()}`);
  return bits.length > 0 ? bits.join(' · ') : 'Matches the filters you chose.';
}
