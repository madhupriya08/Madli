import type { Page } from '@playwright/test';
import { places, type Place } from '../src/fixtures/places';
import { categories } from '../src/fixtures/categories';
import { areas } from '../src/fixtures/areas';
import { appConfig } from '../src/fixtures/appConfig';

// Phase 4 §9: this sandbox cannot reach the live Supabase project at all
// (confirmed real, current CONNECT-403 from the proxy — see
// PHASE_4_QA_REPORT.md §4), and `src/main.tsx` intentionally fails the whole
// app to a fatal-error screen if its one startup fetch
// (`loadLiveConfig()`) doesn't succeed — by design, not a bug (it would
// rather show nothing than show stale/wrong reference data). That means a
// real accessibility scan against a real running dev server needs the app to
// actually finish booting, which needs that fetch to succeed.
//
// This intercepts exactly the requests `loadLiveConfig()` makes and answers
// them with the same Phase 1 seed-derived data `src/fixtures/*` already
// carries (converted back to the real snake_case row shape) — not synthetic
// placeholder data, the same values a real successful load would produce.
// Every other REST call (bookmarks, plans, business_claims, ranked_entries,
// reports, admin_audit_log, etc.) gets an empty-but-successful response, so
// screens render their real empty states rather than erroring. This is the
// same principle Phase 2/3's Vitest+RTL tests already use (mock the network
// boundary, exercise the real rendered code) — applied here at the browser's
// network layer instead of a module mock, since a real browser is what an
// axe-core/keyboard accessibility pass needs.
function placeToRow(p: Place) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    vibe: p.vibe,
    category_id: p.categoryId,
    neighborhood: p.neighborhood,
    area_id: p.areaId,
    price_level: p.priceLevel,
    reason: p.reason,
    history: p.history,
    tags: p.tags,
    gap_tone: p.gapTone,
    gap_points: p.gapPoints,
    locals: p.locals,
    visitors: p.visitors,
    drive: p.drive,
    outside_fame_rank: p.outsideFameRank,
    is_active: p.isActive,
    address: p.address,
    phone: p.phone,
    hours: p.hours,
    place_eat_details:
      p.type === 'eat'
        ? {
            wait_time: p.waitTime ?? null,
            serving_hours: p.servingHours ?? null,
            dishes: p.dishes ?? null,
            gem: p.gem ?? false,
          }
        : null,
    place_explore_details:
      p.type === 'explore'
        ? { crowd_level: p.crowdLevel ?? null, best: p.best ?? null }
        : null,
  };
}

const APP_CONFIG_ROWS = [
  { key: 'ranking_threshold_locals', value: { threshold: appConfig.rankingThresholdLocals } },
  { key: 'guest_paywall_at', value: { search_number: appConfig.guestPaywallAtSearch } },
  { key: 'second_comparison', value: { mode: appConfig.secondComparisonMode } },
  { key: 'home_mode', value: { mode: appConfig.homeMode } },
  { key: 'intake_length', value: { steps: appConfig.intakeSteps } },
  { key: 'rank_honesty', value: { mode: appConfig.rankHonesty } },
  { key: 'bridge_prompt', value: { mode: appConfig.bridgePromptMode } },
];

/** Registers boot + catch-all REST mocks. Call before the first `page.goto`. */
export async function mockBoot(page: Page): Promise<void> {
  const placeRows = places.map(placeToRow);
  const categoryRows = categories.map((c) => ({ id: c.id, name: c.name }));
  const areaRows = areas.map((a) => ({
    id: a.id,
    name: a.name,
    coverage_depth_label: a.coverageDepthLabel,
  }));

  // Playwright matches the *last-registered* route first, so the catch-all
  // goes first here — the four specific handlers registered after it take
  // precedence for their own tables.
  await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/places*', (route) => route.fulfill({ json: placeRows }));
  await page.route('**/rest/v1/categories*', (route) => route.fulfill({ json: categoryRows }));
  await page.route('**/rest/v1/areas*', (route) => route.fulfill({ json: areaRows }));
  await page.route('**/rest/v1/app_config*', (route) => route.fulfill({ json: APP_CONFIG_ROWS }));
}
