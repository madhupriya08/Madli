// Phase 3: real Supabase calls. Mirrors the `published_picks` view (locals
// >= app_config.ranking_threshold_locals, applied by Postgres itself now,
// not duplicated here) and the `places` table for reads.
// "Three picks, never more" (LIMIT 3) is still enforced by the caller.
import { supabase } from '../lib/supabaseClient';
import type { Place } from '../fixtures/places';

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
    lat: (row.lat as number | null) ?? null,
    lng: (row.lng as number | null) ?? null,
    googlePlaceId: (row.google_place_id as string | null) ?? null,
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
  const query = applyFilters(supabase.from('published_picks').select(SELECT_WITH_DETAILS), filters);
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

