import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * What the person actually asked for, carried from intake (S15) and filters
 * (S16) through to results (S17/S18) and the map (S21).
 *
 * Before this existed, every one of those screens collected input into its
 * own local useState and then navigated away, dropping it — results queried
 * the whole catalogue by `type` alone and nothing else the person had said
 * was ever applied. This is the missing carrier, not a redesign of the
 * screens: they keep their own UI and just read and write here instead of
 * into state that dies on navigate.
 *
 * Persisted to sessionStorage because results is a route someone reloads,
 * shares, or reaches via back — losing their filters on refresh is the same
 * bug in a different costume. sessionStorage, not localStorage: "what I am
 * looking for right now" should not survive into next week.
 */

export type Door = 'eat' | 'explore';
export type ConstraintMode = 'time' | 'radius';
export type AreaType = 'Indoor' | 'Outdoor' | 'Mixed';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SearchState {
  door: Door;
  /** Intake step 1 — a vibe chip, or null if skipped. */
  vibe: string | null;
  /** Intake step 2 — the person has a time in mind or a distance, never both. */
  constraintMode: ConstraintMode;
  /** Raw input; empty string means "not specified". Minutes or km per constraintMode. */
  constraintValue: string;
  /** Intake step 3 / S9 — free-typed area text. */
  areaText: string;
  /** Google Place ID for the area, when it came from autocomplete rather than typing. */
  areaPlaceId: string | null;
  /** Where to search around: device geolocation, or the resolved area centre. */
  center: LatLng | null;
  /** How `center` was obtained — drives the honest "Showing picks near…" line. */
  centerSource: 'geolocation' | 'area' | 'default' | null;
  /** S16 filters. */
  allowsPets: boolean;
  servesPetFood: boolean;
  /** Explore door only; null means "no preference". */
  areaType: AreaType | null;
}

const DEFAULT_STATE: SearchState = {
  door: 'eat',
  vibe: null,
  constraintMode: 'time',
  constraintValue: '',
  areaText: '',
  areaPlaceId: null,
  center: null,
  centerSource: null,
  allowsPets: false,
  servesPetFood: false,
  areaType: null,
};

/**
 * Hyderabad city centre. Used only when someone has neither granted location
 * nor typed an area — a search has to start somewhere, and this is labelled
 * as a fallback in the UI (`centerSource: 'default'`) rather than presented
 * as the person's actual location.
 */
export const DEFAULT_CENTER: LatLng = { lat: 17.385, lng: 78.4867 };

const STORAGE_KEY = 'madli.search';

function readStored(): SearchState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SearchState>;
    // Spread over the defaults rather than trusting the blob: a stored shape
    // from an older build must not leave a field undefined at a call site
    // that assumes it exists.
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStored(state: SearchState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode, storage disabled, quota — the search still works for
    // this navigation, it just will not survive a reload. Not worth failing.
  }
}

interface SearchContextValue {
  search: SearchState;
  /** Merge a partial update. Persists. */
  setSearch: (patch: Partial<SearchState>) => void;
  /** Back to defaults — used by "start over" affordances. */
  resetSearch: () => void;
  /**
   * Where to actually search, with the fallback applied. Never null, so call
   * sites do not each invent their own default.
   */
  effectiveCenter: LatLng;
  /** Search radius in metres, derived from the intake constraint. */
  radiusMeters: number;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/** Average city driving speed, km/h — turns "I have 25 minutes" into a radius. */
const CITY_SPEED_KMH = 20;
const DEFAULT_RADIUS_M = 3000;
const MIN_RADIUS_M = 500;
/** Places nearby-search caps radius at 50km; asking for more is an error, not a wider net. */
const MAX_RADIUS_M = 50_000;

/**
 * Minutes-or-kilometres → metres.
 *
 * "Minutes you have" is a round trip in the person's head, so half of it is
 * the outbound leg — a 30-minute budget means roughly 15 minutes out, not 30.
 */
export function radiusFromConstraint(mode: ConstraintMode, value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RADIUS_M;
  const metres = mode === 'time' ? (n / 2 / 60) * CITY_SPEED_KMH * 1000 : n * 1000;
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.round(metres)));
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [search, setState] = useState<SearchState>(readStored);

  const setSearch = useCallback((patch: Partial<SearchState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  const resetSearch = useCallback(() => {
    setState(DEFAULT_STATE);
    writeStored(DEFAULT_STATE);
  }, []);

  const value = useMemo<SearchContextValue>(
    () => ({
      search,
      setSearch,
      resetSearch,
      effectiveCenter: search.center ?? DEFAULT_CENTER,
      radiusMeters: radiusFromConstraint(search.constraintMode, search.constraintValue),
    }),
    [search, setSearch, resetSearch],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
}
