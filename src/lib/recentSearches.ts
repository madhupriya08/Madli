import type { Door, SearchState } from './searchState';

/**
 * A signed-in person's recent searches on the results screens (S17/S18).
 * Guest-excluded, same precedent as SearchEntryScreen's own "Recent searches
 * are saved once you have an account" copy — there is no profile row to
 * anchor a Guest's history to, and re-picking every visit is the accepted
 * trade for Guests throughout this app (PickAreaScreen's "Set as home"
 * toggle, google-place saves, etc.).
 *
 * Kept in localStorage rather than a new Supabase table: this is a
 * lightweight per-device convenience (jump back into a filter set you just
 * used), not data anything else in the product reads or aggregates — the
 * same trade already made for saved Google places and outing plans.
 */

export interface RecentSearch {
  id: string;
  door: Door;
  /** Human-readable summary shown as the chip's own label. */
  label: string;
  savedAt: number;
  /** The full filter set to restore when this entry is picked again. */
  snapshot: SearchState;
}

const MAX_RECENT = 5;

function storageKey(userId: string): string {
  return `madli.recentSearches.${userId}`;
}

function readAll(userId: string): RecentSearch[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(userId: string, items: RecentSearch[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    // Private mode / quota — recording is best-effort for this session.
  }
}

// P14: dropped the full area name from the label ("Eat · Jubilee Hills ·
// biryani" read as noise once someone had more than a couple of entries,
// and the area is what "Eat"/"Explore" already implicitly means: nearby).
// A typed search or vibe is the one thing worth keeping, since it is the
// only part that actually tells two entries apart.
function labelFor(search: SearchState): string {
  const doorLabel = search.door === 'eat' ? 'Eat' : 'Explore';
  const extra = search.queryText.trim() || search.vibes[0] || search.who || search.occasion || null;
  return [doorLabel, extra].filter(Boolean).join(' · ');
}

/**
 * Records the search that just produced a real results view. De-duplicated
 * by label (re-running the same search moves it to the top rather than
 * spamming the list with identical entries), capped at five, newest first.
 */
export function recordRecentSearch(userId: string, search: SearchState): void {
  if (!userId) return;
  const label = labelFor(search);
  const existing = readAll(userId).filter((r) => r.label !== label);
  const entry: RecentSearch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    door: search.door,
    label,
    savedAt: Date.now(),
    snapshot: search,
  };
  writeAll(userId, [entry, ...existing].slice(0, MAX_RECENT));
}

/**
 * The last five, newest first. Capped on read as well as on write: five is
 * the promise every screen under "Recent searches" makes, and a stored
 * blob from an older build (or one written by another tab) must not
 * quietly break that promise.
 */
export function listRecentSearches(userId: string, door?: Door): RecentSearch[] {
  if (!userId) return [];
  const all = readAll(userId)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_RECENT);
  return door ? all.filter((r) => r.door === door) : all;
}
