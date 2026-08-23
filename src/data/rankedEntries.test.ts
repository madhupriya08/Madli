// Phase 3: logRankedVisit/getVisibleRankedEntries/getAllRankedEntries now
// call the real Supabase RPC/view (fn_log_ranked_visit,
// ranked_entries_visible, ranked_entries) instead of an in-memory
// reimplementation of the ranking algorithm — the algorithm itself lives
// entirely in Postgres now, verified for real against the live project (see
// PHASE_3_COMPLETION_REPORT.md §4: first-in-category, both pairwise
// directions, and position-shift-on-insert were each confirmed via a real
// RPC call, not a TypeScript unit test). The only logic still living in this
// module — and still meaningfully unit-testable without a network call — is
// `pickComparisonTargets`, now a pure function over an already-fetched
// entries array.
import { describe, it, expect } from 'vitest';
import { pickComparisonTargets } from './rankedEntries';
import type { RankedEntry } from '../fixtures/mockDb';

function entry(placeId: string, position: number): RankedEntry {
  return {
    id: `re-${placeId}`,
    userId: 'u1',
    placeId,
    categoryId: 'cat-1',
    tier: 'loved',
    position,
  };
}

describe('pickComparisonTargets', () => {
  it('offers no target for an empty list', () => {
    expect(pickComparisonTargets([])).toEqual({});
  });

  it('offers only the current #1 when there are fewer than 3 entries', () => {
    const entries = [entry('p1', 1), entry('p2', 2)];
    expect(pickComparisonTargets(entries)).toEqual({ first: 'p1' });
  });

  it('offers the current #1 plus the median entry once there are 3+ entries', () => {
    const entries = [entry('p1', 1), entry('p2', 2), entry('p3', 3)];
    expect(pickComparisonTargets(entries)).toEqual({ first: 'p1', second: 'p2' });
  });

  it('sorts by position first, regardless of array order', () => {
    const entries = [entry('p3', 3), entry('p1', 1), entry('p2', 2)];
    expect(pickComparisonTargets(entries)).toEqual({ first: 'p1', second: 'p2' });
  });

  it('omits the median when it would duplicate the first target', () => {
    // 5 entries, median index 2 -> same as first only if list has 1 unique
    // position; construct a case where median resolves to the same place as
    // first is impossible with distinct positions, so instead cover the
    // explicit dedupe branch via a manually-crafted duplicate placeId.
    const entries = [entry('p1', 1), entry('p1', 2), entry('p3', 3)];
    const result = pickComparisonTargets(entries);
    expect(result.first).toBe('p1');
    expect(result.second).toBeUndefined();
  });
});
