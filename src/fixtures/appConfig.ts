/**
 * Phase 3: loaded for real from `app_config` at app bootstrap (see
 * `loadLiveConfig()` in `src/lib/liveConfig.ts`, awaited once in
 * `src/main.tsx` before the app renders) — never a per-render fetch, since
 * this is a handful of static config flags read synchronously all over the
 * app. Defaults below are the Phase 1 seed values and only serve as the
 * pre-load shape (e.g., in a unit test that never calls loadLiveConfig()).
 */
export interface AppConfig {
  rankingThresholdLocals: number;
  guestPaywallAtSearch: number;
  secondComparisonMode: 'always' | 'skippable' | 'removed';
  homeMode: 'two_doors' | 'search_first';
  intakeSteps: 2 | 3;
  rankHonesty: 'rank_only' | 'rank_and_gap' | 'rank_gap_contributors';
  bridgePromptMode: 'direct_question' | 'contextual_line' | 'quiet_link';
}

export const appConfig: AppConfig = {
  rankingThresholdLocals: 50,
  guestPaywallAtSearch: 4,
  secondComparisonMode: 'skippable',
  homeMode: 'two_doors',
  intakeSteps: 3,
  rankHonesty: 'rank_and_gap',
  bridgePromptMode: 'contextual_line',
};
