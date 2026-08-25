import { useQuery } from '@tanstack/react-query';
import { searchCandidates } from '../lib/placesSearch';
import { hasMapsApiKey } from '../lib/googleMaps';
import { useSearch } from '../lib/searchState';
import { buildDiscovery, emptyDiscovery, type DiscoveryResult } from './hybridPicks';
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
export function useDiscovery(door: Door, rejectedGooglePlaceIds: Set<string>): DiscoveryQueryResult {
  const { search, effectiveCenter, radiusMeters } = useSearch();

  const query = useQuery({
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
      search.centerSource,
      [...rejectedGooglePlaceIds].join(','),
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
          vibe: search.vibe,
          areaText: search.areaText,
          areaType: search.areaType,
          allowsPets: search.allowsPets,
          servesPetFood: search.servesPetFood,
          clipToRadius:
            search.centerSource === 'geolocation' || search.centerSource === 'area',
        });

        return {
          result: buildDiscovery({
            candidates,
            origin: effectiveCenter,
            rejectedGooglePlaceIds,
          }),
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
