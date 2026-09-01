import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePostVisitNudgeCandidate } from './postVisitNudge';
import { saveGooglePlace, removeSavedGooglePlace } from '../lib/savedGooglePlaces';

/**
 * P10 §5's candidate-selection logic, in isolation from Home: a catalogue
 * bookmark not yet in the visible ranked list wins first (it needs no extra
 * lookup to become a real place name), a Google-saved place not yet ranked
 * is the fallback, and everything-already-ranked (or disabled/no data yet)
 * yields no candidate at all.
 */

let bookmarks: Array<{ id: string; placeId: string }> = [];
let rankedEntries: Array<{ placeId: string }> | undefined = [];
let googleRankings: Array<{ googlePlaceId: string }> | undefined = [];

vi.mock('./hooks', () => ({
  useBookmarks: (userId: string) => ({ data: userId ? bookmarks : undefined }),
  useVisibleRankedEntries: (userId: string) => ({ data: userId ? rankedEntries : undefined }),
}));

vi.mock('./googleRankings', () => ({
  useMyGoogleRankings: (_door: unknown, enabled: boolean) => ({
    data: enabled ? googleRankings : undefined,
  }),
}));

describe('usePostVisitNudgeCandidate', () => {
  beforeEach(() => {
    bookmarks = [];
    rankedEntries = [];
    googleRankings = [];
    localStorage.clear();
  });

  it('returns null when disabled (e.g. a Guest, or an admin persona)', () => {
    bookmarks = [{ id: 'b1', placeId: '00000000-0000-0000-0000-0000000000f5' }];
    const { result } = renderHook(() => usePostVisitNudgeCandidate('user-1', false));
    expect(result.current).toBeNull();
  });

  it('offers a catalogue bookmark that has not been ranked yet', () => {
    // A real catalogue fixture id (Cafe Bahar) so placeById resolves it.
    bookmarks = [{ id: 'b1', placeId: '00000000-0000-0000-0000-0000000000f5' }];
    rankedEntries = [];
    const { result } = renderHook(() => usePostVisitNudgeCandidate('user-1', true));
    expect(result.current).toEqual({
      kind: 'catalogue',
      placeId: '00000000-0000-0000-0000-0000000000f5',
      placeName: 'Cafe Bahar',
    });
  });

  it('skips a catalogue bookmark that is already ranked and falls back to a Google-saved place', () => {
    bookmarks = [{ id: 'b1', placeId: '00000000-0000-0000-0000-0000000000f5' }];
    rankedEntries = [{ placeId: '00000000-0000-0000-0000-0000000000f5' }];
    googleRankings = [];
    saveGooglePlace({
      placeId: 'google-1',
      name: 'Testville Diner',
      address: '1 Test St',
      types: ['restaurant'],
    });

    const { result } = renderHook(() => usePostVisitNudgeCandidate('user-1', true));
    expect(result.current).toEqual({
      kind: 'google',
      placeId: 'google-1',
      placeName: 'Testville Diner',
      door: 'eat',
      types: ['restaurant'],
    });

    removeSavedGooglePlace('google-1');
  });

  it('returns null once everything bookmarked is already ranked', () => {
    bookmarks = [{ id: 'b1', placeId: '00000000-0000-0000-0000-0000000000f5' }];
    rankedEntries = [{ placeId: '00000000-0000-0000-0000-0000000000f5' }];
    googleRankings = [];

    const { result } = renderHook(() => usePostVisitNudgeCandidate('user-1', true));
    expect(result.current).toBeNull();
  });
});
