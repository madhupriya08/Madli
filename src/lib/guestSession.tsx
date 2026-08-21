import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { appConfig } from '../fixtures/appConfig';

/**
 * Guest session state — search counter, "None of these" free-use tracking,
 * and the per-session reject list. Phase 1 confirmed (§8 open question #1)
 * this is genuinely client-side/session-only; there is no backend table for
 * it and Phase 3 does not need to touch this module at all (no TODO seam —
 * this one stays exactly as-is in production).
 *
 * Rules encoded here (README "Rules that must survive implementation" 2 & 3):
 *  - "None of these" and "Show me two more" both push shown places into the
 *    reject list; rejected places never reappear this session.
 *  - Guests get one free "None of these"; the second use is the paywall
 *    intercept point.
 *  - The guest search cap is shared across both doors (Eat/Explore) — one
 *    counter, not two.
 */

interface GuestSessionValue {
  searchCount: number;
  /** Increments the shared search counter and reports whether this search should be paywalled. */
  recordSearch: () => { paywalled: boolean; searchNumber: number };
  rejectedPlaceIds: ReadonlySet<string>;
  isRejected: (placeId: string) => boolean;
  rejectPlaces: (placeIds: string[]) => void;
  /** Consumes the one free "None of these". Returns true if this use was free, false if it should intercept. */
  useFreeNoneOfThese: () => boolean;
  noneOfTheseUsedOnce: boolean;
  reset: () => void;
}

const GuestSessionContext = createContext<GuestSessionValue | null>(null);

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [searchCount, setSearchCount] = useState(0);
  const [rejectedPlaceIds, setRejectedPlaceIds] = useState<Set<string>>(new Set());
  const [noneOfTheseUsedOnce, setNoneOfTheseUsedOnce] = useState(false);

  const value = useMemo<GuestSessionValue>(
    () => ({
      searchCount,
      recordSearch: () => {
        const searchNumber = searchCount + 1;
        setSearchCount(searchNumber);
        return { paywalled: searchNumber >= appConfig.guestPaywallAtSearch, searchNumber };
      },
      rejectedPlaceIds,
      isRejected: (placeId) => rejectedPlaceIds.has(placeId),
      rejectPlaces: (placeIds) => {
        setRejectedPlaceIds((prev) => {
          const next = new Set(prev);
          for (const id of placeIds) next.add(id);
          return next;
        });
      },
      useFreeNoneOfThese: () => {
        if (!noneOfTheseUsedOnce) {
          setNoneOfTheseUsedOnce(true);
          return true;
        }
        return false;
      },
      noneOfTheseUsedOnce,
      reset: () => {
        setSearchCount(0);
        setRejectedPlaceIds(new Set());
        setNoneOfTheseUsedOnce(false);
      },
    }),
    [searchCount, rejectedPlaceIds, noneOfTheseUsedOnce],
  );

  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession(): GuestSessionValue {
  const ctx = useContext(GuestSessionContext);
  if (!ctx) throw new Error('useGuestSession must be used within a GuestSessionProvider');
  return ctx;
}
