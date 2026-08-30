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
}

/** Higher is better: rating weighted by log(reviews), minus km. */
export function reviewDistanceScore(candidate: GoogleCandidate, origin: LatLng): number {
  const rating = candidate.googleRating ?? 0;
  const reviews = candidate.reviewCount ?? 0;
  const km = haversineMeters(origin, candidate.location) / 1000;
  return rating * Math.log10(reviews + 1) - km * 0.12;
}

export function buildDiscovery(input: BuildDiscoveryInput): DiscoveryResult {
  const picks: RankedPick[] = input.candidates.map((candidate) => ({
    kind: 'ranked' as const,
    candidate,
    location: candidate.location,
  }));

  picks.sort(
    (a, b) =>
      reviewDistanceScore(b.candidate, input.origin) -
      reviewDistanceScore(a.candidate, input.origin),
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
