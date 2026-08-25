// The product rule, pinned: Google finds, Madli ranks, never more than three.
// buildDiscovery is pure, so every branch is testable without a network.
import { describe, it, expect } from 'vitest';
import { buildDiscovery, buildDiscoveryFromCatalogue, MAX_RANKED_PICKS } from './hybridPicks';
import type { Place } from '../fixtures/places';
import type { GoogleCandidate } from '../lib/placesSearch';

function place(over: Partial<Place> & { id: string; locals: number }): Place {
  return {
    slug: `s/${over.id}`,
    name: over.id,
    type: 'eat',
    vibe: '',
    categoryId: 'c1',
    neighborhood: 'N',
    areaId: null,
    priceLevel: '',
    reason: 'because',
    history: null,
    tags: [],
    gapTone: 'clear',
    gapPoints: 0,
    visitors: 0,
    drive: null,
    outsideFameRank: null,
    isActive: true,
    lat: null,
    lng: null,
    googlePlaceId: `g-${over.id}`,
    address: '',
    phone: '',
    hours: '',
    gem: false,
    ...over,
  } as Place;
}

function candidate(id: string): GoogleCandidate {
  return {
    placeId: `g-${id}`,
    name: id,
    address: '',
    location: { lat: 17.4, lng: 78.4 },
    types: ['restaurant'],
  };
}

describe('buildDiscovery — Google finds, Madli ranks', () => {
  it('never returns more than three ranked picks, however many qualify', () => {
    const places = ['a', 'b', 'c', 'd', 'e'].map((id, i) => place({ id, locals: 100 + i }));
    const result = buildDiscovery({
      candidates: places.map((p) => candidate(p.id)),
      places,
      threshold: 50,
    });

    expect(result.ranked).toHaveLength(MAX_RANKED_PICKS);
    // The rest are not dropped — they are what "show me two more" cycles into.
    expect(result.rankedOverflow).toHaveLength(2);
  });

  it('leaves a place below the threshold unranked, with no invented rank or reason', () => {
    const thin = place({ id: 'thin', locals: 12 });
    const result = buildDiscovery({
      candidates: [candidate('thin')],
      places: [thin],
      threshold: 50,
    });

    expect(result.ranked).toHaveLength(0);
    expect(result.unranked).toHaveLength(1);
    expect(result.unranked[0].reason).toBe('below_threshold');
    expect(result.unranked[0].place?.locals).toBe(12);
  });

  it('shows a Google place Madli has never seen as browse-only, not as a pick', () => {
    const result = buildDiscovery({
      candidates: [candidate('stranger')],
      places: [],
      threshold: 50,
    });

    expect(result.ranked).toHaveLength(0);
    expect(result.unranked[0].reason).toBe('not_in_catalogue');
    expect(result.unranked[0].place).toBeUndefined();
  });

  it('orders by local ratings, not by anything Google supplies', () => {
    const places = [
      place({ id: 'few', locals: 60 }),
      place({ id: 'many', locals: 900 }),
      place({ id: 'mid', locals: 300 }),
    ];
    // Google's order is deliberately the reverse of Madli's.
    const result = buildDiscovery({
      candidates: [candidate('few'), candidate('mid'), candidate('many')],
      places,
      threshold: 50,
    });

    expect(result.ranked.map((r) => r.place.id)).toEqual(['many', 'mid', 'few']);
  });

  it('honours the live threshold rather than a hardcoded 50', () => {
    const p = place({ id: 'a', locals: 30 });
    const candidates = [candidate('a')];

    expect(buildDiscovery({ candidates, places: [p], threshold: 50 }).ranked).toHaveLength(0);
    expect(buildDiscovery({ candidates, places: [p], threshold: 25 }).ranked).toHaveLength(1);
  });

  it('drops rejected and delisted places without promoting them to unranked', () => {
    const rejected = place({ id: 'rejected', locals: 100 });
    const delisted = place({ id: 'delisted', locals: 100, isActive: false });
    const result = buildDiscovery({
      candidates: [candidate('rejected'), candidate('delisted')],
      places: [rejected, delisted],
      rejectedPlaceIds: new Set(['rejected']),
      threshold: 50,
    });

    expect(result.ranked).toHaveLength(0);
    expect(result.unranked).toHaveLength(0);
  });
});

describe('buildDiscoveryFromCatalogue — the no-Google fallback', () => {
  it('still applies the door, the threshold and the cap of three', () => {
    const places = [
      ...['a', 'b', 'c', 'd'].map((id) => place({ id, locals: 100 })),
      place({ id: 'thin', locals: 5 }),
      place({ id: 'other-door', locals: 500, type: 'explore' }),
    ];
    const result = buildDiscoveryFromCatalogue(places, 'eat', undefined, 50);

    expect(result.ranked).toHaveLength(MAX_RANKED_PICKS);
    expect(result.ranked.every((r) => r.place.type === 'eat')).toBe(true);
    expect(result.ranked.some((r) => r.place.id === 'thin')).toBe(false);
  });
});
