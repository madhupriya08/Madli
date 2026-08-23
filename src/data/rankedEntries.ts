// Phase 3: logRankedVisit now calls the real `fn_log_ranked_visit` Postgres
// function (verified for real against the live project — first-in-category,
// both pairwise directions, and position-shift-on-insert all confirmed via
// real RPC calls, see PHASE_3_COMPLETION_REPORT.md §4) instead of
// reimplementing the algorithm in TypeScript. The ranking math now lives
// entirely server-side, exactly where Phase 1 built and verified it.
import { supabase } from '../lib/supabaseClient';
import type { RankedEntry, Tier } from '../fixtures/mockDb';

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
  void userId; // scoping is via the caller's own auth session (auth.uid()), not this param
  const { data, error } = await supabase.rpc('fn_log_ranked_visit', {
    p_place_id: placeId,
    p_tier: tier,
    p_compare_place_id_1: compare1?.placeId,
    p_preferred_new_over_1: compare1?.preferredNew,
    p_compare_place_id_2: compare2?.placeId,
    p_preferred_new_over_2: compare2?.preferredNew,
  });
  if (error) throw error;
  const row = data[0];
  return {
    entryId: row.entry_id,
    landedPosition: row.landed_position,
    totalInCategory: row.total_in_category,
  };
}

function rowToEntry(row: Record<string, unknown>): RankedEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    placeId: row.place_id as string,
    categoryId: row.category_id as string,
    tier: row.tier as Tier,
    position: row.position as number,
  };
}

/** Mirrors the ranked_entries_visible view: excludes tier='disliked' (rule 5). */
export async function getVisibleRankedEntries(
  userId: string,
  categoryId?: string,
): Promise<RankedEntry[]> {
  let query = supabase.from('ranked_entries_visible').select('*').eq('user_id', userId);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query.order('position', { ascending: true });
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(rowToEntry);
}

/** Raw list including disliked entries — only for screens that genuinely need it. */
export async function getAllRankedEntries(
  userId: string,
  categoryId?: string,
): Promise<RankedEntry[]> {
  let query = supabase.from('ranked_entries').select('*').eq('user_id', userId);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query.order('position', { ascending: true });
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(rowToEntry);
}

/**
 * UX decision (Phase 1 left this open, Phase 2 chose it, Phase 3 keeps it —
 * see PHASE_2_COMPLETION_REPORT.md §2): offer the current #1 in the category,
 * plus — only when there are 3+ existing entries — the current median entry
 * as an optional second comparison. Pure function now (entries passed in,
 * fetched via `useComparisonTargets` below), since the entries themselves
 * come from a real query rather than an in-memory store.
 */
export function pickComparisonTargets(entries: RankedEntry[]): {
  first?: string;
  second?: string;
} {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return {};
  const first = sorted[0].placeId;
  if (sorted.length < 3) return { first };
  const medianIndex = Math.floor(sorted.length / 2);
  const second = sorted[medianIndex].placeId;
  return { first, second: second !== first ? second : undefined };
}
