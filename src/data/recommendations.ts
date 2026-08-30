import type { GoogleCandidate } from '../lib/placesSearch';
import type { Door } from '../lib/searchState';
import { fetchMyGoogleRankings, type RankedGooglePlace, type RankTier } from './googleRankings';

/**
 * P5 §3 — recommendation architecture.
 *
 * Three options were on the table:
 *
 *  - Content-based scoring (what this file does): score candidates by
 *    tag/category overlap with what the person has ranked loved/fine,
 *    weighted by where those entries sit in their ranked list. Deterministic,
 *    fast, no external dependency — the right starting point at this
 *    catalogue's scale (16 seeded places, a handful of test accounts, and
 *    discovery itself is 100% live Google data with no local corpus to
 *    train or embed against).
 *  - LLM-assisted re-ranking/reasoning: pass ranking history + candidate
 *    metadata to an LLM for a shortlist and a personalized one-line reason.
 *    Real latency/cost/external-dependency trade-offs, and needs care to
 *    avoid inventing facts about a place beyond what Google returned — a
 *    genuine option, but a deliberate choice to make (new API key/config),
 *    not one to wire in silently. Not built here.
 *  - Collaborative filtering / embeddings: the right long-term direction
 *    once there is real user volume — not worth building against today's
 *    scale. Noted as a future direction only.
 *
 * This implements the content-based MVP behind `getPersonalizedSuggestions`,
 * a clean, swappable seam — the same mock-data-to-real-data seam pattern
 * this project has used throughout — so an LLM-assisted layer could replace
 * or augment the scoring inside this same function later without every
 * caller changing.
 */

const TIER_WEIGHT: Record<RankTier, number> = {
  loved: 1,
  fine: 0.5,
  // A real negative signal, not just "ignored" — similar candidates to a
  // place someone actively disliked should be suppressed, not left neutral.
  disliked: -0.75,
};

/**
 * How much each Google place `type` should count toward a candidate's
 * score, built from one person's own ranking history in one door.
 *
 * Weighted by tier (loved counts more than fine, disliked counts negative)
 * and by where the entry sits in their list — first-ranked places carry
 * more signal than fifteenth-ranked ones, decaying linearly to zero at the
 * bottom of the list.
 */
function typeAffinity(history: RankedGooglePlace[]): Map<string, number> {
  const weights = new Map<string, number>();
  const total = history.length;
  if (total === 0) return weights;

  for (const entry of history) {
    const positionWeight = Math.max(0, 1 - (entry.position - 1) / total);
    const signal = TIER_WEIGHT[entry.tier] * positionWeight;
    for (const type of entry.types) {
      weights.set(type, (weights.get(type) ?? 0) + signal);
    }
  }
  return weights;
}

/** Higher is better; 0 for a candidate with no type overlap with the history at all. */
export function scoreCandidatesByHistory(
  candidates: GoogleCandidate[],
  history: RankedGooglePlace[],
): number[] {
  const affinity = typeAffinity(history);
  return candidates.map((candidate) =>
    candidate.types.reduce((sum, type) => sum + (affinity.get(type) ?? 0), 0),
  );
}

/**
 * Re-orders `candidates` by content-based affinity with the signed-in
 * person's own ranking history in this door — the primary input this
 * recommender uses, per P5 §3, rather than onboarding answers considered in
 * isolation.
 *
 * A stable sort on top of whatever order `candidates` already arrived in
 * (review/distance for discovery, review-count for onboarding): a candidate
 * with no affinity signal keeps its existing place rather than being
 * shuffled, so cold-start (no history yet) is a true no-op, not a
 * regression.
 *
 * Already-ranked places are moved to the end rather than dropped — someone
 * might genuinely want to see a place they have already been to again — so
 * the reordering only promotes genuinely new suggestions.
 */
export async function getPersonalizedSuggestions(
  userId: string,
  door: Door,
  candidates: GoogleCandidate[],
): Promise<GoogleCandidate[]> {
  if (!userId || candidates.length === 0) return candidates;

  let history: RankedGooglePlace[];
  try {
    history = await fetchMyGoogleRankings(door);
  } catch {
    // Best-effort — a failed history fetch must not block showing candidates
    // in their existing (review/distance) order at all.
    return candidates;
  }
  if (history.length === 0) return candidates;

  const rankedIds = new Set(history.map((h) => h.googlePlaceId));
  const notYetRanked = candidates.filter((c) => !rankedIds.has(c.placeId));
  const alreadyRanked = candidates.filter((c) => rankedIds.has(c.placeId));
  if (notYetRanked.length === 0) return candidates;

  const scores = scoreCandidatesByHistory(notYetRanked, history);
  const withScores = notYetRanked.map((candidate, i) => ({ candidate, score: scores[i] }));
  withScores.sort((a, b) => b.score - a.score);

  return [...withScores.map((w) => w.candidate), ...alreadyRanked];
}
