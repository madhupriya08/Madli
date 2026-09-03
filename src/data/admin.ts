// Phase 3: real Supabase calls — each function now calls the matching
// SECURITY DEFINER Postgres function Phase 1 built and Phase 3 verified live
// (see PHASE_3_COMPLETION_REPORT.md §4): real invalid_credentials/access_denied
// rows for fn_log_admin_login_attempt.
import { supabase, createDetachedAuthClient } from '../lib/supabaseClient';
import type { AdminAccountRow, AdminAccountStatus, AdminTier, GemCandidateFixture } from '../fixtures/admin';

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/**
 * Phase 4 §5: replaces the fixture-backed `adminAccounts` array — real emails
 * (from `auth.users`, otherwise unreachable via the anon key) via the
 * `fn_admin_list_accounts` SECURITY DEFINER function. Verified live: an admin
 * session gets the real list; a signed-in non-admin gets a real 42501; anon
 * can't invoke the function at all (PHASE_4_QA_REPORT.md §5).
 */
/**
 * Phase 4 §6: real admin-wide count for the Analytics dashboard (S42),
 * replacing `mockDb.rankedEntries.length` — `ranked_entries` has no admin
 * override in its RLS (owner-only), so this narrow count function is the
 * only way an admin session can see this total for real.
 */
export async function countRankedEntries(): Promise<number> {
  const { data, error } = await supabase.rpc('fn_admin_count_ranked_entries');
  if (error) throw error;
  return data;
}

/**
 * P14: "Total places" for the Analytics dashboard -- distinct real places
 * someone has actually ranked, replacing the old seed-catalogue row count.
 * Same reasoning as countRankedEntries: google_place_rankings RLS is
 * owner-only, so this narrow count function is the only way an admin
 * session can see this total for real.
 */
export async function countRankedGooglePlaces(): Promise<number> {
  const { data, error } = await supabase.rpc('fn_admin_count_ranked_google_places');
  if (error) throw error;
  return data;
}

/** Phase 7 §2: "Active users (30d)" — real Users only, via auth.users.last_sign_in_at (never exposed to the client directly). */
export async function countActiveUsers(days = 30): Promise<number> {
  const { data, error } = await supabase.rpc('fn_admin_count_active_users', { p_days: days });
  if (error) throw error;
  return data;
}

export interface PlanStats {
  totalPlans: number;
  sharedPlans: number;
}

/** Phase 7 §2: "Plans saved" / "Shares sent" — plans RLS is owner-only, same reasoning as countRankedEntries. */
export async function getPlanStats(): Promise<PlanStats> {
  const { data, error } = await supabase.rpc('fn_admin_plan_stats');
  if (error) throw error;
  const row = data[0];
  return { totalPlans: row?.total_plans ?? 0, sharedPlans: row?.shared_plans ?? 0 };
}

export interface FunnelStats {
  sessionsStarted: number;
  signupsCompleted: number;
  resultsShownEvents: number;
  totalPicksShown: number;
  showTwoMoreClicks: number;
  comparison1Started: number;
  comparison1Completed: number;
  comparison2Started: number;
  comparison2Completed: number;
  avgSearchToPickSeconds: number | null;
}

/** Phase 7 §5: every event-derived Analytics tile in one round trip — see fn_admin_funnel_stats's own comment for why this needs a first-party events table at all. */
export async function getFunnelStats(days = 30): Promise<FunnelStats> {
  const { data, error } = await supabase.rpc('fn_admin_funnel_stats', { p_days: days });
  if (error) throw error;
  const row = data[0];
  return {
    sessionsStarted: row?.sessions_started ?? 0,
    signupsCompleted: row?.signups_completed ?? 0,
    resultsShownEvents: row?.results_shown_events ?? 0,
    totalPicksShown: row?.total_picks_shown ?? 0,
    showTwoMoreClicks: row?.show_two_more_clicks ?? 0,
    comparison1Started: row?.comparison1_started ?? 0,
    comparison1Completed: row?.comparison1_completed ?? 0,
    comparison2Started: row?.comparison2_started ?? 0,
    comparison2Completed: row?.comparison2_completed ?? 0,
    avgSearchToPickSeconds: row?.avg_search_to_pick_seconds ?? null,
  };
}

export interface CreateAdminAccountInput {
  email: string;
  password: string;
  displayName?: string;
  adminTier: AdminTier;
  canOverrideRanking: boolean;
  canAccessLocationHistory: boolean;
  reason: string;
}

/**
 * Phase 7 §7: "add a feature to add another admin" (S50). Two real steps,
 * not one call — this creates a genuinely new person's account
 * (auth.users + the profiles row handle_new_user() always creates for a
 * fresh signup), then promotes that fresh profile to admin. Uses a detached
 * client for the signUp half so the calling admin's own session is
 * untouched (see createDetachedAuthClient). Only a superadmin session can
 * complete the second half — fn_admin_create_admin_account enforces that
 * server-side regardless of what this screen shows.
 */
export async function createAdminAccount(input: CreateAdminAccountInput): Promise<void> {
  const detached = createDetachedAuthClient();
  const { data, error } = await detached.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.displayName?.trim() } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Account creation did not return a user.');

  const { error: promoteError } = await supabase.rpc('fn_admin_create_admin_account', {
    p_user_id: data.user.id,
    p_admin_tier: input.adminTier,
    p_can_override_ranking: input.canOverrideRanking,
    p_can_access_location_history: input.canAccessLocationHistory,
    p_reason: input.reason,
  });
  if (promoteError) throw promoteError;
}

export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  const { data, error } = await supabase.rpc('fn_admin_list_accounts');
  if (error) throw error;
  return data.map((row) => ({
    email: row.email,
    tier: (row.admin_tier ?? 'moderation') as AdminTier,
    lastActive: formatRelative(row.last_active_at),
    status: (row.is_suspended ? 'Suspended' : 'Active') as AdminAccountStatus,
  }));
}

export async function listGemCandidates(): Promise<GemCandidateFixture[]> {
  const { data, error } = await supabase.rpc('fn_admin_list_gem_candidates');
  if (error) throw error;
  return data.map((row) => ({
    placeId: row.place_id ?? '',
    name: row.name ?? '',
    localRank: row.local_rank ?? 0,
    outsideFameRank: row.outside_fame_rank ?? 0,
    locals: row.locals ?? 0,
    gemScore: row.gem_score ?? 0,
  }));
}

export type AdminLoginOutcome = 'invalid_credentials' | 'access_denied';

export async function logAdminLoginAttempt(
  identifier: string,
  outcome: AdminLoginOutcome,
  userId?: string,
): Promise<void> {
  const { error } = await supabase.rpc('fn_log_admin_login_attempt', {
    p_identifier: identifier,
    p_event_type: outcome,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function deleteOwnAccount(confirm: true): Promise<void> {
  const { error } = await supabase.rpc('fn_delete_own_account', { p_confirm: confirm });
  if (error) throw error;
  await supabase.auth.signOut();
}

export interface ReportRow {
  id: string;
  type: string;
  label: string;
  placeId: string;
  reportedBy: string;
  ageLabel: string;
  status: string;
}

export async function getReports(): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    type: r.report_type,
    label: r.report_type,
    placeId: r.place_id,
    reportedBy: r.reported_by ?? (r.is_auto_flagged ? 'auto-flag' : 'unknown'),
    ageLabel: r.created_at,
    status: r.status,
  }));
}

export interface AuditLogRow {
  id: string;
  when: string;
  who: string;
  what: string;
}

export async function getAuditLog(): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((a) => ({
    id: a.id,
    when: a.created_at,
    who: a.admin_id,
    what: `${a.event_type}: ${a.reason}`,
  }));
}
