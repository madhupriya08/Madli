// Phase 3: real Supabase calls. Mirrors the `published_picks` view (locals
// >= app_config.ranking_threshold_locals, applied by Postgres itself now,
// not duplicated here) and the `places` table for admin/owner reads+writes.
// "Three picks, never more" (LIMIT 3) is still enforced by the caller.
import { supabase } from '../lib/supabaseClient';
import type { Place } from '../fixtures/places';
import type { Database } from '../lib/database.types';

export interface PlaceFilters {
  type?: 'eat' | 'explore';
  categoryId?: string;
  neighborhood?: string;
}

function applyFilters<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  filters: PlaceFilters,
): T {
  let q = query;
  if (filters.type) q = q.eq('type', filters.type);
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
  if (filters.neighborhood) q = q.eq('neighborhood', filters.neighborhood);
  return q;
}

function rowToPlace(row: Record<string, unknown>): Place {
  const eat = row.place_eat_details as Record<string, unknown> | null;
  const explore = row.place_explore_details as Record<string, unknown> | null;
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    type: row.type as Place['type'],
    vibe: (row.vibe as string | null) ?? '',
    categoryId: row.category_id as string,
    neighborhood: row.neighborhood as string,
    areaId: row.area_id as string | null,
    priceLevel: (row.price_level as string | null) ?? '',
    reason: row.reason as string,
    history: row.history as string | null,
    tags: row.tags as string[],
    gapTone: row.gap_tone as Place['gapTone'],
    gapPoints: row.gap_points as number | null,
    locals: row.locals as number,
    visitors: row.visitors as number,
    drive: row.drive as string | null,
    outsideFameRank: row.outside_fame_rank as number | null,
    isActive: row.is_active as boolean,
    address: (row.address as string | null) ?? '',
    phone: (row.phone as string | null) ?? '',
    hours: (row.hours as string | null) ?? '',
    waitTime: (eat?.wait_time as string | undefined) ?? undefined,
    servingHours: (eat?.serving_hours as string | undefined) ?? undefined,
    dishes: (eat?.dishes as number | undefined) ?? undefined,
    gem: (eat?.gem as boolean | undefined) ?? false,
    crowdLevel: (explore?.crowd_level as string | undefined) ?? undefined,
    best: (explore?.best as string | undefined) ?? undefined,
  };
}

const SELECT_WITH_DETAILS = '*, place_eat_details(*), place_explore_details(*)';

export async function getPublishedPicks(filters: PlaceFilters = {}): Promise<Place[]> {
  const query = applyFilters(
    supabase.from('published_picks').select(SELECT_WITH_DETAILS),
    filters,
  );
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(rowToPlace);
}

/** All places matching filters, threshold NOT applied — for admin/catalogue screens. */
export async function getAllPlaces(filters: PlaceFilters = {}): Promise<Place[]> {
  const query = applyFilters(supabase.from('places').select(SELECT_WITH_DETAILS), filters);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map(rowToPlace);
}

export async function getPlaceBySlug(slug: string): Promise<Place | undefined> {
  const { data, error } = await supabase
    .from('places')
    .select(SELECT_WITH_DETAILS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPlace(data as unknown as Record<string, unknown>) : undefined;
}

export async function getPlaceById(id: string): Promise<Place | undefined> {
  const { data, error } = await supabase
    .from('places')
    .select(SELECT_WITH_DETAILS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToPlace(data as unknown as Record<string, unknown>) : undefined;
}

// Owner-editable field allowlist — a real, enforced-at-the-database allowlist
// (a trigger rejects everything else even if RLS lets the UPDATE statement
// through — verified for real in Phase 3, see completion report §4). Checked
// client-side too, so a UI bug surfaces immediately with a clear error
// instead of a round trip to discover the same rejection server-side.
const OWNER_EDITABLE_FIELDS = new Set<keyof Place>([
  'history',
  'phone',
  'address',
  'hours',
  'waitTime',
  'servingHours',
  'dishes',
  'crowdLevel',
  'best',
]);

const PLACE_FIELD_TO_COLUMN: Partial<Record<keyof Place, string>> = {
  history: 'history',
  phone: 'phone',
  address: 'address',
  hours: 'hours',
};
const EAT_FIELD_TO_COLUMN: Partial<Record<keyof Place, string>> = {
  waitTime: 'wait_time',
  servingHours: 'serving_hours',
  dishes: 'dishes',
};
const EXPLORE_FIELD_TO_COLUMN: Partial<Record<keyof Place, string>> = {
  crowdLevel: 'crowd_level',
  best: 'best',
};

export class ProtectedFieldError extends Error {
  constructor(public field: string) {
    super(`ranking-relevant column change rejected: only admin may change "${field}"`);
  }
}

export class NotAuthorizedError extends Error {
  constructor() {
    super('You are not a verified owner of this listing.');
  }
}

// Postgres RLS blocks an unauthorized UPDATE by matching zero rows, not by
// raising an error — PostgREST reports that as success with an empty result,
// so `{ error }` alone can't tell a blocked write from an authorized one that
// happened to touch a row that already had those values. Every write here
// must be checked this way, or a non-owner's blocked edit would show as
// "Listing updated." while nothing was actually written.
function assertRowsAffected<T>(rows: T[] | null): void {
  if (!rows || rows.length === 0) throw new NotAuthorizedError();
}

export async function updateOwnerListing(placeId: string, fields: Partial<Place>): Promise<Place> {
  for (const key of Object.keys(fields) as (keyof Place)[]) {
    if (!OWNER_EDITABLE_FIELDS.has(key)) {
      throw new ProtectedFieldError(key);
    }
  }

  const placesUpdate: Record<string, unknown> = {};
  const eatUpdate: Record<string, unknown> = {};
  const exploreUpdate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields) as [keyof Place, unknown][]) {
    if (PLACE_FIELD_TO_COLUMN[key]) placesUpdate[PLACE_FIELD_TO_COLUMN[key]!] = value;
    else if (EAT_FIELD_TO_COLUMN[key]) eatUpdate[EAT_FIELD_TO_COLUMN[key]!] = value;
    else if (EXPLORE_FIELD_TO_COLUMN[key]) exploreUpdate[EXPLORE_FIELD_TO_COLUMN[key]!] = value;
  }

  if (Object.keys(placesUpdate).length > 0) {
    const { data, error } = await supabase
      .from('places')
      .update(placesUpdate as Database['public']['Tables']['places']['Update'])
      .eq('id', placeId)
      .select('id');
    if (error) throw error;
    assertRowsAffected(data);
  }
  if (Object.keys(eatUpdate).length > 0) {
    const { data, error } = await supabase
      .from('place_eat_details')
      .update(eatUpdate as Database['public']['Tables']['place_eat_details']['Update'])
      .eq('place_id', placeId)
      .select('place_id');
    if (error) throw error;
    assertRowsAffected(data);
  }
  if (Object.keys(exploreUpdate).length > 0) {
    const { data, error } = await supabase
      .from('place_explore_details')
      .update(exploreUpdate as Database['public']['Tables']['place_explore_details']['Update'])
      .eq('place_id', placeId)
      .select('place_id');
    if (error) throw error;
    assertRowsAffected(data);
  }

  const updated = await getPlaceById(placeId);
  if (!updated) throw new Error(`place ${placeId} not found`);
  return updated;
}

/** Admin-only: no field restriction (RLS + the owner-only trigger don't apply to admin). */
export async function adminUpdatePlace(placeId: string, fields: Partial<Place>): Promise<Place> {
  const placesUpdate: Record<string, unknown> = {};
  if (fields.gapTone !== undefined) placesUpdate.gap_tone = fields.gapTone;
  if (fields.gapPoints !== undefined) placesUpdate.gap_points = fields.gapPoints;
  if (fields.name !== undefined) placesUpdate.name = fields.name;
  if (fields.isActive !== undefined) placesUpdate.is_active = fields.isActive;
  if (fields.outsideFameRank !== undefined) placesUpdate.outside_fame_rank = fields.outsideFameRank;

  if (Object.keys(placesUpdate).length > 0) {
    const { error } = await supabase
      .from('places')
      .update(placesUpdate as Database['public']['Tables']['places']['Update'])
      .eq('id', placeId);
    if (error) throw error;
  }
  const updated = await getPlaceById(placeId);
  if (!updated) throw new Error(`place ${placeId} not found`);
  return updated;
}
