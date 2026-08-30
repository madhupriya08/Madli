import { describe, it, expect } from 'vitest';
import { optimalStopOrder } from './routeOrder';

/**
 * Phase 6 §9: verified against known configurations where the shortest order
 * is obvious by hand (stops laid out along one line of longitude, so
 * nearest-first is trivially optimal) — not just trusted because the search
 * looks right.
 */
describe('optimalStopOrder', () => {
  it('orders 3 stops nearest-first along a line, not the order they were stored in', () => {
    const origin = { lat: 0, lng: 0 };
    const stops = [
      { name: 'Far', lat: 10, lng: 0 },
      { name: 'Near', lat: 1, lng: 0 },
      { name: 'Middle', lat: 2, lng: 0 },
    ];

    const ordered = optimalStopOrder(origin, stops, (s) => ({ lat: s.lat, lng: s.lng }));

    expect(ordered.map((s) => s.name)).toEqual(['Near', 'Middle', 'Far']);
  });

  it('a 4-stop plan whose stored order zigzags gets sorted into two near-then-far pairs', () => {
    const origin = { lat: 17.4, lng: 78.4 };
    // Stored order deliberately zigzags far/near/far/near.
    const stops = [
      { name: 'C', lat: 17.5, lng: 78.4 },
      { name: 'A', lat: 17.41, lng: 78.4 },
      { name: 'D', lat: 17.52, lng: 78.4 },
      { name: 'B', lat: 17.42, lng: 78.4 },
    ];

    const ordered = optimalStopOrder(origin, stops, (s) => ({ lat: s.lat, lng: s.lng }));

    expect(ordered.map((s) => s.name)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('a single stop is returned unchanged — nothing to order', () => {
    const origin = { lat: 0, lng: 0 };
    const stops = [{ name: 'Solo', lat: 5, lng: 5 }];

    expect(optimalStopOrder(origin, stops, (s) => ({ lat: s.lat, lng: s.lng }))).toEqual(stops);
  });

  it('an empty list is returned unchanged', () => {
    const origin = { lat: 0, lng: 0 };
    expect(optimalStopOrder(origin, [], () => origin)).toEqual([]);
  });
});
