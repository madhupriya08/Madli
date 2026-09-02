import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreCandidatesByHistory, getPersonalizedSuggestions } from './recommendations';
import type { GoogleCandidate } from '../lib/placesSearch';
import type { RankedGooglePlace } from './googleRankings';

/**
 * P5 §3 — the content-based MVP. Known inputs, expected ranking order: a
 * museum should outrank a night club for someone whose ranked history is
 * all museums and galleries, and the reverse for someone who loves clubs.
 */

const fetchMyGoogleRankingsMock = vi.fn();
vi.mock('./googleRankings', async () => {
  const actual = await vi.importActual<typeof import('./googleRankings')>('./googleRankings');
  return {
    ...actual,
    fetchMyGoogleRankings: (...args: unknown[]) => fetchMyGoogleRankingsMock(...args),
  };
});

function candidate(placeId: string, types: string[]): GoogleCandidate {
  return { placeId, name: placeId, address: '', location: { lat: 0, lng: 0 }, types };
}

function ranked(
  googlePlaceId: string,
  types: string[],
  tier: RankedGooglePlace['tier'],
  position: number,
): RankedGooglePlace {
  return {
    id: googlePlaceId,
    googlePlaceId,
    placeName: googlePlaceId,
    door: 'explore',
    tier,
    raterType: 'local',
    position,
    areaText: null,
    location: null,
    types,
  };
}

describe('scoreCandidatesByHistory', () => {
  it('scores a candidate zero with no ranking history at all', () => {
    const scores = scoreCandidatesByHistory([candidate('a', ['museum'])], []);
    expect(scores).toEqual([0]);
  });

  it('ranks a museum above a night club for someone who has loved museums', () => {
    const history = [ranked('past-1', ['museum'], 'loved', 1)];
    const scores = scoreCandidatesByHistory(
      [candidate('museum-candidate', ['museum']), candidate('club-candidate', ['night_club'])],
      history,
    );
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBe(0);
  });

  it('a disliked type actively suppresses similar candidates below zero', () => {
    const history = [ranked('past-1', ['night_club'], 'disliked', 1)];
    const scores = scoreCandidatesByHistory([candidate('club-candidate', ['night_club'])], history);
    expect(scores[0]).toBeLessThan(0);
  });

  it('weighs a #1-ranked entry more heavily than a bottom-of-the-list one', () => {
    const historyTopRanked = [
      ranked('top', ['museum'], 'loved', 1),
      ranked('mid', ['park'], 'loved', 2),
    ];
    const historyBottomRanked = [
      ranked('top', ['park'], 'loved', 1),
      ranked('mid', ['museum'], 'loved', 2),
    ];
    const scoreWhenFirst = scoreCandidatesByHistory(
      [candidate('c', ['museum'])],
      historyTopRanked,
    )[0];
    const scoreWhenSecond = scoreCandidatesByHistory(
      [candidate('c', ['museum'])],
      historyBottomRanked,
    )[0];
    expect(scoreWhenFirst).toBeGreaterThan(scoreWhenSecond);
  });

  it('loved counts for more than fine, for the same type', () => {
    const lovedScore = scoreCandidatesByHistory(
      [candidate('c', ['museum'])],
      [ranked('past', ['museum'], 'loved', 1)],
    )[0];
    const fineScore = scoreCandidatesByHistory(
      [candidate('c', ['museum'])],
      [ranked('past', ['museum'], 'fine', 1)],
    )[0];
    expect(lovedScore).toBeGreaterThan(fineScore);
  });
});

describe('getPersonalizedSuggestions', () => {
  beforeEach(() => {
    fetchMyGoogleRankingsMock.mockReset();
  });

  it('is a no-op for a Guest (no userId)', async () => {
    const candidates = [candidate('a', ['museum']), candidate('b', ['park'])];
    const result = await getPersonalizedSuggestions('', 'explore', candidates);
    expect(result).toBe(candidates);
    expect(fetchMyGoogleRankingsMock).not.toHaveBeenCalled();
  });

  it('is a true no-op (same order) for cold start — a signed-in User with no history yet', async () => {
    fetchMyGoogleRankingsMock.mockResolvedValue([]);
    const candidates = [candidate('a', ['museum']), candidate('b', ['park'])];
    const result = await getPersonalizedSuggestions('user-1', 'explore', candidates);
    expect(result).toEqual(candidates);
  });

  it('promotes a not-yet-ranked candidate matching loved history to the front', async () => {
    fetchMyGoogleRankingsMock.mockResolvedValue([ranked('past-1', ['museum'], 'loved', 1)]);
    const parkCandidate = candidate('park-1', ['park']);
    const museumCandidate = candidate('museum-1', ['museum']);
    const result = await getPersonalizedSuggestions('user-1', 'explore', [
      parkCandidate,
      museumCandidate,
    ]);
    expect(result[0]).toBe(museumCandidate);
    expect(result[1]).toBe(parkCandidate);
  });

  it('moves an already-ranked place to the end rather than dropping it', async () => {
    fetchMyGoogleRankingsMock.mockResolvedValue([ranked('already-ranked', ['museum'], 'loved', 1)]);
    const alreadyRanked = candidate('already-ranked', ['museum']);
    const newOne = candidate('new-one', ['park']);
    const result = await getPersonalizedSuggestions('user-1', 'explore', [alreadyRanked, newOne]);
    expect(result).toEqual([newOne, alreadyRanked]);
  });

  it('falls back to the original order if the history fetch fails', async () => {
    fetchMyGoogleRankingsMock.mockRejectedValue(new Error('network blip'));
    const candidates = [candidate('a', ['museum']), candidate('b', ['park'])];
    const result = await getPersonalizedSuggestions('user-1', 'explore', candidates);
    expect(result).toBe(candidates);
  });
});
