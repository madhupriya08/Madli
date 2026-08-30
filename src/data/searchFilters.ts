import { supabase } from '../lib/supabaseClient';
import type { FilterSlice } from '../lib/searchState';
import type { Json } from '../lib/database.types';

/**
 * Backed by supabase/migrations/20260830110000_profile_search_filters.sql —
 * the signed-in-User side of P5 §5's session-persistence ask. Guests keep
 * the existing sessionStorage-only behaviour (searchState.tsx) untouched.
 */

export async function fetchSavedFilters(userId: string): Promise<FilterSlice | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('search_filters')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return (data?.search_filters as FilterSlice | null) ?? null;
}

export async function saveFilters(userId: string, filters: FilterSlice): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ search_filters: filters as unknown as Json })
    .eq('id', userId);
  if (error) throw error;
}
