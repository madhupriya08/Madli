import { describe, it, expect } from 'vitest';
import {
  buildDiscovery,
  spreadOutPicks,
  INITIAL_VISIBLE_PICKS,
  MAX_VISIBLE_PICKS,
  reviewDistanceScore,
} from './hybridPicks';
import type { GoogleCandidate } from '../lib/placesSearch';

const origin = { lat: 17.35, lng: 78.55 };

function candidate(id: string, opts: Partial<GoogleCandidate> = {}): GoogleCandidate {
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

describe('buildDiscovery — Phase 9 §3: "Most famous"', () => {
  it('drops the usual distance penalty — a far but genuinely famous place beats a merely-closer one', () => {
    const far = { lat: origin.lat + 2, lng: origin.lng };
    const famous = candidate('famous', { location: far, googleRating: 4.9, reviewCount: 5000 });
    const nearby = candidate('nearby', { location: origin, googleRating: 4.0, reviewCount: 60 });

    const withoutMostFamous = buildDiscovery({ origin, candidates: [famous, nearby] });
    expect(withoutMostFamous.ranked.map((r) => r.candidate.name)).toEqual(['nearby', 'famous']);

    const withMostFamous = buildDiscovery({
      origin,
      candidates: [famous, nearby],
      mostFamous: true,
    });
    expect(withMostFamous.ranked.map((r) => r.candidate.name)).toEqual(['famous', 'nearby']);
  });

  it('drops a thin-review place entirely once a genuinely well-reviewed one exists', () => {
    const thin = candidate('thin', { googleRating: 5.0, reviewCount: 5 });
    const real = candidate('real', { googleRating: 4.2, reviewCount: 200 });

    const result = buildDiscovery({ origin, candidates: [thin, real], mostFamous: true });
    expect(result.ranked.map((r) => r.candidate.name)).toEqual(['real']);
  });

  it('falls back to the full pool rather than returning nothing when no candidate clears the review floor', () => {
    const a = candidate('a', { googleRating: 4.5, reviewCount: 10 });
    const b = candidate('b', { googleRating: 4.0, reviewCount: 20 });

    const result = buildDiscovery({ origin, candidates: [a, b], mostFamous: true });
    expect(result.ranked).toHaveLength(2);
  });
});

/**
 * P12 §4: "suggestions and bridge tap are showing places on the same street
 * or very close by — the goal is the best places to visit, the must-trys."
 */
describe('buildDiscovery — P12 §4: three picks, not one street three times', () => {
  it('does not put two places from the same street in the top three when other streets are available', () => {
    // Three doors of the same street, all well reviewed, plus two places
    // elsewhere that score slightly lower.
    const sameStreet = ['sameA', 'sameB', 'sameC'].map((id) =>
      candidate(id, {
        address: 'Road No. 51, Jubilee Hills',
        googleRating: 4.8,
        reviewCount: 900,
      }),
    );
    const elsewhere = ['otherA', 'otherB'].map((id, i) =>
      candidate(id, {
        address: `${id} Street, Banjara Hills`,
        location: { lat: origin.lat + 0.02 * (i + 1), lng: origin.lng },
        googleRating: 4.5,
        reviewCount: 400,
      }),
    );

    const top3 = buildDiscovery({ origin, candidates: [...sameStreet, ...elsewhere] })
      .ranked.slice(0, 3)
      .map((r) => r.candidate.name);

    expect(top3).toContain('sameA');
    expect(top3).not.toContain('sameB');
    expect(top3).not.toContain('sameC');
  });

  it('drops nothing — a passed-over place still appears further down the list', () => {
    const candidates = ['a', 'b', 'c', 'd'].map((id) =>
      candidate(id, { address: 'One Street, Somewhere' }),
    );
    const result = buildDiscovery({ origin, candidates });

    expect(result.ranked).toHaveLength(4);
    expect(result.ranked.map((r) => r.candidate.name).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps a thin pool intact — spreading is a reordering, never a filter', () => {
    const picks = [
      { candidate: candidate('x'), location: origin },
      { candidate: candidate('y'), location: origin },
    ];
    expect(spreadOutPicks(picks)).toHaveLength(2);
  });
});
