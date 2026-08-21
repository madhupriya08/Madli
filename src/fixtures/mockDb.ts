// Mutable in-memory "database" backing the Phase 2 data layer (src/data/).
// Seeded from the fixtures above; mutated by the data-layer functions as the
// app runs, exactly like the real Postgres tables Phase 3 will swap in.
// Module-singleton state — fine for a mock layer, not meant to survive reload.
import {
  businessClaimsSeed,
  reportsSeed,
  auditLogSeed,
  locationHistorySeed,
  type BusinessClaimFixture,
  type ReportFixture,
  type AuditLogFixture,
  type LocationHistoryFixture,
} from './admin';

export type Tier = 'loved' | 'fine' | 'disliked';

export interface RankedEntry {
  id: string;
  userId: string;
  placeId: string;
  categoryId: string;
  tier: Tier;
  position: number;
}

export interface Bookmark {
  id: string;
  userId: string;
  placeId: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  userId: string;
  eatPlaceId: string;
  explorePlaceId: string;
  name: string | null;
  shareToken: string | null;
}

export interface LocationHistoryAccessLogEntry {
  id: string;
  adminId: string;
  targetUserId: string;
  reason: string;
  accessedAt: string;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

class MockDb {
  rankedEntries: RankedEntry[] = [];
  bookmarks: Bookmark[] = [];
  plans: Plan[] = [];
  businessClaims: BusinessClaimFixture[] = businessClaimsSeed.map((c) => ({ ...c }));
  reports: ReportFixture[] = reportsSeed.map((r) => ({ ...r }));
  auditLog: AuditLogFixture[] = auditLogSeed.map((a) => ({ ...a }));
  locationHistory: LocationHistoryFixture[] = locationHistorySeed.map((l) => ({ ...l }));
  locationHistoryAccessLog: LocationHistoryAccessLogEntry[] = [];
  contributorWeights: Record<string, number> = {};
  suspendedUserIds: Set<string> = new Set();
  deletedUserIds: Set<string> = new Set();

  nextId(prefix: string): string {
    return makeId(prefix);
  }
}

export const mockDb = new MockDb();
