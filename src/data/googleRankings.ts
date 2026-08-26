import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Door, LatLng } from '../lib/searchState';

/**
 * Personal rankings of Google Places, and the local/visitor counts that come
 * out of them.
 *
 * Backed by supabase/migrations/20260826120000_google_place_rankings.sql.
 * Until that migration is applied, every read here degrades to "no rankings
 * yet" rather than throwing: the ranking prompt is optional by design, and a
 * missing table must not take the results screen down with it.
 */

export type RankTier = 'loved' | 'fine' | 'disliked';
export type ResidentStatus = 'local' | 'visitor';

export interface RankingCounts {
  locals: number;
  visitors: number;
}

export interface RankGooglePlaceInput {
  googlePlaceId: string;
  placeName: string;
  door: Door;
  tier: RankTier;
  location?: LatLng | null;
  areaText?: string | null;
}

/**
 * Postgres reports a missing table as 42P01 and a missing function as 42883.
 * Both mean "the migration is not applied here yet", which is a deployment
 * state, not a bug in the caller — so reads treat it as empty rather than
 * surfacing an error nobody using the app could act on.
 */
function isMissingSchema(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === '42883' || error?.code === 'PGRST202';
}

export async function fetchRankingCounts(
  googlePlaceIds: string[],
): Promise<Record<string, RankingCounts>> {
  if (googlePlaceIds.length === 0) return {};
  const { data, error } = await supabase.rpc('fn_google_place_ranking_counts', {
    p_google_place_ids: googlePlaceIds,
  });
  if (error) {
    if (isMissingSchema(error)) return {};
    throw error;
  }
  const out: Record<string, RankingCounts> = {};
  for (const row of data ?? []) {
    out[row.google_place_id] = { locals: row.locals ?? 0, visitors: row.visitors ?? 0 };
  }
  return out;
}

/**
 * Counts for the places currently on screen.
 *
 * One request for the whole list rather than one per card — a results screen
 * shows up to five picks and the map shows more, and N round trips for a
 * two-number evidence line is not a trade worth making.
 */
export function useRankingCounts(googlePlaceIds: string[]) {
  const key = [...googlePlaceIds].sort().join(',');
  return useQuery({
    queryKey: ['google-ranking-counts', key],
    queryFn: () => fetchRankingCounts(googlePlaceIds),
    enabled: googlePlaceIds.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export interface RankedGooglePlace {
  id: string;
  googlePlaceId: string;
  placeName: string;
  door: Door;
  tier: RankTier;
  raterType: ResidentStatus;
  position: number;
  areaText: string | null;
}

export async function fetchMyGoogleRankings(door?: Door): Promise<RankedGooglePlace[]> {
  let q = supabase
    .from('google_place_rankings')
    .select('id, google_place_id, place_name, door, tier, rater_type, position, area_text')
    .order('position', { ascending: true });
  if (door) q = q.eq('door', door);

  const { data, error } = await q;
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    googlePlaceId: row.google_place_id,
    placeName: row.place_name,
    door: row.door as Door,
    tier: row.tier as RankTier,
    raterType: row.rater_type as ResidentStatus,
    position: row.position,
    areaText: row.area_text,
  }));
}

export function useMyGoogleRankings(door?: Door) {
  return useQuery({
    queryKey: ['my-google-rankings', door ?? 'all'],
    queryFn: () => fetchMyGoogleRankings(door),
    retry: false,
  });
}

/**
 * Records the person's own statement about where they live.
 *
 * This is what makes the local/visitor split real. It is never inferred from
 * their coordinates: being in Hyderabad today says nothing about whether you
 * live there, and a wrong guess here quietly corrupts every count built on
 * top of it.
 */
export async function setResidentStatus(
  status: ResidentStatus,
  homeAreaText?: string | null,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sign in to save this.');

  const { error } = await supabase
    .from('profiles')
    .update({
      resident_status: status,
      ...(homeAreaText != null ? { home_area_text: homeAreaText } : {}),
    })
    .eq('id', userId);
  if (error) throw error;
}

export interface RankLanding {
  landedPosition: number;
  totalInDoor: number;
}

export async function rankGooglePlace(input: RankGooglePlaceInput): Promise<RankLanding> {
  const { data, error } = await supabase.rpc('fn_rank_google_place', {
    p_google_place_id: input.googlePlaceId,
    p_place_name: input.placeName,
    p_door: input.door,
    p_tier: input.tier,
    p_lat: input.location?.lat ?? null,
    p_lng: input.location?.lng ?? null,
    p_area_text: input.areaText ?? null,
  });
  if (error) throw error;
  const row = data?.[0];
  return {
    landedPosition: row?.landed_position ?? 1,
    totalInDoor: row?.total_in_door ?? 1,
  };
}

export function useRankGooglePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rankGooglePlace,
    onSuccess: () => {
      // Both the person's own list and the public counts just changed.
      void qc.invalidateQueries({ queryKey: ['my-google-rankings'] });
      void qc.invalidateQueries({ queryKey: ['google-ranking-counts'] });
    },
  });
}
