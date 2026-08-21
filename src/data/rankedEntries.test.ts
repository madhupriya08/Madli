import { describe, it, expect, beforeEach } from 'vitest';
import { mockDb } from '../fixtures/mockDb';
import {
  logRankedVisit,
  getVisibleRankedEntries,
  getAllRankedEntries,
  pickComparisonTargets,
} from './rankedEntries';

// biryaniAndKebab, all isActive: true except f10.
const HOTEL_SHADAB = '00000000-0000-0000-0000-0000000000f1';
const CAFE_BAHAR = '00000000-0000-0000-0000-0000000000f5';
const RAYALASEEMA = '00000000-0000-0000-0000-0000000000f7';
const MEHFIL = '00000000-0000-0000-0000-0000000000f9';
const DECCAN_GRILL_HOUSE_INACTIVE = '00000000-0000-0000-0000-0000000000f10';
const USER = 'test-user-1';

beforeEach(() => {
  mockDb.rankedEntries = [];
});

describe('logRankedVisit — first in category', () => {
  it('lands the first entry in a category at position 1 with no comparison required', async () => {
    const result = await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    expect(result.landedPosition).toBe(1);
    expect(result.totalInCategory).toBe(1);
  });

  it('rejects a second entry in the same category with no comparison target', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    await expect(logRankedVisit(USER, CAFE_BAHAR, 'loved')).rejects.toThrow(
      /comparison is required/,
    );
  });
});

describe('logRankedVisit — pairwise comparison, both directions', () => {
  it('inserts the new place above the comparison target when preferred', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    const result = await logRankedVisit(USER, CAFE_BAHAR, 'loved', {
      placeId: HOTEL_SHADAB,
      preferredNew: true,
    });
    expect(result.landedPosition).toBe(1);
    const entries = await getVisibleRankedEntries(USER);
    expect(entries.find((e) => e.placeId === CAFE_BAHAR)?.position).toBe(1);
    expect(entries.find((e) => e.placeId === HOTEL_SHADAB)?.position).toBe(2);
  });

  it('inserts the new place below the comparison target when not preferred', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    const result = await logRankedVisit(USER, CAFE_BAHAR, 'loved', {
      placeId: HOTEL_SHADAB,
      preferredNew: false,
    });
    expect(result.landedPosition).toBe(2);
    const entries = await getVisibleRankedEntries(USER);
    expect(entries.find((e) => e.placeId === HOTEL_SHADAB)?.position).toBe(1);
    expect(entries.find((e) => e.placeId === CAFE_BAHAR)?.position).toBe(2);
  });

  it('shifts every entry at or below the landing position down by one', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    await logRankedVisit(USER, CAFE_BAHAR, 'loved', { placeId: HOTEL_SHADAB, preferredNew: false });
    // Category is now [Shadab(1), Bahar(2)]. Insert Rayalaseema between them.
    await logRankedVisit(USER, RAYALASEEMA, 'loved', {
      placeId: HOTEL_SHADAB,
      preferredNew: false,
    });
    const entries = await getVisibleRankedEntries(USER);
    expect(entries.find((e) => e.placeId === HOTEL_SHADAB)?.position).toBe(1);
    expect(entries.find((e) => e.placeId === RAYALASEEMA)?.position).toBe(2);
    expect(entries.find((e) => e.placeId === CAFE_BAHAR)?.position).toBe(3);
  });

  it('rejects a comparison target that is not in the user’s category list', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    await expect(
      logRankedVisit(USER, CAFE_BAHAR, 'loved', { placeId: MEHFIL, preferredNew: true }),
    ).rejects.toThrow(/not in this user's category list/);
  });
});

describe('logRankedVisit — validation', () => {
  it('rejects logging the same place twice for the same user', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    await expect(logRankedVisit(USER, HOTEL_SHADAB, 'fine')).rejects.toThrow(/already ranked/);
  });

  it('rejects an inactive place', async () => {
    await expect(logRankedVisit(USER, DECCAN_GRILL_HOUSE_INACTIVE, 'loved')).rejects.toThrow(
      /not found or inactive/,
    );
  });
});

describe('disliked tier — still logs, but excluded from the visible list', () => {
  it('records a disliked entry in the full list but hides it from ranked_entries_visible', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    await logRankedVisit(USER, CAFE_BAHAR, 'disliked', {
      placeId: HOTEL_SHADAB,
      preferredNew: false,
    });

    const all = await getAllRankedEntries(USER);
    expect(all).toHaveLength(2);
    expect(all.some((e) => e.placeId === CAFE_BAHAR && e.tier === 'disliked')).toBe(true);

    const visible = await getVisibleRankedEntries(USER);
    expect(visible).toHaveLength(1);
    expect(visible.some((e) => e.placeId === CAFE_BAHAR)).toBe(false);
  });
});

describe('pickComparisonTargets', () => {
  it('offers no target for an empty category', () => {
    expect(pickComparisonTargets(USER, 'nonexistent-category')).toEqual({});
  });

  it('offers only the current #1 when the category has fewer than 3 entries', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    const place = (await import('../fixtures/places')).placeById(HOTEL_SHADAB)!;
    const targets = pickComparisonTargets(USER, place.categoryId);
    expect(targets).toEqual({ first: HOTEL_SHADAB });
  });

  it('offers the current #1 plus the median entry once the category has 3+ entries', async () => {
    await logRankedVisit(USER, HOTEL_SHADAB, 'loved');
    await logRankedVisit(USER, CAFE_BAHAR, 'loved', { placeId: HOTEL_SHADAB, preferredNew: false });
    await logRankedVisit(USER, RAYALASEEMA, 'loved', {
      placeId: CAFE_BAHAR,
      preferredNew: false,
    });
    // Category order: Shadab(1), Bahar(2), Rayalaseema(3).
    const place = (await import('../fixtures/places')).placeById(HOTEL_SHADAB)!;
    const targets = pickComparisonTargets(USER, place.categoryId);
    expect(targets.first).toBe(HOTEL_SHADAB);
    expect(targets.second).toBe(CAFE_BAHAR);
  });
});
