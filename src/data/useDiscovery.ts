import { useQuery } from '@tanstack/react-query';
import { searchCandidates } from '../lib/placesSearch';
import { hasMapsApiKey } from '../lib/googleMaps';
import { useSearch } from '../lib/searchState';
import { usePersona } from '../dev/PersonaContext';
import { buildDiscovery, emptyDiscovery, type DiscoveryResult } from './hybridPicks';
import { getPersonalizedSuggestions } from './recommendations';
import type { Door } from '../lib/searchState';

export interface DiscoveryQueryResult {
  data: DiscoveryResult | undefined;
  isLoading: boolean;
  googleError: Error | null;
}

/**
 * Google finds places for the current door + filters. Nothing is read from
 * the Madli catalogue for this list.
 */
export function useDiscovery(door: Door): DiscoveryQueryResult {
  const { search, effectiveCenter, radiusMeters } = useSearch();
  const { hasSession, userId } = usePersona();

  const query = useQuery({
    queryKey: [
      'discovery',
      door,
      effectiveCenter.lat,
      effectiveCenter.lng,
      radiusMeters,
      search.vibes.join('|'),
      search.who,
      search.occasion,
      search.budgetCap,
      search.budget,
      search.kitchen,
      search.areaText,
      search.areaType,
      search.allowsPets,
      search.servesPetFood,
      search.familyFriendly,
      search.coupleFriendly,
      search.openLate,
      search.waitCare,
      search.openNow,
      search.centerSource,
      hasSession ? userId : null,
    ],
    queryFn: async (): Promise<{ result: DiscoveryResult; error: Error | null }> => {
      if (!hasMapsApiKey()) {
        return {
          result: emptyDiscovery(),
          error: new Error('Google Maps is not configured.'),
        };
      }

      try {
        const candidates = await searchCandidates({
          door,
          center: effectiveCenter,
          radiusMeters,
          vibes: search.vibes,
          who: search.who,
          occasion: search.occasion,
          budgetCap: search.budgetCap,
          budget: search.budget,
          // Explore has no kitchen to describe, so it never reaches the query.
          kitchen: door === 'eat' ? search.kitchen : null,
          areaText: search.areaText,
          areaType: search.areaType,
          allowsPets: search.allowsPets,
          servesPetFood: search.servesPetFood,
          familyFriendly: search.familyFriendly,
          coupleFriendly: search.coupleFriendly,
          openLate: search.openLate,
          waitCare: search.waitCare,
          openNow: search.openNow,
          clipToRadius: search.centerSource === 'geolocation' || search.centerSource === 'area',
        });

        const result = buildDiscovery({
          candidates,
          origin: effectiveCenter,
        });

        // P5 §3: a signed-in User's own ranking history re-orders these
        // same candidates toward what they tend to love — a Guest has no
        // rankings to read (and none to write, by RLS), so this is skipped
        // entirely rather than making a call known upfront to return nothing.
        if (!hasSession || !userId || result.ranked.length === 0) {
          return { result, error: null };
        }
        const personalized = await getPersonalizedSuggestions(
          userId,
          door,
          result.ranked.map((pick) => pick.candidate),
        );
        return {
          result: {
            ranked: personalized.map((candidate) => ({
              kind: 'ranked' as const,
              candidate,
              location: candidate.location,
            })),
          },
          error: null,
        };
      } catch (err) {
        return {
          result: emptyDiscovery(),
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    data: query.data?.result,
    isLoading: query.isLoading,
    googleError: query.data?.error ?? null,
  };
}
