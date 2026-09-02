/**
 * Saved Google places live in localStorage because the Madli `bookmarks`
 * table FKs to catalogue `places.id`, and discovery results are Google ids.
 */

export interface SavedGooglePlace {
  placeId: string;
  name: string;
  address: string;
  photoUrl?: string;
  types: string[];
  savedAt: number;
  location?: { lat: number; lng: number };
  /** Freeform "why I saved this" — the same idea as bookmarks.note for a catalogue place. */
  note?: string;
}

const STORAGE_KEY = 'madli.savedGooglePlaces';

function identityKey(name: string, address: string): string {
  return `${name.trim().toLowerCase()}|${address.trim().toLowerCase()}`;
}

/**
 * Google's own Places data occasionally lists the same physical business
 * under two different place ids — seen live in testing as the identical
 * name+address saved twice from two separate searches, rendering as a
 * flat-out duplicate on the Bookmarks screen. placeId is what every other
 * function here keys on, but it isn't a reliable enough identity on its own,
 * so any read merges same-name-and-address entries down to the most
 * recently saved one and writes the cleaned list straight back — that
 * self-heals whatever duplicates are already sitting in a person's storage
 * the first time any of these functions runs, not just on the next fresh save.
 */
function dedupeByIdentity(items: SavedGooglePlace[]): SavedGooglePlace[] {
  const byIdentity = new Map<string, SavedGooglePlace>();
  for (const item of [...items].sort((a, b) => a.savedAt - b.savedAt)) {
    byIdentity.set(identityKey(item.name, item.address), item);
  }
  return [...byIdentity.values()];
}

function readAll(): SavedGooglePlace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedGooglePlace[];
    if (!Array.isArray(parsed)) return [];
    const deduped = dedupeByIdentity(parsed);
    if (deduped.length !== parsed.length) writeAll(deduped);
    return deduped;
  } catch {
    return [];
  }
}

function writeAll(items: SavedGooglePlace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode / quota — save is best-effort for this session.
  }
}

export function listSavedGooglePlaces(): SavedGooglePlace[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function isGooglePlaceSaved(placeId: string): boolean {
  return readAll().some((p) => p.placeId === placeId);
}

export function saveGooglePlace(place: Omit<SavedGooglePlace, 'savedAt'>): void {
  const identity = identityKey(place.name, place.address);
  const next = readAll().filter(
    (p) => p.placeId !== place.placeId && identityKey(p.name, p.address) !== identity,
  );
  next.unshift({ ...place, savedAt: Date.now() });
  writeAll(next);
}

export function removeSavedGooglePlace(placeId: string): void {
  writeAll(readAll().filter((p) => p.placeId !== placeId));
}

export function setSavedGooglePlaceNote(placeId: string, note: string): void {
  writeAll(
    readAll().map((p) => (p.placeId === placeId ? { ...p, note: note.trim() || undefined } : p)),
  );
}
