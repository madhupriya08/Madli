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
 * Higher is better: rating weighted by log(reviews), minus a distance
 * penalty. `distancePenalty` is 0 for Phase 9 §3's "Most famous" — someone
 * who explicitly asked for the most famous place wants the most famous
 * place, not the most famous place *near this exact spot*.
 */
export function reviewDistanceScore(
  candidate: GoogleCandidate,
  origin: LatLng,
  distancePenalty = 0.12,
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

export function buildDiscovery(input: BuildDiscoveryInput): DiscoveryResult {
  const wellReviewed = input.candidates.filter(
    (c) => (c.reviewCount ?? 0) >= MOST_FAMOUS_MIN_REVIEWS,
  );
  const pool =
    input.mostFamous && wellReviewed.length > 0 ? wellReviewed : input.candidates;
  const distancePenalty = input.mostFamous ? 0 : 0.12;

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

  return { ranked: picks };
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
