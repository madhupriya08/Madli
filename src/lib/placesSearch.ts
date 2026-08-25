/// <reference types="google.maps" />
import { loadGoogleMaps, asMapsError, getMapsApiKey } from './googleMaps';
import { haversineMeters, type AreaType, type Door, type LatLng } from './searchState';

/**
 * Google Places, reached through the Maps JavaScript `places` library rather
 * than the Places REST API.
 *
 * That choice keeps the browser key the only key: the JS library is covered
 * by the same referrer-restricted Maps key already in the bundle, so nothing
 * here needs an Edge Function or a server-side secret.
 *
 * Search uses the person's filters as the query. Rating and review count are
 * kept so discovery can order by what people actually wrote on Google.
 */

export interface GoogleCandidate {
  placeId: string;
  name: string;
  address: string;
  location: LatLng;
  types: string[];
  googleRating?: number;
  reviewCount?: number;
  editorialSummary?: string;
  /** Hero shot — first Google photo, when available. */
  photoUrl?: string;
  /** Up to ten Google photo URLs for the detail gallery. */
  photoUrls?: string[];
  openNow?: boolean;
}

export interface GooglePlaceDetails extends GoogleCandidate {
  phone?: string;
  hours?: string;
  website?: string;
  googleMapsUri?: string;
  /** Photo credit lines required when showing Google photos. */
  photoAttributions?: string[];
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
  /** When false, keep the named-area query as Google returned it. */
  clipToRadius?: boolean;
}

function includedTypesFor(input: SearchCandidatesInput): string[] {
  const base = DOOR_TYPES[input.door];
  if (input.door !== 'explore' || !input.areaType) return base;
  const narrowed = AREA_TYPE_TYPES[input.areaType];
  if (!narrowed) return base;
  const intersection = base.filter((t) => narrowed.includes(t));
  return intersection.length > 0 ? intersection : base;
}

const VIBE_QUERY: Record<string, string> = {
  'Quick bite': 'quick bite casual',
  'Date night': 'romantic date night',
  Family: 'family friendly',
  Solo: 'casual for one',
  Celebration: 'celebration',
  'Late night': 'late night',
  Sightseeing: 'sightseeing landmarks',
  Historical: 'historical landmarks',
  Outdoors: 'parks outdoors viewpoints',
  Nightlife: 'nightlife',
  'Family day': 'family friendly attractions',
  Quiet: 'quiet peaceful places',
};

/**
 * Free-text query that carries vibe, pets, and area — Google has no structured
 * field for those, so they are folded into words rather than dropped.
 */
function textQueryFor(input: SearchCandidatesInput): string {
  const parts: string[] = [];
  if (input.vibe) parts.push(VIBE_QUERY[input.vibe] ?? input.vibe);
  if (input.allowsPets) parts.push('pet friendly');
  if (input.servesPetFood) parts.push('serves pet food');

  const subject = input.door === 'eat' ? 'restaurants' : 'places to visit';
  const where = input.areaText?.trim() ? ` in ${input.areaText.trim()}` : '';
  return `${parts.join(' ')} ${subject}${where}`.trim();
}

type PlacePhotoLike = {
  getURI?: (opts?: { maxWidth?: number; maxHeight?: number }) => string;
  toJSON?: (key?: string) => unknown;
  authorAttributions?: Array<{ displayName?: string | null }>;
};

type PlaceLike = {
  id?: string | null;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: { lat: () => number; lng: () => number } | null;
  types?: string[] | null;
  rating?: number | null;
  userRatingCount?: number | null;
  editorialSummary?: string | null;
  photos?: PlacePhotoLike[] | null;
  nationalPhoneNumber?: string | null;
  websiteURI?: string | null;
  googleMapsURI?: string | null;
  regularOpeningHours?: { weekdayDescriptions?: string[] | null } | null;
};

function mediaUrlFromPhotoJson(json: unknown): string | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const name = (json as { name?: unknown }).name;
  if (typeof name !== 'string' || !name.includes('/photos/')) return undefined;
  const key = getMapsApiKey();
  if (!key) return undefined;
  // Places Photo (New) media endpoint — works as an <img src> with the same key.
  return `https://places.googleapis.com/v1/${name}/media?maxHeightPx=800&key=${encodeURIComponent(key)}`;
}

function photoEntriesOf(p: PlaceLike): { urls: string[]; attributions: string[] } {
  const urls: string[] = [];
  const attributions: string[] = [];
  for (const photo of p.photos ?? []) {
    let url: string | undefined;
    try {
      // Official sample uses a single dimension — both can produce empty results.
      url = photo.getURI?.({ maxHeight: 800 });
    } catch {
      url = undefined;
    }
    if (!url) {
      try {
        url = mediaUrlFromPhotoJson(photo.toJSON?.());
      } catch {
        url = undefined;
      }
    }
    if (!url) continue;
    urls.push(url);
    const credit = photo.authorAttributions?.[0]?.displayName;
    if (credit) attributions.push(credit);
  }
  return { urls, attributions };
}

function toCandidate(p: PlaceLike): GoogleCandidate | null {
  const loc = p.location;
  if (!p.id || !loc) return null;
  const { urls } = photoEntriesOf(p);
  return {
    placeId: p.id,
    name: p.displayName ?? 'Unnamed place',
    address: p.formattedAddress ?? '',
    location: { lat: loc.lat(), lng: loc.lng() },
    types: p.types ?? [],
    googleRating: p.rating ?? undefined,
    reviewCount: p.userRatingCount ?? undefined,
    editorialSummary: p.editorialSummary ?? undefined,
    photoUrl: urls[0],
    photoUrls: urls,
  };
}

const SEARCH_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'rating',
  'userRatingCount',
  'editorialSummary',
  'photos',
];

const DETAIL_FIELDS = [
  ...SEARCH_FIELDS,
  'nationalPhoneNumber',
  'websiteURI',
  'googleMapsURI',
  'regularOpeningHours',
];

function withinRadius(
  candidates: GoogleCandidate[],
  center: LatLng,
  radiusMeters: number,
): GoogleCandidate[] {
  return candidates.filter((c) => haversineMeters(center, c.location) <= radiusMeters);
}

/**
 * Candidates for the current door + filters.
 *
 * Always a text search so vibe, pets, and area actually reach Google. Results
 * outside the travel radius from the search origin are dropped.
 */
export async function searchCandidates(input: SearchCandidatesInput): Promise<GoogleCandidate[]> {
  const maps = await loadGoogleMaps();
  const maxResults = input.maxResults ?? 20;

  try {
    const { Place } = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;

    const { places } = await Place.searchByText({
      textQuery: textQueryFor(input),
      fields: SEARCH_FIELDS,
      locationBias: {
        center: new maps.LatLng(input.center.lat, input.center.lng),
        radius: input.radiusMeters,
      },
      includedType: input.door === 'eat' ? 'restaurant' : includedTypesFor(input)[0],
      maxResultCount: maxResults,
    });

    const candidates = (places ?? [])
      .map(toCandidate)
      .filter((c): c is GoogleCandidate => c !== null);

    if (input.clipToRadius === false) return candidates;
    return withinRadius(candidates, input.center, input.radiusMeters);
  } catch (err) {
    throw asMapsError(err, 'Places API (New)');
  }
}

export async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceDetails> {
  const maps = await loadGoogleMaps();
  try {
    const { Place } = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;
    // Search sometimes returns resource names ("places/ChIJ…"); Place wants the id.
    const id = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
    const place = new Place({ id });
    await place.fetchFields({ fields: DETAIL_FIELDS });
    const like = place as unknown as PlaceLike;
    const candidate = toCandidate(like);
    if (!candidate) throw new Error(`place ${placeId} has no location`);
    const { attributions } = photoEntriesOf(like);
    const hours = place.regularOpeningHours?.weekdayDescriptions?.join(' · ');
    return {
      ...candidate,
      phone: place.nationalPhoneNumber ?? undefined,
      hours: hours || undefined,
      website: place.websiteURI ?? undefined,
      googleMapsUri: place.googleMapsURI ?? undefined,
      photoAttributions: attributions.length > 0 ? attributions : undefined,
    };
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
