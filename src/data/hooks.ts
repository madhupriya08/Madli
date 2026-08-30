// TanStack Query hooks over the data layer. Phase 3: internals below now
// call real Supabase — every hook here kept its name/params/return shape
// through that swap except where a real RLS/audit requirement genuinely
// needed a new parameter (called out inline), per PHASE_3_COMPLETION_REPORT.md §2.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as placesApi from './places';
import * as plansApi from './plans';
import * as rankedEntriesApi from './rankedEntries';
import * as businessClaimsApi from './businessClaims';
import * as adminApi from './admin';
import { supabase } from '../lib/supabaseClient';
import type { Tier } from '../fixtures/mockDb';
import type { PlaceFilters } from './places';
import type { Place } from '../fixtures/places';

export { ProtectedFieldError } from './places';

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

export function useUpdateOwnerListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { placeId: string; fields: Partial<Place> }) =>
      placesApi.updateOwnerListing(input.placeId, input.fields),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['allPlaces'] });
      void qc.invalidateQueries({ queryKey: ['publishedPicks'] });
      void qc.invalidateQueries({ queryKey: ['place', 'slug'] });
      void qc.invalidateQueries({ queryKey: ['place', 'id', input.placeId] });
    },
  });
}

// --- Ranking loop ---

export function useVisibleRankedEntries(userId: string, categoryId?: string) {
  return useQuery({
    queryKey: ['rankedEntries', 'visible', userId, categoryId],
    queryFn: () => rankedEntriesApi.getVisibleRankedEntries(userId, categoryId),
    enabled: !!userId,
  });
}

/** The comparison targets offered on S26 — real entries fetched, then the pure pick logic applied. */
export function useComparisonTargets(userId: string, categoryId: string | undefined) {
  return useQuery({
    queryKey: ['rankedEntries', 'comparisonTargets', userId, categoryId],
    queryFn: async () => {
      const entries = await rankedEntriesApi.getVisibleRankedEntries(userId, categoryId);
      return rankedEntriesApi.pickComparisonTargets(entries);
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

// --- Business claims ---

export function useBusinessClaims(filter: { placeId?: string; userId?: string } = {}) {
  return useQuery({
    queryKey: ['businessClaims', filter.placeId, filter.userId],
    queryFn: () => businessClaimsApi.getBusinessClaims(filter),
  });
}

export function useSubmitBusinessClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: businessClaimsApi.submitBusinessClaim,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['businessClaims'] }),
  });
}

// --- Owner mode ---

export function useOwnsVerifiedClaim(placeId: string | undefined) {
  return useQuery({
    queryKey: ['ownsVerifiedClaim', placeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('owns_verified_claim', { p_place_id: placeId! });
      if (error) throw error;
      return data;
    },
    enabled: !!placeId,
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
  return useQuery({ queryKey: ['funnelStats', days], queryFn: () => adminApi.getFunnelStats(days) });
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
