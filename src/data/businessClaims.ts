// Phase 3: real Supabase calls. Submitting user gets status='pending'
// (neutral, never a warning). Only an admin session can change
// status/calledAt/resolution fields — enforced by a real trigger, same as
// the owner-edit protection on `places`.
import { supabase } from '../lib/supabaseClient';
import type { BusinessClaimFixture, ClaimStatus } from '../fixtures/admin';

function rowToClaim(row: Record<string, unknown>): BusinessClaimFixture {
  return {
    id: row.id as string,
    placeId: row.place_id as string,
    businessName: row.business_name as string,
    contactName: (row.contact_name as string | null) ?? '',
    claimedRole: row.claimed_role as string,
    contactPhone: row.contact_phone as string,
    mapsLink: row.maps_link as string,
    ageLabel: '', // derived from created_at at the call site if needed
    status: row.status as ClaimStatus,
    calledAt: row.called_at as string | null,
  };
}

export async function getBusinessClaims(filter?: {
  userId?: string;
  placeId?: string;
}): Promise<BusinessClaimFixture[]> {
  let query = supabase.from('business_claims').select('*');
  if (filter?.placeId) query = query.eq('place_id', filter.placeId);
  if (filter?.userId) query = query.eq('user_id', filter.userId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToClaim);
}

export async function submitBusinessClaim(input: {
  userId: string;
  placeId: string;
  businessName: string;
  contactName: string;
  claimedRole: string;
  contactPhone: string;
  mapsLink: string;
}): Promise<BusinessClaimFixture> {
  const { data, error } = await supabase
    .from('business_claims')
    .insert({
      user_id: input.userId,
      place_id: input.placeId,
      business_name: input.businessName,
      contact_name: input.contactName,
      claimed_role: input.claimedRole,
      contact_phone: input.contactPhone,
      maps_link: input.mapsLink,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToClaim(data);
}
