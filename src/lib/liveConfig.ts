// Phase 3: replaces the static places/categories/areas/appConfig arrays with
// real data fetched once from Supabase at app bootstrap.
//
// Why a startup prefetch rather than a TanStack Query hook per screen (the
// literal wording in PHASE_3_HANDOFF.md's seam table): these four fixture
// modules are imported *synchronously* by name (`placeById(id)`,
// `categoryName(id)`, the raw `places`/`categories`/`areas` arrays) from over
// two dozen screen components across every part of the app — Phase 2 built
// them as plain arrays, not as data accessed only through data/hooks.ts.
// Converting every one of those call sites to a loading-aware hook would be
// a screen-by-screen rewrite far outside a data-layer swap, and the
// underlying reference dataset is tiny (17 places, 7 categories, 8 areas, 7
// config keys) — exactly the kind of small, mostly-static data a one-time
// full load suits. `loadLiveConfig()` is awaited once in `src/main.tsx`
// before the app ever renders, so every synchronous call site sees real,
// live values from the first paint onward; nothing renders against stale
// defaults. This is a deliberate, disclosed deviation from the "hook" seam
// description, not a shortcut — see PHASE_3_COMPLETION_REPORT.md §2.
import { supabase } from './supabaseClient';
import { places, type Place, type PlaceType, type GapTone } from '../fixtures/places';
import { categories } from '../fixtures/categories';
import { areas } from '../fixtures/areas';
import { appConfig } from '../fixtures/appConfig';

interface PlaceRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  vibe: string | null;
  category_id: string;
  neighborhood: string;
  area_id: string | null;
  price_level: string | null;
  reason: string;
  history: string | null;
  tags: string[];
  gap_tone: string | null;
  gap_points: number | null;
  locals: number;
  visitors: number;
  drive: string | null;
  outside_fame_rank: number | null;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
  place_eat_details: {
    wait_time: string | null;
    serving_hours: string | null;
    dishes: number | null;
    gem: boolean;
  } | null;
  place_explore_details: { crowd_level: string | null; best: string | null } | null;
}

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type as PlaceType,
    vibe: row.vibe ?? '',
    categoryId: row.category_id,
    neighborhood: row.neighborhood,
    areaId: row.area_id,
    priceLevel: row.price_level ?? '',
    reason: row.reason,
    history: row.history,
    tags: row.tags,
    gapTone: (row.gap_tone as GapTone | null) ?? null,
    gapPoints: row.gap_points,
    locals: row.locals,
    visitors: row.visitors,
    drive: row.drive,
    outsideFameRank: row.outside_fame_rank,
    isActive: row.is_active,
    lat: row.lat,
    lng: row.lng,
    googlePlaceId: row.google_place_id,
    address: row.address ?? '',
    phone: row.phone ?? '',
    hours: row.hours ?? '',
    waitTime: row.place_eat_details?.wait_time ?? undefined,
    servingHours: row.place_eat_details?.serving_hours ?? undefined,
    dishes: row.place_eat_details?.dishes ?? undefined,
    gem: row.place_eat_details?.gem ?? false,
    crowdLevel: row.place_explore_details?.crowd_level ?? undefined,
    best: row.place_explore_details?.best ?? undefined,
  };
}

let loaded = false;
let loadPromise: Promise<void> | null = null;

/** Idempotent — safe to call more than once; only the first call fetches. */
export function loadLiveConfig(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [placesRes, categoriesRes, areasRes, configRes] = await Promise.all([
      supabase.from('places').select('*, place_eat_details(*), place_explore_details(*)'),
      supabase.from('categories').select('id, name'),
      supabase.from('areas').select('id, name, coverage_depth_label, lat, lng'),
      supabase.from('app_config').select('key, value'),
    ]);

    if (placesRes.error) throw placesRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (areasRes.error) throw areasRes.error;
    if (configRes.error) throw configRes.error;

    places.length = 0;
    places.push(...(placesRes.data as unknown as PlaceRow[]).map(toPlace));

    categories.length = 0;
    categories.push(...categoriesRes.data);

    areas.length = 0;
    areas.push(
      ...areasRes.data.map((a) => ({
        id: a.id,
        name: a.name,
        coverageDepthLabel: a.coverage_depth_label ?? '',
        lat: a.lat,
        lng: a.lng,
      })),
    );

    const configByKey = new Map(
      configRes.data.map((row) => [row.key, row.value as Record<string, unknown>]),
    );
    const num = (key: string, field: string, fallback: number) => {
      const v = configByKey.get(key)?.[field];
      return typeof v === 'number' ? v : fallback;
    };
    const str = <T extends string>(key: string, field: string, fallback: T) => {
      const v = configByKey.get(key)?.[field];
      return typeof v === 'string' ? (v as T) : fallback;
    };

    Object.assign(appConfig, {
      rankingThresholdLocals: num(
        'ranking_threshold_locals',
        'threshold',
        appConfig.rankingThresholdLocals,
      ),
      guestPaywallAtSearch: num(
        'guest_paywall_at',
        'search_number',
        appConfig.guestPaywallAtSearch,
      ),
      secondComparisonMode: str('second_comparison', 'mode', appConfig.secondComparisonMode),
      homeMode: str('home_mode', 'mode', appConfig.homeMode),
      intakeSteps: num('intake_length', 'steps', appConfig.intakeSteps) as 2 | 3,
      rankHonesty: str('rank_honesty', 'mode', appConfig.rankHonesty),
      bridgePromptMode: str('bridge_prompt', 'mode', appConfig.bridgePromptMode),
    });

    loaded = true;
  })();

  return loadPromise;
}
