// Mirrors business_claims: submitting user gets status='pending' (neutral,
// never a warning — the handoff is explicit), only admin-mode mock actions
// change status/calledAt/resolution fields.
//
// TODO(phase-3): replace with `supabase.from('business_claims')` calls.
import { mockDb } from '../fixtures/mockDb';
import type { BusinessClaimFixture, ClaimStatus } from '../fixtures/admin';

export async function getBusinessClaims(filter?: {
  userId?: string;
  placeId?: string;
}): Promise<BusinessClaimFixture[]> {
  return mockDb.businessClaims.filter((c) => {
    if (filter?.placeId && c.placeId !== filter.placeId) return false;
    return true;
  });
}

export async function submitBusinessClaim(input: {
  placeId: string;
  businessName: string;
  contactName: string;
  claimedRole: string;
  contactPhone: string;
  mapsLink: string;
}): Promise<BusinessClaimFixture> {
  const claim: BusinessClaimFixture = {
    id: mockDb.nextId('claim'),
    placeId: input.placeId,
    businessName: input.businessName,
    contactName: input.contactName,
    claimedRole: input.claimedRole,
    contactPhone: input.contactPhone,
    mapsLink: input.mapsLink,
    ageLabel: 'Just now',
    status: 'pending',
    calledAt: null,
  };
  mockDb.businessClaims.push(claim);
  return claim;
}

/** Admin-only: mark the verification phone call as done — separate from approval (S48). */
export async function adminMarkClaimCalled(claimId: string): Promise<void> {
  const claim = mockDb.businessClaims.find((c) => c.id === claimId);
  if (!claim) throw new Error(`claim ${claimId} not found`);
  claim.calledAt = new Date().toISOString();
}

export async function adminResolveClaim(
  claimId: string,
  status: Extract<ClaimStatus, 'verified' | 'rejected'>,
): Promise<void> {
  const claim = mockDb.businessClaims.find((c) => c.id === claimId);
  if (!claim) throw new Error(`claim ${claimId} not found`);
  claim.status = status;
}
