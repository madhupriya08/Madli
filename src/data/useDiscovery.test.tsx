import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchProvider } from '../lib/searchState';
import { useDiscovery } from './useDiscovery';
import type { GoogleCandidate } from '../lib/placesSearch';

/**
 * P5 §3: the "ongoing suggestion surfaces" half of the recommendation
 * wiring — a signed-in User's own ranking history should re-order these
 * same discovery candidates; a Guest must see no behaviour change (no
 * rankings to read, by RLS, so the call is skipped rather than made to
 * return nothing).
 */

vi.mock('../lib/googleMaps', () => ({ hasMapsApiKey: () => true }));

const searchCandidatesMock = vi.fn();
vi.mock('../lib/placesSearch', () => ({
  searchCandidates: (...args: unknown[]) => searchCandidatesMock(...args),
}));

const usePersonaMock = vi.fn();
vi.mock('../dev/PersonaContext', () => ({
  usePersona: () => usePersonaMock(),
}));

const getPersonalizedSuggestionsMock = vi.fn();
vi.mock('./recommendations', () => ({
  getPersonalizedSuggestions: (...args: unknown[]) => getPersonalizedSuggestionsMock(...args),
}));

function candidate(placeId: string, reviewCount: number): GoogleCandidate {
  return {
    placeId,
    name: placeId,
    address: '',
    location: { lat: 17.4, lng: 78.4 },
    types: ['restaurant'],
    reviewCount,
    googleRating: 4.5,
  };
}

const A = candidate('a', 100);
const B = candidate('b', 50);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <SearchProvider>{children}</SearchProvider>
    </QueryClientProvider>
  );
}

describe('useDiscovery — personalization wiring', () => {
  beforeEach(() => {
    sessionStorage.clear();
    searchCandidatesMock.mockReset();
    usePersonaMock.mockReset();
    getPersonalizedSuggestionsMock.mockReset();
    searchCandidatesMock.mockResolvedValue([A, B]);
  });

  it('never calls the recommender for a Guest — candidates keep their review/distance order', async () => {
    usePersonaMock.mockReturnValue({ hasSession: false, userId: '' });
    const { result } = renderHook(() => useDiscovery('eat'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getPersonalizedSuggestionsMock).not.toHaveBeenCalled();
    expect(result.current.data!.ranked.map((p) => p.candidate.placeId)).toEqual(['a', 'b']);
  });

  it("re-orders candidates by a signed-in User's own ranking history", async () => {
    usePersonaMock.mockReturnValue({ hasSession: true, userId: 'user-1' });
    getPersonalizedSuggestionsMock.mockResolvedValue([B, A]);

    const { result } = renderHook(() => useDiscovery('eat'), { wrapper });

    await waitFor(() => expect(result.current.data!.ranked.map((p) => p.candidate.placeId)).toEqual(['b', 'a']));
    expect(getPersonalizedSuggestionsMock).toHaveBeenCalledWith('user-1', 'eat', [A, B]);
  });
});
