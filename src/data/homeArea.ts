import { supabase } from '../lib/supabaseClient';

/**
 * A signed-in person's persisted home neighbourhood (S8's "Set as my home
 * area" toggle) — `profiles.home_area_id`, a column that has existed since
 * Phase 1 but nothing ever wrote to. The old manual-area screen's "Home"
 * switch was local component state only; toggling it did nothing past that
 * render. This is the real, persisted version.
 *
 * Guests never call these — they have no profile row, and the whole point of
 * the toggle being absent for them is that they re-pick every visit.
 */

export async function fetchHomeAreaId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('home_area_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data?.home_area_id ?? null;
}

/** Pass `null` to clear it — the toggle directly edits this value, so turning it off means "not my home." */
export async function setHomeAreaId(userId: string, areaId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ home_area_id: areaId })
    .eq('id', userId);
  if (error) throw error;
}
