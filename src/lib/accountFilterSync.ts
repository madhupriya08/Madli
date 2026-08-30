import { useEffect, useRef } from 'react';
import { usePersona } from '../dev/PersonaContext';
import { useSearch, filterSliceOf, isFilterSliceAtDefaults } from './searchState';
import { fetchSavedFilters, saveFilters } from '../data/searchFilters';

const SAVE_DEBOUNCE_MS = 800;

/**
 * P5 §5: SearchProvider persists filters to sessionStorage for everyone —
 * deliberately ephemeral ("what I am looking for right now" should not
 * survive into next week), which covers a reload but not a genuine return
 * visit (a fresh tab, a different device). For a signed-in User
 * specifically, this closes that gap: read the account's last-saved
 * filters once per fresh session — only ever into still-default local
 * state, never overwriting an in-progress edit — and keep
 * profiles.search_filters in sync afterwards. Guests are untouched; both
 * effects below are no-ops without a real session.
 */
export function useAccountFilterSync(): void {
  const { hasSession, userId, sessionLoading } = usePersona();
  const { search, setSearch } = useSearch();
  const appliedForUserId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sessionLoading || !hasSession || !userId) return;
    if (appliedForUserId.current === userId) return;
    appliedForUserId.current = userId;
    if (!isFilterSliceAtDefaults(search)) return;

    let cancelled = false;
    fetchSavedFilters(userId)
      .then((saved) => {
        if (!cancelled && saved) setSearch(saved);
      })
      .catch(() => {
        // Best-effort — a failed read must not block using the filters the
        // person already has locally.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, userId, sessionLoading]);

  const sliceKey = JSON.stringify(filterSliceOf(search));

  useEffect(() => {
    if (sessionLoading || !hasSession || !userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveFilters(userId, filterSliceOf(search)).catch(() => {
        // Best-effort — losing one write is not worth surfacing an error for.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, userId, sessionLoading, sliceKey]);
}
