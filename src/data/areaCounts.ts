import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Door } from '../lib/searchState';

/**
 * Real place and ranking counts per door, scoped to an area — what Home's
 * two doors show underneath "Eat"/"Explore" now, replacing what used to be
 * static copy with no real number behind it.
 *
 * Backed by fn_area_door_counts (20260828100000), a definer-rights function:
 * ranked_entries is owner-only RLS, so a plain client query cannot count
 * across everyone's rows. Missing-table/-function degrades to zero counts
 * rather than throwing, matching every other new-migration client seam in
 * this codebase.
 */

export interface DoorCounts {
  placeCount: number;
  rankedCount: number;
}

function isMissingSchema(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === '42883' || error?.code === 'PGRST202';
}

export async function fetchAreaDoorCounts(areaId: string): Promise<Record<Door, DoorCounts>> {
  const empty: Record<Door, DoorCounts> = {
    eat: { placeCount: 0, rankedCount: 0 },
    explore: { placeCount: 0, rankedCount: 0 },
  };
  const { data, error } = await supabase.rpc('fn_area_door_counts', { p_area_id: areaId });
  if (error) {
    if (isMissingSchema(error)) return empty;
    throw error;
  }
  for (const row of data ?? []) {
    if (row.door === 'eat' || row.door === 'explore') {
      empty[row.door] = { placeCount: row.place_count ?? 0, rankedCount: row.ranked_count ?? 0 };
    }
  }
  return empty;
}

export function useAreaDoorCounts(areaId: string | null) {
  return useQuery({
    queryKey: ['area-door-counts', areaId],
    queryFn: () => fetchAreaDoorCounts(areaId!),
    enabled: areaId != null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
