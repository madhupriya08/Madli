// Phase 3: real Supabase calls. The share-link read genuinely sends the
// token as an `x-share-token` request header (via a per-request client
// override, `supabaseWithShareToken`), matching the real RLS policy exactly
// — verified for real: an anonymous client sending only that header got back
// exactly one plan and nothing else (PHASE_3_COMPLETION_REPORT.md §4).
//
// Phase 5 §4: replaced the fixed eat_place_id/explore_place_id pair with an
// arbitrary-length, ordered `plan_items` list — see
// supabase/migrations/20260830130000_plan_items.sql for why (this app's
// discovery is 100% live Google Places now, so a "plan" is always built
// from Google-sourced stops, never the seeded catalogue).
import { supabase, supabaseWithShareToken } from '../lib/supabaseClient';

export interface PlanStop {
  googlePlaceId: string;
  placeName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  position: number;
}

export interface Plan {
  id: string;
  userId: string;
  /** Whatever identifies the place this plan started from client-side — see plans.anchor_key's own comment. */
  anchorKey: string;
  anchorName: string;
  anchorLat: number | null;
  anchorLng: number | null;
  name: string | null;
  shareToken: string | null;
  stops: PlanStop[];
}

export interface NewPlanStop {
  googlePlaceId: string;
  placeName: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

function rowToPlan(planRow: Record<string, unknown>, itemRows: Record<string, unknown>[]): Plan {
  return {
    id: planRow.id as string,
    userId: planRow.user_id as string,
    anchorKey: planRow.anchor_key as string,
    anchorName: planRow.anchor_name as string,
    anchorLat: (planRow.anchor_lat as number | null) ?? null,
    anchorLng: (planRow.anchor_lng as number | null) ?? null,
    name: planRow.name as string | null,
    shareToken: planRow.share_token as string | null,
    stops: itemRows
      .map((row) => ({
        googlePlaceId: row.google_place_id as string,
        placeName: row.place_name as string,
        address: (row.address as string | null) ?? null,
        lat: (row.lat as number | null) ?? null,
        lng: (row.lng as number | null) ?? null,
        position: row.position as number,
      }))
      .sort((a, b) => a.position - b.position),
  };
}

export async function getBookmarks(
  userId: string,
): Promise<{ id: string; placeId: string; note: string | null }[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, place_id, note')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((b) => ({ id: b.id, placeId: b.place_id, note: b.note }));
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

/** The optional "why I saved this" note (S23) — set or cleared, never required. */
export async function setBookmarkNote(
  userId: string,
  placeId: string,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .update({ note: note.trim() || null })
    .eq('user_id', userId)
    .eq('place_id', placeId);
  if (error) throw error;
}

export async function getPlans(userId: string): Promise<Plan[]> {
  const { data: planRows, error } = await supabase.from('plans').select('*').eq('user_id', userId);
  if (error) throw error;
  if (planRows.length === 0) return [];

  const { data: itemRows, error: itemsError } = await supabase
    .from('plan_items')
    .select('*')
    .in(
      'plan_id',
      planRows.map((p) => p.id),
    );
  if (itemsError) throw itemsError;

  return planRows.map((row) => rowToPlan(row, itemRows.filter((it) => it.plan_id === row.id)));
}

/** The one plan this user already has anchored to this place, if any — "add to plan" upserts onto it rather than creating a duplicate. */
export async function findPlanForAnchor(userId: string, anchorKey: string): Promise<Plan | undefined> {
  const { data: planRow, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .eq('anchor_key', anchorKey)
    .maybeSingle();
  if (error) throw error;
  if (!planRow) return undefined;

  const { data: itemRows, error: itemsError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planRow.id);
  if (itemsError) throw itemsError;
  return rowToPlan(planRow, itemRows ?? []);
}

/** Creates a plan anchored to one place, with its first stop already on it. */
export async function createPlan(
  userId: string,
  anchor: { key: string; name: string; lat?: number | null; lng?: number | null },
  firstStop: NewPlanStop,
  name?: string,
): Promise<Plan> {
  const { data: planRow, error } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      anchor_key: anchor.key,
      anchor_name: anchor.name,
      anchor_lat: anchor.lat ?? null,
      anchor_lng: anchor.lng ?? null,
      name: name ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const { data: itemRow, error: itemError } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planRow.id,
      google_place_id: firstStop.googlePlaceId,
      place_name: firstStop.placeName,
      address: firstStop.address ?? null,
      lat: firstStop.lat ?? null,
      lng: firstStop.lng ?? null,
      position: 1,
    })
    .select()
    .single();
  if (itemError) throw itemError;

  return rowToPlan(planRow, [itemRow]);
}

/** The "add another stop" affordance — atomic against concurrent adds, idempotent if already on the plan. Backed by fn_add_plan_item. */
export async function addPlanItem(planId: string, stop: NewPlanStop): Promise<void> {
  const { error } = await supabase.rpc('fn_add_plan_item', {
    p_plan_id: planId,
    p_google_place_id: stop.googlePlaceId,
    p_place_name: stop.placeName,
    p_address: stop.address ?? null,
    p_lat: stop.lat ?? null,
    p_lng: stop.lng ?? null,
  });
  if (error) throw error;
}

/** Phase 8 §4: "let a user name their plan" — plans.name already existed (createPlan already accepted it), just nothing let anyone set or change it after the fact. RLS's plans_owner_all already covers UPDATE, so no new function is needed. */
export async function renamePlan(planId: string, name: string | null): Promise<void> {
  const { error } = await supabase.from('plans').update({ name }).eq('id', planId);
  if (error) throw error;
}

/**
 * Phase 8 §3: removes one stop; if it was the last one, the whole plan goes
 * with it (fn_remove_plan_item does both atomically — see its own comment).
 * Returns true when the plan itself was deleted, so the caller can navigate
 * away instead of re-rendering a plan that no longer exists.
 */
export async function removePlanItem(planId: string, googlePlaceId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('fn_remove_plan_item', {
    p_plan_id: planId,
    p_google_place_id: googlePlaceId,
  });
  if (error) throw error;
  return data;
}

export async function createPlanShareToken(planId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_create_plan_share_token', { p_plan_id: planId });
  if (error) throw error;
  return data;
}

export async function getSharedPlan(token: string): Promise<Plan | undefined> {
  const client = supabaseWithShareToken(token);
  const { data: planRow, error } = await client
    .from('plans')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();
  if (error) throw error;
  if (!planRow) return undefined;

  const { data: itemRows, error: itemsError } = await client
    .from('plan_items')
    .select('*')
    .eq('plan_id', planRow.id);
  if (itemsError) throw itemsError;
  return rowToPlan(planRow, itemRows ?? []);
}
