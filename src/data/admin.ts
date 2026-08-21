// Admin-only mock operations, mirroring the Phase 1 SECURITY DEFINER
// functions. TODO(phase-3): replace each with the matching `supabase.rpc(...)`
// call named in the comment above it.
import { mockDb } from '../fixtures/mockDb';
import { gemCandidatesSeed, type GemCandidateFixture } from '../fixtures/admin';
import { adminUpdatePlace } from './places';

// TODO(phase-3): supabase.rpc('fn_admin_override_ranking', { p_place_id, p_gap_tone, p_gap_points, p_reason })
export async function adminOverrideRanking(
  placeId: string,
  gapTone: 'clear' | 'close' | 'thin',
  gapPoints: number | null,
  reason: string,
  adminEmail: string,
): Promise<string> {
  if (!reason.trim()) throw new Error('a written reason is required for a ranking override');
  await adminUpdatePlace(placeId, { gapTone, gapPoints: gapPoints ?? undefined });
  const id = mockDb.nextId('audit');
  mockDb.auditLog.unshift({
    id,
    when: 'Just now',
    who: adminEmail,
    what: `Override: ${placeId} gap set to ${gapTone}${gapPoints != null ? ` (${gapPoints} pts)` : ''} — ${reason}`,
  });
  return id;
}

// TODO(phase-3): supabase.rpc('fn_admin_adjust_contributor_weight', { p_target_user_id, p_new_weight, p_reason })
export async function adminAdjustContributorWeight(
  targetUserId: string,
  newWeight: number,
  reason: string,
  adminEmail: string,
): Promise<string> {
  if (!reason.trim())
    throw new Error("a written reason is required to adjust a contributor's weight");
  if (newWeight < 0) throw new Error('weight cannot be negative');
  mockDb.contributorWeights[targetUserId] = newWeight;
  const id = mockDb.nextId('audit');
  mockDb.auditLog.unshift({
    id,
    when: 'Just now',
    who: adminEmail,
    what: `Adjusted contributor weight for user ${targetUserId} to ${newWeight} — ${reason}`,
  });
  return id;
}

// TODO(phase-3): supabase.rpc('fn_admin_list_gem_candidates')
export async function listGemCandidates(): Promise<GemCandidateFixture[]> {
  return gemCandidatesSeed;
}

/**
 * TODO(phase-3): supabase.rpc('fn_admin_read_location_history', { p_target_user_id, p_reason })
 * Preserves the log-before-load ordering guarantee from the real gate: the
 * access-log row is written, and only THEN is the data "returned" — in that
 * order, so a UI built against this (the persistent coral banner on S51)
 * assumes the correct sequencing even in mock mode.
 */
export async function adminReadLocationHistory(
  targetUserId: string,
  reason: string,
  adminId: string,
) {
  if (!reason.trim()) throw new Error('a reason is required to access location history');

  mockDb.locationHistoryAccessLog.push({
    id: mockDb.nextId('lh-access'),
    adminId,
    targetUserId,
    reason,
    accessedAt: new Date().toISOString(),
  });

  // the log write above happens-before this read, by construction.
  return mockDb.locationHistory;
}

export type AdminLoginOutcome = 'invalid_credentials' | 'access_denied';

// TODO(phase-3): supabase.rpc('fn_log_admin_login_attempt', { p_identifier, p_event_type, p_user_id })
export async function logAdminLoginAttempt(
  identifier: string,
  outcome: AdminLoginOutcome,
  userId?: string,
): Promise<void> {
  mockDb.auditLog.unshift({
    id: mockDb.nextId('login-audit'),
    when: 'Just now',
    who: identifier,
    what:
      outcome === 'invalid_credentials'
        ? 'Admin login: invalid credentials'
        : `Admin login: access denied (valid credentials, no admin role)${userId ? ` — user ${userId}` : ''}`,
  });
}

// TODO(phase-3): supabase.rpc('fn_delete_own_account', { p_confirm })
export async function deleteOwnAccount(userId: string, confirm: true): Promise<void> {
  if (confirm !== true) throw new Error('account deletion requires explicit confirmation');
  mockDb.rankedEntries = mockDb.rankedEntries.filter((e) => e.userId !== userId);
  mockDb.bookmarks = mockDb.bookmarks.filter((b) => b.userId !== userId);
  mockDb.plans = mockDb.plans.filter((p) => p.userId !== userId);
  mockDb.deletedUserIds.add(userId);
}

export async function adminResolveReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  outcome: string,
): Promise<void> {
  const report = mockDb.reports.find((r) => r.id === reportId);
  if (!report) throw new Error(`report ${reportId} not found`);
  report.status = status;
  void outcome;
}

export async function getReports(): Promise<typeof mockDb.reports> {
  return mockDb.reports;
}

export async function getAuditLog(): Promise<typeof mockDb.auditLog> {
  return mockDb.auditLog;
}
