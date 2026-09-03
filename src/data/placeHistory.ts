import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

/**
 * P14: the AI-generated fallback half of PlaceDetailScreen's history
 * section, for whenever Google itself has no editorial summary for a place
 * (the far more common case — most places simply don't have one). Calls the
 * place-history Edge Function, which is inert (returns { history: null })
 * until ANTHROPIC_API_KEY is configured as a function secret, so this never
 * blocks or breaks a place page either way.
 */
export interface AiPlaceHistoryInput {
  googlePlaceId: string;
  name: string;
  types?: string[];
  address?: string;
  areaText?: string;
}

export async function fetchAiPlaceHistory(input: AiPlaceHistoryInput): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ history: string | null }>(
    'place-history',
    {
      body: {
        googlePlaceId: input.googlePlaceId,
        name: input.name,
        types: input.types?.join(', '),
        address: input.address,
        areaText: input.areaText,
      },
    },
  );
  // A missing/misconfigured function is a deployment state, not a bug a
  // place page should surface to whoever is just trying to read about a
  // restaurant — same treatment as googleRankings.ts's isMissingSchema.
  if (error) return null;
  return data?.history ?? null;
}

export function useAiPlaceHistory(input: AiPlaceHistoryInput | null) {
  return useQuery({
    queryKey: ['ai-place-history', input?.googlePlaceId],
    queryFn: () => fetchAiPlaceHistory(input!),
    enabled: !!input,
    staleTime: Infinity,
    retry: false,
  });
}
