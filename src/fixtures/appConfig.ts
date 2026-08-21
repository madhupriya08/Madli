/**
 * Mirrors the real `app_config` table (Phase 1, supabase/migrations/20260820100200_areas_categories_config.sql).
 * Same keys, same default values — one source of truth for the six product
 * config flags plus the ranking threshold, exactly like the real table.
 *
 * TODO(phase-3): replace this module with a TanStack Query hook reading
 * `supabase.from('app_config').select()`.
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
