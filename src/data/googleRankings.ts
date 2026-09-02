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

export interface GoogleComparison {
  /** A place already in this person's list for this door. */
  googlePlaceId: string;
  /** True when they picked the place being ranked over this one. */
  preferredNew: boolean;
}

export interface RankGooglePlaceInput {
  googlePlaceId: string;
  placeName: string;
  door: Door;
  tier: RankTier;
  location?: LatLng | null;
  areaText?: string | null;
  /** Google's own place types — what P5 §3's content-based recommender compares candidates against. */
  types?: string[];
  /**
   * P12 §9: the head-to-head answers that decide where inside its tier this
   * lands. Optional throughout — the first place someone ranks in a door
   * has nothing to compare against, and skipping the second comparison is
   * allowed exactly as it is in the catalogue's own mechanic (S26).
   */
  compare1?: GoogleComparison;
  compare2?: GoogleComparison;
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
  /**
   * Where the place is, as it was when this was ranked. Denormalised for the
   * same reason place_name is (see the migration's own comment) — and what
   * P12 §9's "your list in this locality" on Home matches against, since an
   * area *name* alone can't tell you a ranked place is round the corner from
   * where you are standing now.
   */
  location: LatLng | null;
  /** Google's own place types, as they were at the time this was ranked. */
  types: string[];
}

export async function fetchMyGoogleRankings(door?: Door): Promise<RankedGooglePlace[]> {
  let q = supabase
    .from('google_place_rankings')
    .select(
      'id, google_place_id, place_name, door, tier, rater_type, position, area_text, lat, lng, types',
    )
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
    location: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null,
    types: row.types ?? [],
  }));
}

export function useMyGoogleRankings(door?: Door, enabled = true) {
  return useQuery({
    queryKey: ['my-google-rankings', door ?? 'all'],
    queryFn: () => fetchMyGoogleRankings(door),
    enabled,
    retry: false,
  });
}

/** The signed-in person's own current answer, or null if never asked/answered. */
export async function fetchResidentStatus(userId: string): Promise<ResidentStatus | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('resident_status')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return (data?.resident_status as ResidentStatus | null) ?? null;
}

export function useResidentStatus(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['resident-status', userId],
    queryFn: () => fetchResidentStatus(userId),
    enabled: enabled && !!userId,
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
  const baseArgs = {
    p_google_place_id: input.googlePlaceId,
    p_place_name: input.placeName,
    p_door: input.door,
    p_tier: input.tier,
    p_lat: input.location?.lat ?? null,
    p_lng: input.location?.lng ?? null,
    p_area_text: input.areaText ?? null,
    p_types: input.types ?? [],
  };
  const comparisonArgs = {
    p_compare_google_place_id_1: input.compare1?.googlePlaceId ?? null,
    p_preferred_new_over_1: input.compare1?.preferredNew ?? null,
    p_compare_google_place_id_2: input.compare2?.googlePlaceId ?? null,
    p_preferred_new_over_2: input.compare2?.preferredNew ?? null,
  };

  let { data, error } = await supabase.rpc('fn_rank_google_place', {
    ...baseArgs,
    ...comparisonArgs,
  });

  // PostgREST reports "no function with these argument names" as PGRST202 —
  // which here means one specific, recoverable thing: this deployment has
  // not applied 20260903100000_rank_google_place_compared.sql yet. Losing
  // the head-to-head refinement is a much smaller cost than losing the
  // ranking, so retry against the pre-P10 signature rather than failing.
  if (error && isMissingSchema(error)) {
    ({ data, error } = await supabase.rpc('fn_rank_google_place', baseArgs));
  }

  if (error) {
    // fn_rank_google_place raises 23514 when the profile has no
    // resident_status. That is reachable from the UI — the residency write can
    // fail after the chip already looks chosen — and its message is written
    // for whoever is reading the function, not for whoever is standing in a
    // restaurant. Verified live: the raw text is
    // "set profiles.resident_status before ranking (local or visitor)".
    if (error.code === '23514' && error.message.includes('resident_status')) {
      throw new Error('Tell us whether you live here or are visiting first — then this will save.');
    }
    throw error;
  }
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

/**
 * Undoes a ranking outright — tapping the already-selected tier again on the
 * onboarding screen, rather than silently re-submitting the same answer.
 * Backed by supabase/migrations/20260830100000_unrank_google_place.sql.
 */
export async function unrankGooglePlace(googlePlaceId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_unrank_google_place', {
    p_google_place_id: googlePlaceId,
  });
  if (error) {
    if (isMissingSchema(error)) return;
    throw error;
  }
}

/**
 * Google's own `types` carry a handful of labels every place shares —
 * they say nothing about what kind of place it is, so an overlap on them
 * alone is not a category match.
 */
const GENERIC_TYPES = new Set(['point_of_interest', 'establishment', 'food', 'store', 'premise']);

function meaningfulTypes(types: string[] | undefined | null): Set<string> {
  return new Set((types ?? []).filter((t) => !GENERIC_TYPES.has(t)));
}

/**
 * P12 §9: which two of the person's existing rankings to compare a new one
 * against — "based on the category", so a new cafe is weighed against the
 * cafes they have ranked, not against a nightclub that happens to sit at
 * the top of the same door.
 *
 * Category here is Google's own `types` overlap (a Google place has no
 * catalogue category to belong to), narrowed to the same tier so the
 * question is between comparable verdicts. The offer mirrors the
 * catalogue mechanic's own rule (pickComparisonTargets in rankedEntries.ts):
 * the current best in that category, plus — only once there are three or
 * more — its median as an optional second. Falls back to the whole door
 * when nothing shares a category, since a rough comparison still orders the
 * list better than no comparison at all.
 */
export function pickGoogleComparisonTargets(
  history: RankedGooglePlace[],
  candidate: { types?: string[]; tier?: RankTier },
): { first?: RankedGooglePlace; second?: RankedGooglePlace } {
  const inTier = candidate.tier ? history.filter((h) => h.tier === candidate.tier) : history;
  if (inTier.length === 0) return {};

  const candidateTypes = meaningfulTypes(candidate.types);
  const sameCategory = inTier.filter((entry) => {
    const entryTypes = meaningfulTypes(entry.types);
    for (const type of candidateTypes) if (entryTypes.has(type)) return true;
    return false;
  });

  const pool = [...(sameCategory.length > 0 ? sameCategory : inTier)].sort(
    (a, b) => a.position - b.position,
  );
  const first = pool[0];
  if (pool.length < 3) return { first };
  const second = pool[Math.floor(pool.length / 2)];
  return { first, second: second.id !== first.id ? second : undefined };
}

export function useUnrankGooglePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unrankGooglePlace,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-google-rankings'] });
      void qc.invalidateQueries({ queryKey: ['google-ranking-counts'] });
    },
  });
}
