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

/** S15 step 1 — who the outing is for. Prototype's `whoChips`. */
export const WHO_OPTIONS = ['Solo', 'Couple', 'Family', 'Friends', 'Parents'] as const;

/** S15 step 2 — the occasion. Prototype's `occChips`. */
export const OCCASION_OPTIONS = [
  'Casual',
  'Date',
  'Celebration',
  'Work lunch',
  'Late-night',
] as const;

/**
 * S15 step 3 — the budget cap, the third hard-constraint the prototype offers
 * alongside time and distance. Per-head rupee caps, exactly as written in the
 * prototype's `budgetCapChips`.
 */
export const BUDGET_CAP_OPTIONS = [
  'Under ₹150 a head',
  'Under ₹400 a head',
  'Under ₹800 a head',
  'Price is not the issue',
] as const;

/** S16 vibe chips. Multi-select, and a different list behind each door. */
export const EAT_VIBE_OPTIONS = [
  'Tiffin',
  'Diner',
  'Michelin-style',
  'Food truck / stall',
  'Date night',
  'Calm and pleasant',
] as const;

export const EXPLORE_VIBE_OPTIONS = [
  'Historical',
  'Devotional',
  'Sightseeing',
  'Nightlife / clubs',
  'Concerts',
  'Scenic',
] as const;

/** S16 budget band — a price range, not the per-head cap S15 asks for. */
export const BUDGET_OPTIONS = ['Under ₹150', '₹150–300', '₹300–600', '₹600+'] as const;

/** S16 kitchen. Eat door only — Explore has no kitchen to describe. */
export const KITCHEN_OPTIONS = ['Veg-only kitchen', 'Veg available', 'Non-veg'] as const;

/**
 * S16 distance presets, mapped to kilometres.
 *
 * These write `radiusKm` rather than a field of their own: "Under 5 km" and
 * the intake distance input are the same axis, and two independent sources of
 * truth for one radius is how you get a search that ignores what someone just
 * told it. `null` means "Any distance" — no radius preference at all.
 */
export const DISTANCE_PRESETS: ReadonlyArray<{ label: string; km: string | null }> = [
  { label: 'Under 2 km', km: '2' },
  { label: 'Under 5 km', km: '5' },
  { label: 'Under 15 km', km: '15' },
  { label: 'Any distance', km: null },
];

export interface SearchState {
  door: Door;
  /** S15 step 1 — who it is for, or null if skipped. */
  who: string | null;
  /** S15 step 2 — the occasion, or null if skipped. */
  occasion: string | null;
  /** S15 step 3 — a per-head budget cap, the third hard constraint. */
  budgetCap: string | null;
  /** S16 vibe chips. Multi-select; empty means no vibe preference. */
  vibes: string[];
  /**
   * @deprecated The first selected vibe. Kept in sync with `vibes` so
   * `pickReason`, analytics, and older sessionStorage blobs keep working.
   */
  vibe: string | null;
  /** Intake step 3 — which of the two fields last drove the search radius. */
  constraintMode: ConstraintMode;
  /** Minutes budget. Empty means unspecified. Independent of radiusKm. */
  timeMinutes: string;
  /** Distance in km. Empty means unspecified. Independent of timeMinutes. */
  radiusKm: string;
  /**
   * @deprecated Kept in sync with timeMinutes/radiusKm so older sessionStorage
   * blobs and analytics that still read constraintValue keep working.
   */
  constraintValue: string;
  /** Intake step 4 / S9 — free-typed area text. */
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
  /** S16 budget band. */
  budget: string | null;
  /** S16 kitchen. Eat door only. */
  kitchen: string | null;
  /** S16 switches that Google has no structured field for — folded into the query text. */
  familyFriendly: boolean;
  coupleFriendly: boolean;
  openLate: boolean;
  /** "Skip long waits" on Eat, "Avoid crowded times" on Explore. */
  waitCare: boolean;
  /** Maps to the Places `isOpenNow` request field — a real filter, not a query word. */
  openNow: boolean;
  /** Explore door only; null means "no preference". */
  areaType: AreaType | null;
}

const DEFAULT_STATE: SearchState = {
  door: 'eat',
  who: null,
  occasion: null,
  budgetCap: null,
  vibes: [],
  vibe: null,
  constraintMode: 'time',
  timeMinutes: '',
  radiusKm: '',
  constraintValue: '',
  areaText: '',
  areaPlaceId: null,
  center: null,
  centerSource: null,
  allowsPets: false,
  servesPetFood: false,
  budget: null,
  kitchen: null,
  familyFriendly: false,
  coupleFriendly: false,
  openLate: false,
  waitCare: false,
  // The prototype defaults this on. We default it off: "open now" silently
  // removes real places from a list that only ever shows three, and someone
  // planning tomorrow's breakfast at 11pm would see an empty screen with no
  // hint as to why. It is one tap to turn on.
  openNow: false,
  areaType: null,
};

export function vibeOptionsFor(door: Door): readonly string[] {
  return door === 'explore' ? EXPLORE_VIBE_OPTIONS : EAT_VIBE_OPTIONS;
}

/**
 * Hyderabad city centre. Used only when someone has neither granted location
 * nor typed an area — a search has to start somewhere, and this is labelled
 * as a fallback in the UI (`centerSource: 'default'`) rather than presented
 * as the person's actual location.
 */
export const DEFAULT_CENTER: LatLng = { lat: 17.385, lng: 78.4867 };

/** True when the person already chose a real origin (GPS or typed area). */
export function hasSearchOrigin(search: SearchState): boolean {
  return (
    search.center != null &&
    (search.centerSource === 'geolocation' || search.centerSource === 'area')
  );
}

/** Straight-line distance in metres. Used to keep catalogue places inside the search radius. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

const STORAGE_KEY = 'madli.search';

function readStored(): SearchState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SearchState> & { constraintValue?: string };
    const next = { ...DEFAULT_STATE, ...parsed };
    // Older blobs only had constraintValue + constraintMode.
    if (!parsed.timeMinutes && !parsed.radiusKm && parsed.constraintValue) {
      if (next.constraintMode === 'radius') next.radiusKm = parsed.constraintValue;
      else next.timeMinutes = parsed.constraintValue;
    }
    // Older blobs had a single `vibe`, before S16's chips became multi-select.
    if (!Array.isArray(parsed.vibes) && parsed.vibe) next.vibes = [parsed.vibe];
    if (!Array.isArray(next.vibes)) next.vibes = [];
    next.vibe = next.vibes[0] ?? null;
    next.constraintValue = next.constraintMode === 'radius' ? next.radiusKm : next.timeMinutes;
    return next;
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
  /** Clears everything S16 owns, leaving door, origin, and the S15 answers alone. */
  resetFilters: () => void;
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

/** The S16 fields, so "Reset filters" clears exactly those and nothing else. */
const FILTER_DEFAULTS: Partial<SearchState> = {
  vibes: [],
  vibe: null,
  budget: null,
  kitchen: null,
  allowsPets: false,
  servesPetFood: false,
  familyFriendly: false,
  coupleFriendly: false,
  openLate: false,
  waitCare: false,
  openNow: false,
  areaType: null,
};

export function SearchProvider({ children }: { children: ReactNode }) {
  const [search, setState] = useState<SearchState>(readStored);

  const setSearch = useCallback((patch: Partial<SearchState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.timeMinutes !== undefined && patch.constraintMode === undefined) {
        next.constraintMode = 'time';
      }
      if (patch.radiusKm !== undefined && patch.constraintMode === undefined) {
        next.constraintMode = 'radius';
      }
      next.constraintValue = next.constraintMode === 'radius' ? next.radiusKm : next.timeMinutes;
      // `vibes` is the real field; `vibe` trails it so the single-vibe call
      // sites (pickReason, analytics) keep reading something meaningful.
      if (patch.vibes !== undefined) next.vibe = next.vibes[0] ?? null;
      else if (patch.vibe !== undefined) next.vibes = patch.vibe ? [patch.vibe] : [];
      writeStored(next);
      return next;
    });
  }, []);

  const resetSearch = useCallback(() => {
    setState(DEFAULT_STATE);
    writeStored(DEFAULT_STATE);
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, ...FILTER_DEFAULTS } as SearchState;
      writeStored(next);
      return next;
    });
  }, []);

  const value = useMemo<SearchContextValue>(
    () => ({
      search,
      setSearch,
      resetSearch,
      resetFilters,
      effectiveCenter: search.center ?? DEFAULT_CENTER,
      radiusMeters: radiusFromConstraint(
        search.constraintMode,
        search.constraintMode === 'radius' ? search.radiusKm : search.timeMinutes,
      ),
    }),
    [search, setSearch, resetSearch, resetFilters],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
}
