import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SearchProvider, useSearch, type FilterSlice } from './searchState';
import { useAccountFilterSync } from './accountFilterSync';

/**
 * P5 §5: filters already persist to sessionStorage for everyone — this only
 * covers what that cannot: a signed-in User's *return visit* (a fresh tab,
 * a different device), via profiles.search_filters. Guests must see no
 * behaviour change at all.
 */

const usePersonaMock = vi.fn();
vi.mock('../dev/PersonaContext', () => ({
  usePersona: () => usePersonaMock(),
}));

const fetchSavedFiltersMock = vi.fn();
const saveFiltersMock = vi.fn();
vi.mock('../data/searchFilters', () => ({
  fetchSavedFilters: (...args: unknown[]) => fetchSavedFiltersMock(...args),
  saveFilters: (...args: unknown[]) => saveFiltersMock(...args),
}));

const SAVED: FilterSlice = {
  vibes: ['Date night'],
  vibe: 'Date night',
  budget: '₹300–600',
  kitchen: null,
  distanceKm: '5',
  allowsPets: false,
  familyFriendly: false,
  coupleFriendly: false,
  openLate: false,
  waitCare: false,
  openNow: false,
  areaType: null,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <SearchProvider>{children}</SearchProvider>
);

function useHarness() {
  useAccountFilterSync();
  return useSearch();
}

describe('useAccountFilterSync', () => {
  beforeEach(() => {
    sessionStorage.clear();
    usePersonaMock.mockReset();
    fetchSavedFiltersMock.mockReset();
    saveFiltersMock.mockReset();
    saveFiltersMock.mockResolvedValue(undefined);
  });

  it('does nothing for a Guest — no read, no write', async () => {
    usePersonaMock.mockReturnValue({ hasSession: false, userId: '', sessionLoading: false });
    renderHook(() => useHarness(), { wrapper });
    await act(async () => {});
    expect(fetchSavedFiltersMock).not.toHaveBeenCalled();
  });

  it("fills in a signed-in User's saved filters on a fresh session", async () => {
    usePersonaMock.mockReturnValue({ hasSession: true, userId: 'user-1', sessionLoading: false });
    fetchSavedFiltersMock.mockResolvedValue(SAVED);

    const { result } = renderHook(() => useHarness(), { wrapper });

    await waitFor(() => expect(fetchSavedFiltersMock).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(result.current.search.budget).toBe('₹300–600'));
    expect(result.current.search.vibes).toEqual(['Date night']);
    expect(result.current.search.distanceKm).toBe('5');
  });

  it('does not overwrite filters the person already picked this session', async () => {
    sessionStorage.setItem(
      'madli.search',
      JSON.stringify({ door: 'eat', budget: '₹600+', vibes: ['Diner'] }),
    );
    usePersonaMock.mockReturnValue({ hasSession: true, userId: 'user-1', sessionLoading: false });
    fetchSavedFiltersMock.mockResolvedValue(SAVED);

    const { result } = renderHook(() => useHarness(), { wrapper });
    await act(async () => {});

    expect(fetchSavedFiltersMock).not.toHaveBeenCalled();
    expect(result.current.search.budget).toBe('₹600+');
  });

  it('waits for sessionLoading to settle before doing anything', async () => {
    usePersonaMock.mockReturnValue({ hasSession: false, userId: '', sessionLoading: true });
    renderHook(() => useHarness(), { wrapper });
    await act(async () => {});
    expect(fetchSavedFiltersMock).not.toHaveBeenCalled();
  });

  it('saves a filter change, debounced, for a signed-in User', async () => {
    vi.useFakeTimers();
    try {
      usePersonaMock.mockReturnValue({ hasSession: true, userId: 'user-1', sessionLoading: false });
      fetchSavedFiltersMock.mockResolvedValue(null);

      const { result, rerender } = renderHook(() => useHarness(), { wrapper });
      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.setSearch({ budget: '₹300–600' });
      });
      rerender();

      expect(saveFiltersMock).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(saveFiltersMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ budget: '₹300–600' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('never saves for a Guest, even if local filters change', async () => {
    vi.useFakeTimers();
    try {
      usePersonaMock.mockReturnValue({ hasSession: false, userId: '', sessionLoading: false });
      const { result, rerender } = renderHook(() => useHarness(), { wrapper });

      act(() => {
        result.current.setSearch({ budget: '₹300–600' });
      });
      rerender();
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(saveFiltersMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
