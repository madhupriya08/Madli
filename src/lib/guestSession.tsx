import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { appConfig } from '../fixtures/appConfig';

/**
 * Guest session state — search counter, "None of these" free-use tracking,
 * the per-session reject list, and the local/visitor answer. Phase 1
 * confirmed (§8 open question #1) this is genuinely client-side/session-only;
 * there is no backend table for a guest, so every field here lives only as
 * long as this tab does.
 *
 * Applied filters are NOT duplicated here. They already persist for the
 * whole session, guest or not, through `searchState.tsx`'s own sessionStorage
 * write on every `setSearch()` call — adding a second copy in this module
 * would be exactly the "new, separate mechanism" this is meant to avoid.
 *
 * Rules encoded here (README "Rules that must survive implementation" 2 & 3):
 *  - "None of these" and "Show me two more" both push shown places into the
 *    reject list; rejected places never reappear this session.
 *  - The guest search cap is shared across both doors (Eat/Explore) — one
 *    counter, not two.
 *
 * `noneOfTheseUsedOnce`/`useFreeNoneOfThese` are kept for anything else still
 * reading them, but "None of these" and "Show me two more" no longer consult
 * them for gating — both now prompt signup immediately for a guest,
 * superseding the one-free-use quota those two fields used to track. See
 * ResultsScreen.tsx.
 *
 * `residentStatus` is the local-vs-visiting answer asked once, right after
 * choosing a location (S8) — session-only for guests, by the same "no
 * backend table for anonymous users" rule as everything else here. A
 * signed-in person's answer instead persists to `profiles.resident_status`
 * (src/data/googleRankings.ts's setResidentStatus) — that table row already
 * existed for the optional Google-place ranking flow, and is reused here
 * rather than adding a second column for the same fact.
 */

export type ResidentStatus = 'local' | 'visitor';

interface GuestSessionValue {
  searchCount: number;
  /** Increments the shared search counter and reports whether this search should be paywalled. */
  recordSearch: () => { paywalled: boolean; searchNumber: number };
  rejectedPlaceIds: ReadonlySet<string>;
  isRejected: (placeId: string) => boolean;
  rejectPlaces: (placeIds: string[]) => void;
  /** @deprecated Kept for compatibility; no longer consulted for gating — see module comment. */
  useFreeNoneOfThese: () => boolean;
  noneOfTheseUsedOnce: boolean;
  residentStatus: ResidentStatus | null;
  setResidentStatus: (status: ResidentStatus | null) => void;
  reset: () => void;
}

const GuestSessionContext = createContext<GuestSessionValue | null>(null);

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [searchCount, setSearchCount] = useState(0);
  const [rejectedPlaceIds, setRejectedPlaceIds] = useState<Set<string>>(new Set());
  const [noneOfTheseUsedOnce, setNoneOfTheseUsedOnce] = useState(false);
  const [residentStatus, setResidentStatusState] = useState<ResidentStatus | null>(null);

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
      residentStatus,
      setResidentStatus: setResidentStatusState,
      reset: () => {
        setSearchCount(0);
        setRejectedPlaceIds(new Set());
        setNoneOfTheseUsedOnce(false);
        setResidentStatusState(null);
      },
    }),
    [searchCount, rejectedPlaceIds, noneOfTheseUsedOnce, residentStatus],
  );

  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession(): GuestSessionValue {
  const ctx = useContext(GuestSessionContext);
  if (!ctx) throw new Error('useGuestSession must be used within a GuestSessionProvider');
  return ctx;
}
