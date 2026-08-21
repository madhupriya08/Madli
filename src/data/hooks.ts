// TanStack Query hooks over the mock data layer — the exact seam Phase 3
// needs. Every hook here keeps its name/params/return shape when the
// underlying functions in this directory are swapped for real Supabase calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as placesApi from './places';
import * as plansApi from './plans';
import * as rankedEntriesApi from './rankedEntries';
import * as businessClaimsApi from './businessClaims';
import * as adminApi from './admin';
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['allPlaces'] });
      void qc.invalidateQueries({ queryKey: ['publishedPicks'] });
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
    mutationFn: (input: { eatPlaceId: string; explorePlaceId: string; name?: string }) =>
      plansApi.createPlan(userId, input.eatPlaceId, input.explorePlaceId, input.name),
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

export function useBusinessClaims(placeId?: string) {
  return useQuery({
    queryKey: ['businessClaims', placeId],
    queryFn: () => businessClaimsApi.getBusinessClaims({ placeId }),
  });
}

export function useSubmitBusinessClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: businessClaimsApi.submitBusinessClaim,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['businessClaims'] }),
  });
}

// --- Admin ---

export function useAdminOverrideRanking() {
  return useMutation({
    mutationFn: (input: {
      placeId: string;
      gapTone: 'clear' | 'close' | 'thin';
      gapPoints: number | null;
      reason: string;
      adminEmail: string;
    }) =>
      adminApi.adminOverrideRanking(
        input.placeId,
        input.gapTone,
        input.gapPoints,
        input.reason,
        input.adminEmail,
      ),
  });
}

export function useGemCandidates() {
  return useQuery({ queryKey: ['gemCandidates'], queryFn: adminApi.listGemCandidates });
}

export function useAdminReadLocationHistory() {
  return useMutation({
    mutationFn: (input: { targetUserId: string; reason: string; adminId: string }) =>
      adminApi.adminReadLocationHistory(input.targetUserId, input.reason, input.adminId),
  });
}

export function useDeleteOwnAccount(userId: string) {
  return useMutation({ mutationFn: () => adminApi.deleteOwnAccount(userId, true) });
}

export function useReports() {
  return useQuery({ queryKey: ['reports'], queryFn: adminApi.getReports });
}

export function useAuditLog() {
  return useQuery({ queryKey: ['auditLog'], queryFn: adminApi.getAuditLog });
}
