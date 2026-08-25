/// <reference types="google.maps" />
import { loadGoogleMaps, asMapsError } from './googleMaps';
import type { AreaType, Door, LatLng } from './searchState';

/**
 * Google Places, reached through the Maps JavaScript `places` library rather
 * than the Places REST API.
 *
 * That choice keeps the browser key the only key: the JS library is covered
 * by the same referrer-restricted Maps key already in the bundle, so nothing
 * here needs an Edge Function or a server-side secret. If a future need does
 * require the REST API (server-side ranking, scheduled imports), that call
 * belongs in an Edge Function with its own secret — not a second key here.
 *
 * Google's job stops at *finding candidates*. Nothing in this module reads
 * Google ratings, review counts or "prominence" into Madli's ranking; that
 * comes from `locals`/`visitors` and `fn_log_ranked_visit` alone.
 */

export interface GoogleCandidate {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
  types: string[];
  /** Google's own rating. Displayed nowhere; kept only for debugging a search. */
  googleRating?: number;
  openNow?: boolean;
}

/**
 * Door → Place types.
 *
 * Eat is the obvious set. Explore follows the handoff's own categories —
 * "Lakes and viewpoints · Historical · Nightlife · Concerts and events" —
 * rather than a generic tourist-attraction catch-all, so the two doors
 * actually return different worlds.
 */
const DOOR_TYPES: Record<Door, string[]> = {
  eat: ['restaurant', 'cafe', 'bakery', 'meal_takeaway'],
  explore: [
    'park',
    'tourist_attraction',
    'historical_landmark',
    'museum',
    'art_gallery',
    'night_club',
  ],
};

/**
 * Explore's indoor/outdoor filter, expressed in Place types.
 *
 * Google has no "is this indoors" field, so this narrows the type list
 * instead of pretending to filter on a property that does not exist —
 * "Mixed" deliberately does not narrow at all.
 */
const AREA_TYPE_TYPES: Record<AreaType, string[] | null> = {
  Indoor: ['museum', 'art_gallery', 'night_club'],
  Outdoor: ['park', 'tourist_attraction', 'historical_landmark'],
  Mixed: null,
};

export interface SearchCandidatesInput {
  door: Door;
  center: LatLng;
  radiusMeters: number;
  vibe?: string | null;
  areaText?: string;
  areaType?: AreaType | null;
  allowsPets?: boolean;
  servesPetFood?: boolean;
  maxResults?: number;
}

function includedTypesFor(input: SearchCandidatesInput): string[] {
  const base = DOOR_TYPES[input.door];
  if (input.door !== 'explore' || !input.areaType) return base;
  const narrowed = AREA_TYPE_TYPES[input.areaType];
  if (!narrowed) return base;
  const intersection = base.filter((t) => narrowed.includes(t));
  return intersection.length > 0 ? intersection : base;
}

/**
 * Builds the free-text query for the cases nearby-search cannot express.
 *
 * A vibe ("Late night", "Date night") and the pet filters are not Place
 * types or fields — Google has no structured "serves pet food" flag — so
 * they are folded into a text query instead of being silently dropped. That
 * is honest about what the filter can actually do: it biases the search, it
 * does not guarantee the attribute.
 */
function textQueryFor(input: SearchCandidatesInput): string | null {
  const parts: string[] = [];
  if (input.vibe) parts.push(input.vibe);
  if (input.allowsPets) parts.push('pet friendly');
  if (input.servesPetFood) parts.push('serves pet food');
  if (parts.length === 0) return null;

  const subject = input.door === 'eat' ? 'restaurants' : 'places to visit';
  const where = input.areaText?.trim() ? ` in ${input.areaText.trim()}` : '';
  return `${parts.join(' ')} ${subject}${where}`.trim();
}

type PlaceLike = {
  id?: string | null;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: { lat: () => number; lng: () => number } | null;
  types?: string[] | null;
  rating?: number | null;
};

function toCandidate(p: PlaceLike): GoogleCandidate | null {
  const loc = p.location;
  if (!p.id || !loc) return null;
  return {
    placeId: p.id,
    name: p.displayName ?? 'Unnamed place',
    address: p.formattedAddress ?? '',
    location: { lat: loc.lat(), lng: loc.lng() },
    types: p.types ?? [],
    googleRating: p.rating ?? undefined,
  };
}

const FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'types', 'rating'];

/**
 * Candidates for the current door + filters.
 *
 * Text search when the person expressed something only words can carry (a
 * vibe, a pet requirement); nearby search otherwise, which is both cheaper
 * and better at "what is actually around this point".
 */
export async function searchCandidates(input: SearchCandidatesInput): Promise<GoogleCandidate[]> {
  const maps = await loadGoogleMaps();
  const maxResults = input.maxResults ?? 20;

  try {
    const { Place, SearchNearbyRankPreference } = (await maps.importLibrary(
      'places',
    )) as google.maps.PlacesLibrary;

    const textQuery = textQueryFor(input);

    if (textQuery) {
      const { places } = await Place.searchByText({
        textQuery,
        fields: FIELDS,
        locationBias: {
          center: new maps.LatLng(input.center.lat, input.center.lng),
          radius: input.radiusMeters,
        },
        maxResultCount: maxResults,
      });
      return (places ?? []).map(toCandidate).filter((c): c is GoogleCandidate => c !== null);
    }

    const { places } = await Place.searchNearby({
      fields: FIELDS,
      locationRestriction: {
        center: new maps.LatLng(input.center.lat, input.center.lng),
        radius: input.radiusMeters,
      },
      includedPrimaryTypes: includedTypesFor(input),
      maxResultCount: maxResults,
      rankPreference: SearchNearbyRankPreference.POPULARITY,
    });
    return (places ?? []).map(toCandidate).filter((c): c is GoogleCandidate => c !== null);
  } catch (err) {
    throw asMapsError(err, 'Places API (New)');
  }
}

export interface AreaSuggestion {
  placeId: string;
  /** What to show in the list. */
  label: string;
}

/**
 * Area autocomplete for the typed-area screen (S9).
 *
 * Biased to Hyderabad and restricted to region-ish results, so typing "Ban"
 * offers Banjara Hills rather than every café whose name starts that way.
 */
export async function suggestAreas(query: string, near: LatLng): Promise<AreaSuggestion[]> {
  if (query.trim().length < 2) return [];
  const maps = await loadGoogleMaps();

  try {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = (await maps.importLibrary(
      'places',
    )) as google.maps.PlacesLibrary;

    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      includedPrimaryTypes: ['geocode'],
      locationBias: { center: new maps.LatLng(near.lat, near.lng), radius: 50_000 },
      sessionToken: new AutocompleteSessionToken(),
    });

    return (suggestions ?? [])
      .map((s) => {
        const p = s.placePrediction;
        if (!p?.placeId) return null;
        return { placeId: p.placeId, label: p.text?.toString() ?? '' };
      })
      .filter((s): s is AreaSuggestion => s !== null && s.label !== '');
  } catch (err) {
    throw asMapsError(err, 'Places API (New)');
  }
}

/** Resolves an autocomplete suggestion to the coordinates a search needs. */
export async function resolveAreaCenter(placeId: string): Promise<LatLng> {
  const maps = await loadGoogleMaps();
  try {
    const { Place } = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: ['location'] });
    const loc = place.location;
    if (!loc) throw new Error(`place ${placeId} has no location`);
    return { lat: loc.lat(), lng: loc.lng() };
  } catch (err) {
    throw asMapsError(err, 'Places API (New)');
  }
}
