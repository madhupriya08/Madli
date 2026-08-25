import { supabase } from '../lib/supabaseClient';
import { appConfig } from '../fixtures/appConfig';
import type { Place } from '../fixtures/places';
import type { GoogleCandidate } from '../lib/placesSearch';
import type { LatLng } from '../lib/searchState';

/**
 * The hybrid rule, in one place.
 *
 * Google finds what is *there*. Madli decides what is *ranked*. A Google
 * candidate becomes a ranked pick only when Madli already has enough local
 * data about it; everything else is shown honestly as not ranked yet, with
 * no invented rank, reason or gap.
 *
 * Three things this deliberately does not do:
 *  - It never reads Google's star rating into Madli's order. Sorting is on
 *    `locals`, then the printed gap, then gem — Madli's own evidence.
 *  - It never invents `locals`. A place Google knows and Madli does not has
 *    no local count, and says so.
 *  - It never returns more than three ranked picks. "Three, never more" is
 *    the product's whole promise, so the cap lives here, next to the sort,
 *    rather than being re-applied by each screen that happens to remember.
 */

/** How many ranked picks a person may ever see at once. */
export const MAX_RANKED_PICKS = 3;

export interface RankedPick {
  kind: 'ranked';
  place: Place;
  candidate?: GoogleCandidate;
  location: LatLng | null;
}

export interface UnrankedPick {
  kind: 'unranked';
  /** Present when Madli knows the place but it is below the local-data threshold. */
  place?: Place;
  candidate: GoogleCandidate;
  location: LatLng;
  /** Why it is not ranked, in words the UI can print verbatim. */
  reason: 'below_threshold' | 'not_in_catalogue';
}

export type DiscoveryPick = RankedPick | UnrankedPick;

export interface DiscoveryResult {
  /** At most MAX_RANKED_PICKS, best first. */
  ranked: RankedPick[];
  /** Everything else Google found, in Google's own order. */
  unranked: UnrankedPick[];
  /** Ranked matches that did not fit in the cap — what "show me two more" cycles into. */
  rankedOverflow: RankedPick[];
  /** The live threshold this run used, so the UI can name a real number. */
  threshold: number;
}

/**
 * The minimum local ratings a place needs before Madli will rank it.
 *
 * Read from `app_config` (loaded at boot into `appConfig`), never hardcoded —
 * the whole point of the config key is that this is tunable without a deploy.
 */
export function rankingThreshold(): number {
  return appConfig.rankingThresholdLocals;
}

interface PlaceRowWithGoogle {
  id: string;
  google_place_id: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * Which of these Google places does Madli already know?
 *
 * One query keyed on `google_place_id`, not a per-candidate round trip.
 * Returns a map so the caller can join without re-scanning.
 */
export async function matchCandidatesToPlaces(
  candidates: GoogleCandidate[],
): Promise<Map<string, PlaceRowWithGoogle>> {
  const ids = candidates.map((c) => c.placeId);
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('places')
    .select('id, google_place_id, lat, lng')
    .in('google_place_id', ids);
  if (error) throw error;

  const byGoogleId = new Map<string, PlaceRowWithGoogle>();
  for (const row of (data ?? []) as unknown as PlaceRowWithGoogle[]) {
    if (row.google_place_id) byGoogleId.set(row.google_place_id, row);
  }
  return byGoogleId;
}

/**
 * Madli's own order among places that cleared the threshold.
 *
 * `locals` first — the count of people who actually live there and rated it
 * is the evidence the product is built on. Gap points break ties (a place
 * that beat its runner-up by more is more confidently placed), then gem, then
 * name so the order is stable rather than incidental.
 */
function compareRanked(a: Place, b: Place): number {
  if (b.locals !== a.locals) return b.locals - a.locals;
  const gap = (b.gapPoints ?? 0) - (a.gapPoints ?? 0);
  if (gap !== 0) return gap;
  if (a.gem !== b.gem) return a.gem ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export interface BuildDiscoveryInput {
  candidates: GoogleCandidate[];
  /** The Madli catalogue (already loaded at boot). */
  places: Place[];
  /** Place ids the person has rejected this session. */
  rejectedPlaceIds?: Set<string>;
  /** Google place ids already dismissed this session. */
  rejectedGooglePlaceIds?: Set<string>;
  threshold?: number;
}

/**
 * Splits Google's candidates into Madli-ranked picks and honest browse.
 *
 * Pure and synchronous so it can be reasoned about and tested without a
 * network: the Supabase match is done by the caller and handed in.
 */
export function buildDiscovery(input: BuildDiscoveryInput): DiscoveryResult {
  const threshold = input.threshold ?? rankingThreshold();
  const rejectedPlaces = input.rejectedPlaceIds ?? new Set<string>();
  const rejectedGoogle = input.rejectedGooglePlaceIds ?? new Set<string>();

  const byGoogleId = new Map<string, Place>();
  for (const p of input.places) {
    if (p.googlePlaceId) byGoogleId.set(p.googlePlaceId, p);
  }

  const rankedAll: RankedPick[] = [];
  const unranked: UnrankedPick[] = [];

  for (const candidate of input.candidates) {
    if (rejectedGoogle.has(candidate.placeId)) continue;
    const place = byGoogleId.get(candidate.placeId);

    if (!place) {
      unranked.push({
        kind: 'unranked',
        candidate,
        location: candidate.location,
        reason: 'not_in_catalogue',
      });
      continue;
    }
    if (rejectedPlaces.has(place.id)) continue;

    // is_active is a catalogue-level "show this at all" switch; a delisted
    // place should not reappear just because Google still lists it.
    if (!place.isActive) continue;

    if (place.locals >= threshold) {
      rankedAll.push({
        kind: 'ranked',
        place,
        candidate,
        location:
          place.lat != null && place.lng != null
            ? { lat: place.lat, lng: place.lng }
            : candidate.location,
      });
    } else {
      unranked.push({
        kind: 'unranked',
        place,
        candidate,
        location: candidate.location,
        reason: 'below_threshold',
      });
    }
  }

  rankedAll.sort((a, b) => compareRanked(a.place, b.place));

  return {
    ranked: rankedAll.slice(0, MAX_RANKED_PICKS),
    rankedOverflow: rankedAll.slice(MAX_RANKED_PICKS),
    unranked,
    threshold,
  };
}

/**
 * The catalogue-only path.
 *
 * Used when Google is unavailable — no key, an API not enabled on the
 * project, or a failed request. Madli still has its own ranked catalogue and
 * showing it is far better than showing nothing, so a Google outage degrades
 * the discovery loop rather than breaking it.
 */
export function buildDiscoveryFromCatalogue(
  places: Place[],
  door: 'eat' | 'explore',
  rejectedPlaceIds?: Set<string>,
  threshold = rankingThreshold(),
): DiscoveryResult {
  const rejected = rejectedPlaceIds ?? new Set<string>();
  const eligible = places.filter(
    (p) => p.type === door && p.isActive && !rejected.has(p.id) && p.locals >= threshold,
  );
  eligible.sort(compareRanked);

  const toPick = (place: Place): RankedPick => ({
    kind: 'ranked',
    place,
    location: place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null,
  });

  return {
    ranked: eligible.slice(0, MAX_RANKED_PICKS).map(toPick),
    rankedOverflow: eligible.slice(MAX_RANKED_PICKS).map(toPick),
    unranked: [],
    threshold,
  };
}
