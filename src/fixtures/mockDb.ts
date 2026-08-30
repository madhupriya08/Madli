// Phase 4 §12: the mutable in-memory "database" this file used to export
// (`mockDb`, a `MockDb` class instance) backed Phase 2's mock data layer —
// Phase 3 replaced every one of its real callers with real Supabase calls,
// and nothing has imported the runtime object since (confirmed by grep: only
// the type exports below are still referenced). Removed as genuinely dead
// weight, not load-bearing for anything — the types stay, since
// `src/data/*.ts` still uses them as the shape contract for real rows.
export type Tier = 'loved' | 'fine' | 'disliked';

export interface RankedEntry {
  id: string;
  userId: string;
  placeId: string;
  categoryId: string;
  tier: Tier;
  position: number;
}
