// Mirrors fn_create_plan_share_token + the header-scoped share-link read
// (Phase 1: plans.share_token matched against an `x-share-token` request
// header via RLS, not a query filter). Mock mode has no real header
// mechanism — token-scoped lookup by value stands in for it here.
//
// TODO(phase-3): replace with `supabase.rpc('fn_create_plan_share_token', {...})`
// and a `supabase.from('plans').select()` call that sets the `x-share-token`
// request header (via a per-request client override), not a `.eq()` filter —
// the real RLS policy reads the header, matching this shape is what matters.
import { mockDb, type Plan } from '../fixtures/mockDb';
import { placeById } from '../fixtures/places';

export async function getBookmarks(userId: string): Promise<{ id: string; placeId: string }[]> {
  return mockDb.bookmarks
    .filter((b) => b.userId === userId)
    .map((b) => ({ id: b.id, placeId: b.placeId }));
}

export async function addBookmark(userId: string, placeId: string): Promise<void> {
  if (mockDb.bookmarks.some((b) => b.userId === userId && b.placeId === placeId)) {
    throw new Error('duplicate bookmark');
  }
  mockDb.bookmarks.push({
    id: mockDb.nextId('bookmark'),
    userId,
    placeId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeBookmark(userId: string, placeId: string): Promise<void> {
  mockDb.bookmarks = mockDb.bookmarks.filter(
    (b) => !(b.userId === userId && b.placeId === placeId),
  );
}

export async function getPlans(userId: string): Promise<Plan[]> {
  return mockDb.plans.filter((p) => p.userId === userId);
}

export async function createPlan(
  userId: string,
  eatPlaceId: string,
  explorePlaceId: string,
  name?: string,
): Promise<Plan> {
  const eat = placeById(eatPlaceId);
  const explore = placeById(explorePlaceId);
  if (eat?.type !== 'eat')
    throw new Error(`eatPlaceId must reference a place with type=eat (got ${eat?.type})`);
  if (explore?.type !== 'explore')
    throw new Error(
      `explorePlaceId must reference a place with type=explore (got ${explore?.type})`,
    );
  const plan: Plan = {
    id: mockDb.nextId('plan'),
    userId,
    eatPlaceId,
    explorePlaceId,
    name: name ?? null,
    shareToken: null,
  };
  mockDb.plans.push(plan);
  return plan;
}

export async function createPlanShareToken(planId: string): Promise<string> {
  const plan = mockDb.plans.find((p) => p.id === planId);
  if (!plan) throw new Error(`plan ${planId} not found`);
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  plan.shareToken = token;
  return token;
}

export async function getSharedPlan(token: string): Promise<Plan | undefined> {
  return mockDb.plans.find((p) => p.shareToken === token);
}
