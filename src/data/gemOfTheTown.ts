import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Door } from '../lib/searchState';

/**
 * P14: GemOfTheTownPage's data, rebuilt on real rankings. Backed by
 * fn_gem_of_the_town (20260906100000) -- treats a missing function/table the
 * same way googleRankings.ts does: a deployment state, not an error the page
 * should surface.
 */
export interface GemOfTheTown {
  googlePlaceId: string;
  placeName: string;
  door: Door;
  areaText: string | null;
  lovedLocals: number;
}

function isMissingSchema(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === '42883' || error?.code === 'PGRST202';
}

export async function fetchGemOfTheTown(): Promise<GemOfTheTown | null> {
  const { data, error } = await supabase.rpc('fn_gem_of_the_town');
  if (error) {
    if (isMissingSchema(error)) return null;
    throw error;
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    googlePlaceId: row.google_place_id,
    placeName: row.place_name,
    door: row.door as Door,
    areaText: row.area_text,
    lovedLocals: row.loved_locals,
  };
}

export function useGemOfTheTown() {
  return useQuery({
    queryKey: ['gem-of-the-town'],
    queryFn: fetchGemOfTheTown,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
