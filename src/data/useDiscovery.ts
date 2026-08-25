import { useQuery } from '@tanstack/react-query';
import { searchCandidates } from '../lib/placesSearch';
import { hasMapsApiKey } from '../lib/googleMaps';
import { useSearch } from '../lib/searchState';
import { places as catalogue } from '../fixtures/places';
import {
  buildDiscovery,
  buildDiscoveryFromCatalogue,
  matchCandidatesToPlaces,
  type DiscoveryResult,
} from './hybridPicks';
import type { Door } from '../lib/searchState';

export interface DiscoveryQueryResult {
  data: DiscoveryResult | undefined;
  isLoading: boolean;
  /** Set when Google failed. Results may still be present, from the catalogue. */
  googleError: Error | null;
  /** True when the list came from Madli's own catalogue because Google was unavailable. */
  usedFallback: boolean;
}

/**
 * The discovery loop: Google finds, Madli ranks.
 *
 * Google being unavailable is treated as a degraded mode, not a failure —
 * Madli's own ranked catalogue is real data and showing it beats showing an
 * error. The caller still gets `googleError` so the UI can say plainly that
 * these are catalogue results rather than a search of the chosen area.
 */
export function useDiscovery(
  door: Door,
  rejectedPlaceIds: Set<string>,
  rejectedGooglePlaceIds: Set<string>,
): DiscoveryQueryResult {
  const { search, effectiveCenter, radiusMeters } = useSearch();

  const query = useQuery({
    // Every input that changes the result is in the key, so changing a filter
    // refetches rather than showing the previous door's picks.
    queryKey: [
      'discovery',
      door,
      effectiveCenter.lat,
      effectiveCenter.lng,
      radiusMeters,
      search.vibe,
      search.areaText,
      search.areaType,
      search.allowsPets,
      search.servesPetFood,
    ],
    queryFn: async (): Promise<{ result: DiscoveryResult; error: Error | null }> => {
      if (!hasMapsApiKey()) {
        return {
          result: buildDiscoveryFromCatalogue(catalogue, door, rejectedPlaceIds),
          error: new Error('Google Maps is not configured.'),
        };
      }

      try {
        const candidates = await searchCandidates({
          door,
          center: effectiveCenter,
          radiusMeters,
          vibe: search.vibe,
          areaText: search.areaText,
          areaType: search.areaType,
          allowsPets: search.allowsPets,
          servesPetFood: search.servesPetFood,
        });

        // The Supabase match is what decides "does Madli know this place",
        // and it is the only place Google identity touches Madli data.
        await matchCandidatesToPlaces(candidates);

        return {
          result: buildDiscovery({
            candidates,
            places: catalogue,
            rejectedPlaceIds,
            rejectedGooglePlaceIds,
          }),
          error: null,
        };
      } catch (err) {
        return {
          result: buildDiscoveryFromCatalogue(catalogue, door, rejectedPlaceIds),
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
    usedFallback: query.data?.error != null,
  };
}
