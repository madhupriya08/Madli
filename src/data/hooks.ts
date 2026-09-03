// TanStack Query hooks over the data layer. Phase 3: internals below now
// call real Supabase — every hook here kept its name/params/return shape
// through that swap except where a real RLS/audit requirement genuinely
// needed a new parameter (called out inline), per PHASE_3_COMPLETION_REPORT.md §2.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as placesApi from './places';
import * as plansApi from './plans';
import * as rankedEntriesApi from './rankedEntries';
import * as adminApi from './admin';
import type { Tier } from '../fixtures/mockDb';
import type { PlaceFilters } from './places';

// --- Places / picks ---

export function usePublishedPicks(filters: PlaceFilters = {}) {
  return useQuery({
    queryKey: ['publishedPicks', filters],
    queryFn: () => placesApi.getPublishedPicks(filters),
  });
}

export function useAllPlaces(filters: PlaceFilters = {}) {
  return useQuery({
    queryKey: ['allPlaces', filters],
    queryFn: () => placesApi.getAllPlaces(filters),
  });
}

export function usePlaceBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['place', 'slug', slug],
    queryFn: () => placesApi.getPlaceBySlug(slug!),
    enabled: !!slug,
  });
}

// --- Ranking loop ---

/**
 * S32/S31: local status is tied to ranking depth, not time served or a badge
 * scheme — 25 ranked places is the real threshold the weight curve behind it
 * is built around (Phase 1 flagged the curve itself as unresolved; this is
 * just the count). Shared by ProfileScreen's progress bar and
 * MyRankedListScreen's own subtitle so both quote the same number.
 */
export const LOCAL_STATUS_THRESHOLD = 25;

export function useVisibleRankedEntries(userId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['rankedEntries', 'visible', userId, categoryId],
    queryFn: () => rankedEntriesApi.getVisibleRankedEntries(userId, categoryId),
    enabled: !!userId,
  });
}

/**
 * Includes 'disliked' entries — for the "You've been here" badge (S19),
 * which must reflect whether a visit was ever logged at all, not just
 * whether it still shows on the visible ranked list.
 */
export function useAllRankedEntries(userId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['rankedEntries', 'all', userId, categoryId],
    queryFn: () => rankedEntriesApi.getAllRankedEntries(userId, categoryId),
    enabled: !!userId,
  });
}

/**
 * The comparison targets offered on S26 — real entries fetched, then the
 * pure pick logic applied.
 *
 * P13 §6: `excludePlaceId` — the place being re-ranked. It is still in the
 * live list at the moment this query runs (the RPC only removes it inside
 * its own transaction, once the person actually submits), so without this
 * a re-rank could offer comparing a place against itself.
 */
export function useComparisonTargets(
  userId: string,
  categoryId: string | undefined,
  excludePlaceId?: string,
) {
  return useQuery({
    queryKey: ['rankedEntries', 'comparisonTargets', userId, categoryId, excludePlaceId ?? null],
    queryFn: async () => {
      const entries = await rankedEntriesApi.getVisibleRankedEntries(userId, categoryId);
      const candidates = excludePlaceId
        ? entries.filter((e) => e.placeId !== excludePlaceId)
        : entries;
      return rankedEntriesApi.pickComparisonTargets(candidates);
    },
    enabled: !!userId && !!categoryId,
  });
}

export function useLogRankedVisit(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      placeId: string;
      tier: Tier;
      compare1?: rankedEntriesApi.ComparisonInput;
      compare2?: rankedEntriesApi.ComparisonInput;
    }) =>
      rankedEntriesApi.logRankedVisit(
        userId,
        input.placeId,
        input.tier,
        input.compare1,
        input.compare2,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rankedEntries'] });
    },
  });
}

// --- Bookmarks / Plans ---

export function useBookmarks(userId: string) {
  return useQuery({
    queryKey: ['bookmarks', userId],
    queryFn: () => plansApi.getBookmarks(userId),
    enabled: !!userId,
  });
}

export function useSetBookmarkNote(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { placeId: string; note: string }) =>
      plansApi.setBookmarkNote(userId, input.placeId, input.note),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bookmarks', userId] }),
  });
}

export function useAddBookmark(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) => plansApi.addBookmark(userId, placeId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bookmarks', userId] }),
  });
}

export function useRemoveBookmark(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placeId: string) => plansApi.removeBookmark(userId, placeId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bookmarks', userId] }),
  });
}

export function usePlans(userId: string) {
  return useQuery({
    queryKey: ['plans', userId],
    queryFn: () => plansApi.getPlans(userId),
    enabled: !!userId,
  });
}

export function useCreatePlan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      anchor: { key: string; name: string; lat?: number | null; lng?: number | null };
      firstStop: plansApi.NewPlanStop;
      name?: string;
    }) => plansApi.createPlan(userId, input.anchor, input.firstStop, input.name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['plans', userId] }),
  });
}

/** The "add another stop" affordance, wherever a saved plan already exists. */
export function useAddPlanItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; stop: plansApi.NewPlanStop }) =>
      plansApi.addPlanItem(input.planId, input.stop),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['plans', userId] }),
  });
}

export function useCreatePlanShareToken() {
  return useMutation({ mutationFn: (planId: string) => plansApi.createPlanShareToken(planId) });
}

export function useSharedPlan(token: string | undefined) {
  return useQuery({
    queryKey: ['sharedPlan', token],
    queryFn: () => plansApi.getSharedPlan(token!),
    enabled: !!token,
  });
}

export function useRenamePlan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; name: string | null }) =>
      plansApi.renamePlan(input.planId, input.name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['plans', userId] }),
  });
}

export function useRemovePlanItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; googlePlaceId: string }) =>
      plansApi.removePlanItem(input.planId, input.googlePlaceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['plans', userId] }),
  });
}

// --- Admin ---

export function useGemCandidates() {
  return useQuery({ queryKey: ['gemCandidates'], queryFn: adminApi.listGemCandidates });
}

export function useActiveUserCount(days = 30) {
  return useQuery({
    queryKey: ['activeUserCount', days],
    queryFn: () => adminApi.countActiveUsers(days),
  });
}

export function usePlanStats() {
  return useQuery({ queryKey: ['planStats'], queryFn: adminApi.getPlanStats });
}

export function useFunnelStats(days = 30) {
  return useQuery({
    queryKey: ['funnelStats', days],
    queryFn: () => adminApi.getFunnelStats(days),
  });
}

export function useDeleteOwnAccount() {
  return useMutation({ mutationFn: () => adminApi.deleteOwnAccount(true) });
}

export function useReports() {
  return useQuery({ queryKey: ['reports'], queryFn: adminApi.getReports });
}

export function useAuditLog() {
  return useQuery({ queryKey: ['auditLog'], queryFn: adminApi.getAuditLog });
}

export function useAdminAccounts() {
  return useQuery({ queryKey: ['adminAccounts'], queryFn: adminApi.listAdminAccounts });
}

export function useCreateAdminAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createAdminAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['adminAccounts'] });
      void qc.invalidateQueries({ queryKey: ['auditLog'] });
    },
  });
}

export function useRankedEntriesCount() {
  return useQuery({ queryKey: ['rankedEntriesCount'], queryFn: adminApi.countRankedEntries });
}

export function useRankedGooglePlacesCount() {
  return useQuery({
    queryKey: ['rankedGooglePlacesCount'],
    queryFn: adminApi.countRankedGooglePlaces,
  });
}
