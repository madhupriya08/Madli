import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { usePersona } from '../dev/PersonaContext';

/**
 * A signed-in person's persisted home neighbourhood (S8's "Set as my home
 * area" toggle) — `profiles.home_area_id`/`home_area_text`, columns that
 * have existed since Phase 1 but nothing ever wrote `home_area_id` to (and
 * nothing wrote `home_area_text` from here — googleRankings.ts writes it for
 * a different reason, the resident-status ask). The old manual-area
 * screen's "Home" switch was local component state only; toggling it did
 * nothing past that render. This is the real, persisted version.
 *
 * Home is either one of the eight seeded neighbourhoods (`home_area_id`, a
 * real FK) or a live-searched place anywhere else (`home_area_text`, since a
 * Google-resolved area has no seeded `areas` row to point a FK at) — never
 * both at once, so setting one always clears the other.
 *
 * Guests never call these — they have no profile row, and the whole point of
 * the toggle being absent for them is that they re-pick every visit.
 */

export interface HomeArea {
  areaId: string | null;
  areaText: string | null;
}

export async function fetchHomeArea(userId: string): Promise<HomeArea> {
  const { data, error } = await supabase
    .from('profiles')
    .select('home_area_id, home_area_text')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return { areaId: data?.home_area_id ?? null, areaText: data?.home_area_text ?? null };
}

/** Pass `null` to clear it — the toggle directly edits this value, so turning it off means "not my home." */
export async function setHomeAreaId(userId: string, areaId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ home_area_id: areaId, home_area_text: null })
    .eq('id', userId);
  if (error) throw error;
}

/** The live-search counterpart of `setHomeAreaId`, for a place outside the eight seeded neighbourhoods. */
export async function setHomeAreaText(userId: string, areaText: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ home_area_id: null, home_area_text: areaText })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * P14: a thin read-only wrapper around fetchHomeArea for the screens that
 * only ever care about the text label (PickAreaScreen's "Home" shortcut) —
 * `areaId` only ever resolved through the retired seeded-areas fixture, so
 * a legacy row that still has one set (never areaText) has nothing to
 * display it with here; that shortcut just stays absent for them, same as
 * it already does for anyone who has never set a home area at all.
 */
export function useHomeArea() {
  const { persona, userId } = usePersona();
  const query = useQuery({
    queryKey: ['home-area', userId],
    queryFn: () => fetchHomeArea(userId),
    enabled: persona !== 'guest' && !!userId,
    retry: false,
  });
  return { areaText: query.data?.areaText ?? null, isLoading: query.isLoading };
}
