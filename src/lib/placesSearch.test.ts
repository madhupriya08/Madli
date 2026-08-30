import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCandidates } from './placesSearch';

/**
 * P5 §2: the reproduced bug — Explore, in a real neighbourhood with real
 * museums/landmarks/galleries but few places literally typed "park", came
 * back with zero results while Eat (same area, same other filters) did not.
 *
 * Root cause: the Places API (New) Text Search request accepts exactly one
 * `includedType`, not a list, and the code was sending
 * `includedTypesFor(input)[0]` — always "park", the first entry in Explore's
 * six-type list — which structurally excluded the other five types (museum,
 * art_gallery, tourist_attraction, historical_landmark, night_club)
 * regardless of what the free-text query asked for. These tests pin the
 * fix: `includedType` is only ever sent when the door's real candidate set
 * is genuinely one type (Eat, always "restaurant"); Explore relies on the
 * free-text query and Google's own relevance ranking instead of an
 * incorrect structural narrow.
 */

const searchByTextMock = vi.fn();

vi.mock('./googleMaps', () => ({
  loadGoogleMaps: () =>
    Promise.resolve({
      importLibrary: async (lib: string) => {
        if (lib !== 'places') throw new Error(`unexpected library ${lib}`);
        return { Place: { searchByText: (...args: unknown[]) => searchByTextMock(...args) } };
      },
      LatLng: class {
        constructor(
          public lat: number,
          public lng: number,
        ) {}
      },
    }),
  asMapsError: (err: unknown) => (err instanceof Error ? err : new Error(String(err))),
  getMapsApiKey: () => 'fake-key',
}));

describe('searchCandidates — includedType', () => {
  beforeEach(() => {
    searchByTextMock.mockReset();
    searchByTextMock.mockResolvedValue({ places: [] });
  });

  it('sends "restaurant" for Eat, the one type that domain actually is', async () => {
    await searchCandidates({
      door: 'eat',
      center: { lat: 17.4, lng: 78.4 },
      radiusMeters: 5000,
    });
    const request = searchByTextMock.mock.calls[0][0];
    expect(request.includedType).toBe('restaurant');
  });

  it('omits includedType for Explore with no area-type narrow — six real types, not just "park"', async () => {
    await searchCandidates({
      door: 'explore',
      center: { lat: 40.735, lng: -74.002 },
      radiusMeters: 5000,
    });
    const request = searchByTextMock.mock.calls[0][0];
    expect(request.includedType).toBeUndefined();
  });

  it('omits includedType for Explore narrowed to Outdoor — three types, still not one', async () => {
    await searchCandidates({
      door: 'explore',
      center: { lat: 40.735, lng: -74.002 },
      radiusMeters: 5000,
      areaType: 'Outdoor',
    });
    const request = searchByTextMock.mock.calls[0][0];
    expect(request.includedType).toBeUndefined();
  });

  it('omits includedType for Explore narrowed to Indoor — three types, still not one', async () => {
    await searchCandidates({
      door: 'explore',
      center: { lat: 40.735, lng: -74.002 },
      radiusMeters: 5000,
      areaType: 'Indoor',
    });
    const request = searchByTextMock.mock.calls[0][0];
    expect(request.includedType).toBeUndefined();
  });
});

/**
 * P8 §8: with no single structural includedType sent for Explore (the P5
 * §2 fix above), Google's free-text relevance ranking for "places to visit
 * in X" can still hand back a genuinely food-typed place — a well-known
 * restaurant matches that text too. These pin the client-side backstop:
 * dropped by its real `types`, after the fact, rather than risk emptying
 * Explore out again with a structural request.
 */
function place(overrides: { id: string; types: string[] }) {
  return {
    id: overrides.id,
    displayName: overrides.id,
    formattedAddress: '',
    location: { lat: () => 40.735, lng: () => -74.002 },
    types: overrides.types,
  };
}

describe('searchCandidates — drops the other door\'s places (P8 §8)', () => {
  beforeEach(() => {
    searchByTextMock.mockReset();
  });

  it('drops a restaurant from Explore results even though Google returned it', async () => {
    searchByTextMock.mockResolvedValue({
      places: [
        place({ id: 'landmark-1', types: ['tourist_attraction', 'point_of_interest'] }),
        place({ id: 'restaurant-1', types: ['restaurant', 'food', 'point_of_interest'] }),
      ],
    });
    const results = await searchCandidates({
      door: 'explore',
      center: { lat: 40.735, lng: -74.002 },
      radiusMeters: 5000,
      clipToRadius: false,
    });
    expect(results.map((c) => c.placeId)).toEqual(['landmark-1']);
  });

  it('keeps a cafe/bakery-typed place out of Explore too', async () => {
    searchByTextMock.mockResolvedValue({
      places: [
        place({ id: 'museum-1', types: ['museum'] }),
        place({ id: 'cafe-1', types: ['cafe'] }),
        place({ id: 'bakery-1', types: ['bakery'] }),
      ],
    });
    const results = await searchCandidates({
      door: 'explore',
      center: { lat: 40.735, lng: -74.002 },
      radiusMeters: 5000,
      clipToRadius: false,
    });
    expect(results.map((c) => c.placeId)).toEqual(['museum-1']);
  });

  it('never drops a restaurant from Eat results (this filter is Explore-only)', async () => {
    searchByTextMock.mockResolvedValue({
      places: [place({ id: 'restaurant-1', types: ['restaurant', 'food'] })],
    });
    const results = await searchCandidates({
      door: 'eat',
      center: { lat: 40.735, lng: -74.002 },
      radiusMeters: 5000,
      clipToRadius: false,
    });
    expect(results.map((c) => c.placeId)).toEqual(['restaurant-1']);
  });
});
