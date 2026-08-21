// Mirrors Phase 1's fn_log_ranked_visit Postgres function (supabase/migrations/
// 20260820100500_ranked_entries.sql) exactly: same first-in-category path,
// same single/double comparison landing logic, same position semantics
// (scoped per user+category, not per-tier). Comparison-target selection (which
// existing entry to offer) is a Phase 2 UX decision Phase 1 left open — see
// pickComparisonTarget below for the choice made and why.
//
// TODO(phase-3): replace this module's body with `supabase.rpc('fn_log_ranked_visit', {...})`
// and `supabase.from('ranked_entries_visible').select()`, keeping the same
// function signatures so call sites in screens/ don't change.
import { mockDb, type RankedEntry, type Tier } from '../fixtures/mockDb';
import { placeById } from '../fixtures/places';

export interface ComparisonInput {
  placeId: string;
  preferredNew: boolean;
}

export interface LogRankedVisitResult {
  entryId: string;
  landedPosition: number;
  totalInCategory: number;
}

export async function logRankedVisit(
  userId: string,
  placeId: string,
  tier: Tier,
  compare1?: ComparisonInput,
  compare2?: ComparisonInput,
): Promise<LogRankedVisitResult> {
  const place = placeById(placeId);
  if (!place || !place.isActive) throw new Error(`place ${placeId} not found or inactive`);

  if (mockDb.rankedEntries.some((e) => e.userId === userId && e.placeId === placeId)) {
    throw new Error(`place ${placeId} is already ranked for this user`);
  }

  const categoryId = place.categoryId;
  const existing = mockDb.rankedEntries
    .filter((e) => e.userId === userId && e.categoryId === categoryId)
    .sort((a, b) => a.position - b.position);

  let insertPosition: number;

  if (existing.length === 0) {
    insertPosition = 1;
  } else {
    if (!compare1)
      throw new Error(
        `a comparison is required when category already has entries (${existing.length} existing)`,
      );
    const pos1 = existing.find((e) => e.placeId === compare1.placeId)?.position;
    if (pos1 == null)
      throw new Error(`comparison place ${compare1.placeId} is not in this user's category list`);

    insertPosition = compare1.preferredNew ? pos1 : pos1 + 1;

    if (compare2) {
      const pos2 = existing.find((e) => e.placeId === compare2.placeId)?.position;
      if (pos2 == null)
        throw new Error(`comparison place ${compare2.placeId} is not in this user's category list`);
      const lo = Math.min(pos1, pos2);
      const hi = Math.max(pos1, pos2);
      const secondPosition = compare2.preferredNew ? pos2 : pos2 + 1;
      if (
        secondPosition >= lo &&
        secondPosition <= hi + 1 &&
        insertPosition >= lo &&
        insertPosition <= hi + 1
      ) {
        insertPosition = Math.min(insertPosition, secondPosition);
      }
      // else: conflicting answers — keep the first comparison's result.
    }
  }

  for (const e of mockDb.rankedEntries) {
    if (e.userId === userId && e.categoryId === categoryId && e.position >= insertPosition) {
      e.position += 1;
    }
  }

  const entry: RankedEntry = {
    id: mockDb.nextId('rank'),
    userId,
    placeId,
    categoryId,
    tier,
    position: insertPosition,
  };
  mockDb.rankedEntries.push(entry);

  return {
    entryId: entry.id,
    landedPosition: insertPosition,
    totalInCategory: existing.length + 1,
  };
}

/** Mirrors the ranked_entries_visible view: excludes tier='disliked' (rule 5). */
export async function getVisibleRankedEntries(
  userId: string,
  categoryId?: string,
): Promise<RankedEntry[]> {
  return mockDb.rankedEntries
    .filter(
      (e) =>
        e.userId === userId &&
        e.tier !== 'disliked' &&
        (!categoryId || e.categoryId === categoryId),
    )
    .sort((a, b) => a.position - b.position);
}

/** Raw list including disliked entries — only for screens that genuinely need it. */
export async function getAllRankedEntries(
  userId: string,
  categoryId?: string,
): Promise<RankedEntry[]> {
  return mockDb.rankedEntries
    .filter((e) => e.userId === userId && (!categoryId || e.categoryId === categoryId))
    .sort((a, b) => a.position - b.position);
}

/**
 * UX decision (Phase 1 left this open): offer the current #1 in the category
 * as the first comparison target, and — only when the config flag
 * second_comparison is not "removed" and there are 3+ existing entries — the
 * current median entry as the optional second target. This gives a fast
 * single-tap answer for a short list, and a coarse binary-search-like second
 * question for a longer one, matching the "two-tap budget" (S25-S27).
 */
export function pickComparisonTargets(
  userId: string,
  categoryId: string,
): { first?: string; second?: string } {
  const existing = mockDb.rankedEntries
    .filter((e) => e.userId === userId && e.categoryId === categoryId)
    .sort((a, b) => a.position - b.position);
  if (existing.length === 0) return {};
  const first = existing[0].placeId;
  if (existing.length < 3) return { first };
  const medianIndex = Math.floor(existing.length / 2);
  const second = existing[medianIndex].placeId;
  return { first, second: second !== first ? second : undefined };
}
