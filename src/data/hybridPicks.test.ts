import { describe, it, expect } from 'vitest';
import {
  buildDiscovery,
  INITIAL_VISIBLE_PICKS,
  MAX_VISIBLE_PICKS,
  reviewDistanceScore,
} from './hybridPicks';
import type { GoogleCandidate } from '../lib/placesSearch';

const origin = { lat: 17.35, lng: 78.55 };

function candidate(
  id: string,
  opts: Partial<GoogleCandidate> = {},
): GoogleCandidate {
  return {
    placeId: `g-${id}`,
    name: id,
    address: `${id}, Kothapet`,
    location: origin,
    types: ['restaurant'],
    ...opts,
  };
}

describe('buildDiscovery — Google candidates only', () => {
  it('keeps a pool larger than the initial three so two more can append', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => candidate(id));
    const result = buildDiscovery({ candidates, origin });

    expect(result.ranked.length).toBeGreaterThan(INITIAL_VISIBLE_PICKS);
    expect(result.ranked.length).toBeGreaterThanOrEqual(MAX_VISIBLE_PICKS);
  });

  it('ranks higher Google ratings with more reviews above thin ratings', () => {
    const result = buildDiscovery({
      origin,
      candidates: [
        candidate('thin', { googleRating: 4.9, reviewCount: 3 }),
        candidate('loved', { googleRating: 4.6, reviewCount: 800 }),
      ],
    });

    expect(result.ranked.map((r) => r.candidate.name)).toEqual(['loved', 'thin']);
    expect(reviewDistanceScore(result.ranked[0].candidate, origin)).toBeGreaterThan(
      reviewDistanceScore(result.ranked[1].candidate, origin),
    );
  });
});
