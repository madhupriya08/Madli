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

function readAll(): SavedGooglePlace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedGooglePlace[];
    return Array.isArray(parsed) ? parsed : [];
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
  const next = readAll().filter((p) => p.placeId !== place.placeId);
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
