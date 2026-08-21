// Mirrors Phase 1's published_picks view: places.locals >= ranking_threshold_locals
// (from app_config), applied consistently rather than hardcoded per call site.
// "Three picks, never more" (LIMIT 3) is enforced by the caller, exactly like
// the real backend — see PHASE_2_HANDOFF.md.
//
// TODO(phase-3): replace with `supabase.from('published_picks').select()`.
import { places, type Place } from '../fixtures/places';
import { appConfig } from '../fixtures/appConfig';

export interface PlaceFilters {
  type?: 'eat' | 'explore';
  categoryId?: string;
  neighborhood?: string;
}

export async function getPublishedPicks(filters: PlaceFilters = {}): Promise<Place[]> {
  return places.filter((p) => {
    if (!p.isActive) return false;
    if (p.locals < appConfig.rankingThresholdLocals) return false;
    if (filters.type && p.type !== filters.type) return false;
    if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
    if (filters.neighborhood && p.neighborhood !== filters.neighborhood) return false;
    return true;
  });
}

/** All places matching filters, threshold NOT applied — for admin/catalogue screens. */
export async function getAllPlaces(filters: PlaceFilters = {}): Promise<Place[]> {
  return places.filter((p) => {
    if (filters.type && p.type !== filters.type) return false;
    if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
    if (filters.neighborhood && p.neighborhood !== filters.neighborhood) return false;
    return true;
  });
}

export async function getPlaceBySlug(slug: string): Promise<Place | undefined> {
  return places.find((p) => p.slug === slug);
}

export async function getPlaceById(id: string): Promise<Place | undefined> {
  return places.find((p) => p.id === id);
}

// Owner-editable field allowlist — a real, enforced-at-the-database allowlist
// in Phase 1 (a trigger rejects everything else even if RLS lets the UPDATE
// statement through). Mirrored here so a UI bug surfaces in Phase 2, not only
// once Phase 3 wires the real backend.
const OWNER_EDITABLE_FIELDS = new Set<keyof Place>([
  'history',
  'phone',
  'address',
  'hours',
  'waitTime',
  'servingHours',
  'dishes',
  'crowdLevel',
  'best',
]);

export class ProtectedFieldError extends Error {
  constructor(public field: string) {
    super(`ranking-relevant column change rejected: only admin may change "${field}"`);
  }
}

export async function updateOwnerListing(placeId: string, fields: Partial<Place>): Promise<Place> {
  const place = places.find((p) => p.id === placeId);
  if (!place) throw new Error(`place ${placeId} not found`);

  for (const key of Object.keys(fields) as (keyof Place)[]) {
    if (!OWNER_EDITABLE_FIELDS.has(key)) {
      throw new ProtectedFieldError(key);
    }
  }

  Object.assign(place, fields);
  return place;
}

export async function adminUpdatePlace(placeId: string, fields: Partial<Place>): Promise<Place> {
  const place = places.find((p) => p.id === placeId);
  if (!place) throw new Error(`place ${placeId} not found`);
  Object.assign(place, fields);
  return place;
}
