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
/**
 * S15 step 3's own toggle: one hard constraint, mutually exclusive. Renamed
 * from the old `'time' | 'radius'` — this used to be "which of two freeform
 * fields did you fill in", which is not what the design actually asks: a
 * three-way choice between a time window, a drive-time budget, or a spend
 * cap, each with its own fixed presets rather than free text.
 */
export type ConstraintMode = 'time' | 'drive' | 'budget';
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

/**
 * S15 step 3's "Time window" chips — when, not how far. Exactly the
 * prototype's `timeChips`.
 */
export const TIME_WINDOW_OPTIONS = [
  'Right now',
  'Tonight, 7–9pm',
  'Tomorrow, breakfast',
  'This weekend',
] as const;

/**
 * S15 step 3's "Drive time" chips — a preset budget for how far someone is
 * willing to go, not a raw kilometre figure. Exactly the prototype's
 * `radiusChips` (its own state calls this field `radius`, which reads as a
 * distance — it is really a duration; named `driveTimePreset` here instead).
 */
export const DRIVE_TIME_OPTIONS = ['10 min', '20 min', '45 min', '3 hours'] as const;

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
 * S16's own Distance filter, in kilometres — independent of S15's hard
 * constraint below. The prototype keeps these as two separate pieces of
 * state (`st.dist` vs `st.radius`); an earlier build here had conflated them
 * into one shared field, which meant opening Filters and picking a distance
 * silently overwrote whatever S15's hard constraint had been. `null` means
 * "Any distance" — no preference at all.
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
  /** S15 step 3 — which of the three (mutually exclusive) is active. */
  constraintMode: ConstraintMode;
  /** Set only when constraintMode === 'time'. One of TIME_WINDOW_OPTIONS. */
  timeWindow: string | null;
  /** Set only when constraintMode === 'drive'. One of DRIVE_TIME_OPTIONS. */
  driveTimePreset: string | null;
  /**
   * S16's own Distance filter, in km — independent of S15's constraintMode
   * above (see DISTANCE_PRESETS). Empty string means "no preference set".
   */
  distanceKm: string;
  /** Set at S8 (Pick your area), before intake is ever reached. */
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
  timeWindow: null,
  driveTimePreset: null,
  distanceKm: '',
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
    const parsed = JSON.parse(raw) as Partial<SearchState>;
    const next = { ...DEFAULT_STATE, ...parsed };
    // Older blobs had a single `vibe`, before S16's chips became multi-select.
    if (!Array.isArray(parsed.vibes) && parsed.vibe) next.vibes = [parsed.vibe];
    if (!Array.isArray(next.vibes)) next.vibes = [];
    next.vibe = next.vibes[0] ?? null;
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

const DRIVE_PRESET_MINUTES: Record<string, number> = {
  '10 min': 10,
  '20 min': 20,
  '45 min': 45,
  '3 hours': 180,
};

function clampRadius(metres: number): number {
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.round(metres)));
}

/**
 * The actual live-search radius, in metres.
 *
 * Two different fields can carry distance information, and only one of them
 * is really "a distance": S16's own Distance filter (kilometres, direct) is
 * the more specific, most-recently-adjusted answer, so it wins outright when
 * set. Otherwise, if S15's hard constraint is a drive-time preset, that
 * one-way budget becomes a radius via average city driving speed. "Time
 * window" (when, not how far) and "budget" carry no distance at all, so both
 * fall back to the same default every search needs to start somewhere.
 */
export function radiusFromConstraint(search: {
  constraintMode: ConstraintMode;
  driveTimePreset: string | null;
  distanceKm: string;
}): number {
  const km = Number.parseFloat(search.distanceKm);
  if (Number.isFinite(km) && km > 0) return clampRadius(km * 1000);

  if (search.constraintMode === 'drive' && search.driveTimePreset) {
    const minutes = DRIVE_PRESET_MINUTES[search.driveTimePreset];
    if (minutes) return clampRadius((minutes / 60) * CITY_SPEED_KMH * 1000);
  }

  return DEFAULT_RADIUS_M;
}

/** The S16 fields, so "Reset filters" clears exactly those and nothing else. */
const FILTER_DEFAULTS: Partial<SearchState> = {
  vibes: [],
  vibe: null,
  budget: null,
  kitchen: null,
  distanceKm: '',
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
      radiusMeters: radiusFromConstraint(search),
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
