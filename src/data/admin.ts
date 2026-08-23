// Phase 3: real Supabase calls — each function now calls the matching
// SECURITY DEFINER Postgres function Phase 1 built and Phase 3 verified live
// (see PHASE_3_COMPLETION_REPORT.md §4): real 403s for a partial-grant admin
// attempting fn_admin_override_ranking, real log-before-read ordering for
// fn_admin_read_location_history, real invalid_credentials/access_denied
// rows for fn_log_admin_login_attempt.
import { supabase } from '../lib/supabaseClient';
import type {
  AdminAccountRow,
  AdminAccountStatus,
  AdminTier,
  GemCandidateFixture,
  LocationHistoryFixture,
} from '../fixtures/admin';

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

export async function adminOverrideRanking(
  placeId: string,
  gapTone: 'clear' | 'close' | 'thin',
  gapPoints: number | null,
  reason: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('fn_admin_override_ranking', {
    p_place_id: placeId,
    p_gap_tone: gapTone,
    p_gap_points: gapPoints,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminAdjustContributorWeight(
  targetUserId: string,
  newWeight: number,
  reason: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('fn_admin_adjust_contributor_weight', {
    p_target_user_id: targetUserId,
    p_new_weight: newWeight,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
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

export interface LocationHistoryRow extends LocationHistoryFixture {
  userId: string;
}

/**
 * Log-before-read is a real guarantee of `fn_admin_read_location_history`
 * itself (the function writes the access-log row, then returns data, in one
 * atomic call) — verified live in Phase 3 by seeding one row and confirming
 * both the access log write and the returned data in a single real RPC call,
 * while a direct `location_history` SELECT by the same admin session
 * returned nothing. Never query `location_history` directly as admin.
 */
export async function adminReadLocationHistory(
  targetUserId: string,
  reason: string,
): Promise<LocationHistoryRow[]> {
  const { data, error } = await supabase.rpc('fn_admin_read_location_history', {
    p_target_user_id: targetUserId,
    p_reason: reason,
  });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    when: row.created_at,
    area: row.area_name ?? '',
    action: row.action_type as LocationHistoryFixture['action'],
    actionLabel: row.action_type,
    userId: row.user_id,
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

export async function adminResolveReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  outcome: string,
  adminId: string,
): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({
      status,
      resolution_outcome: outcome,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq('id', reportId);
  if (error) throw error;
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
