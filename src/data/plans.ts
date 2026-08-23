// Phase 3: real Supabase calls. The share-link read genuinely sends the
// token as an `x-share-token` request header (via a per-request client
// override, `supabaseWithShareToken`), matching the real RLS policy exactly
// — verified for real: an anonymous client sending only that header got back
// exactly one plan and nothing else (PHASE_3_COMPLETION_REPORT.md §4).
import { supabase, supabaseWithShareToken } from '../lib/supabaseClient';
import type { Plan } from '../fixtures/mockDb';

function rowToPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    eatPlaceId: row.eat_place_id as string,
    explorePlaceId: row.explore_place_id as string,
    name: row.name as string | null,
    shareToken: row.share_token as string | null,
  };
}

export async function getBookmarks(userId: string): Promise<{ id: string; placeId: string }[]> {
  const { data, error } = await supabase.from('bookmarks').select('id, place_id').eq('user_id', userId);
  if (error) throw error;
  return data.map((b) => ({ id: b.id, placeId: b.place_id }));
}

export async function addBookmark(userId: string, placeId: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').insert({ user_id: userId, place_id: placeId });
  if (error) throw error;
}

export async function removeBookmark(userId: string, placeId: string): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('place_id', placeId);
  if (error) throw error;
}

export async function getPlans(userId: string): Promise<Plan[]> {
  const { data, error } = await supabase.from('plans').select('*').eq('user_id', userId);
  if (error) throw error;
  return data.map(rowToPlan);
}

export async function createPlan(
  userId: string,
  eatPlaceId: string,
  explorePlaceId: string,
  name?: string,
): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      eat_place_id: eatPlaceId,
      explore_place_id: explorePlaceId,
      name: name ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToPlan(data);
}

export async function createPlanShareToken(planId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_plan_share_token', { p_plan_id: planId });
  if (error) throw error;
  return data;
}

export async function getSharedPlan(token: string): Promise<Plan | undefined> {
  const { data, error } = await supabaseWithShareToken(token)
    .from('plans')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPlan(data) : undefined;
}
