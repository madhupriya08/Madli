/// <reference types="google.maps" />
import { loadGoogleMaps, asMapsError, getMapsApiKey } from './googleMaps';
import {
  haversineMeters,
  priceLevelsForBudgetLabel,
  type AreaType,
  type Door,
  type LatLng,
} from './searchState';

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
  /** S16 vibe chips, multi-select. */
  vibes?: string[];
  /** S15 — who the outing is for. */
  who?: string | null;
  /** S15 — the occasion. */
  occasion?: string | null;
  /** Phase 9 §4 — S15 hard-constraint's own time window. One of EAT_TIME_WINDOW_OPTIONS/EXPLORE_TIME_WINDOW_OPTIONS. */
  timeWindow?: string | null;
  /** S15 — per-head budget cap. Narrows Google's price levels. */
  budgetCap?: string | null;
  /** S16 — price band. Also narrows price levels. */
  budget?: string | null;
  /** Phase 8 §6: which currency budgetCap/budget's labels are printed in — needed to resolve them back to Google price levels. */
  countryCode?: string | null;
  /** S16 — Eat door only. */
  kitchen?: string | null;
  /** Phase 9 §3 — Eat door only. One of CUISINE_OPTIONS. */
  cuisine?: string | null;
  /** Phase 9 §3 — Explore door only. One of PLACE_TYPE_OPTIONS. */
  placeType?: string | null;
  /** Phase 9 §3 — both doors. See SearchState.mostFamous's own comment. */
  mostFamous?: boolean;
  areaText?: string;
  areaType?: AreaType | null;
  allowsPets?: boolean;
  /** Phase 9 §1: Explore door only — see SearchState.servesPetFood's own comment. */
  servesPetFood?: boolean;
  familyFriendly?: boolean;
  coupleFriendly?: boolean;
  openLate?: boolean;
  waitCare?: boolean;
  /** Real Places request field, not a query word. */
  openNow?: boolean;
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

/**
 * The Places API (New) Text Search request accepts exactly one
 * `includedType` — not a list — so a domain whose real candidate set is
 * several types (Explore's park/tourist_attraction/historical_landmark/
 * museum/art_gallery/night_club, or any of its narrowed Indoor/Outdoor
 * subsets, none of which ever collapse to a single type) cannot be
 * expressed as a structural filter at all. Passing `includedTypesFor(...)[0]`
 * silently narrowed every Explore search to whichever type happened to sit
 * first in the list ("park") and discarded the other five — the confirmed
 * cause of Explore returning zero results in areas with real museums,
 * galleries, or landmarks but no place literally typed "park". Only pass a
 * structural type when the candidate set genuinely is one type (Eat, always
 * "restaurant"); otherwise rely on the free-text query — already carrying
 * the vibe/who/occasion words — and let Google's own relevance ranking
 * choose among the door's whole category set.
 */
function singleIncludedTypeFor(input: SearchCandidatesInput): string | undefined {
  if (input.door === 'eat') return 'restaurant';
  const types = includedTypesFor(input);
  return types.length === 1 ? types[0] : undefined;
}

/**
 * Explore has no single structural `includedType` to send Google (see
 * above), so it relies on the free-text query and Google's own relevance
 * ranking — which is loose enough to hand back a genuinely food-typed
 * place (a well-known restaurant matches "places to visit in X" too).
 * Dropped after the fact, on the real `types` Google returned for that
 * specific place, rather than a structural request that would risk
 * emptying Explore out again the way a single includedType already did
 * once (P5 §2).
 */
const EAT_ONLY_TYPES = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'meal_takeaway',
  'meal_delivery',
  'food',
]);

function belongsOnDoor(input: SearchCandidatesInput, types: string[]): boolean {
  if (input.door !== 'explore') return true;
  // Phase 9 §1: someone who explicitly asked for a pet-food-serving Explore
  // place is asking for exactly the food-adjacent result this filter would
  // otherwise strip — honour the ask instead of silently emptying it out.
  if (input.servesPetFood) return true;
  return !types.some((t) => EAT_ONLY_TYPES.has(t));
}

/**
 * Chip label → the words Google actually understands.
 *
 * Anything absent falls back to the label itself, so adding a chip to the UI
 * never silently drops it from the query — it just searches for its own name.
 */
const VIBE_QUERY: Record<string, string> = {
  // S16 Eat vibes
  Tiffin: 'tiffin south indian breakfast',
  Diner: 'casual diner',
  'Michelin-style': 'fine dining upscale',
  'Food truck / stall': 'street food stall',
  'Date night': 'romantic date night',
  'Calm and pleasant': 'quiet calm relaxed',
  // S16 Explore vibes
  Historical: 'historical landmarks heritage',
  Devotional: 'temples churches mosques',
  Sightseeing: 'sightseeing landmarks',
  'Nightlife / clubs': 'nightlife clubs bars',
  Concerts: 'live music concert venue',
  Scenic: 'scenic viewpoints lakes',
  // Retired single-vibe labels, still reachable from an older sessionStorage blob.
  'Quick bite': 'quick bite casual',
  Family: 'family friendly',
  Solo: 'casual for one',
  Celebration: 'celebration',
  'Late night': 'late night',
  Outdoors: 'parks outdoors viewpoints',
  Nightlife: 'nightlife',
  'Family day': 'family friendly attractions',
  Quiet: 'quiet peaceful places',
};

const WHO_QUERY: Record<string, string> = {
  Solo: 'good for one',
  Couple: 'good for couples',
  Family: 'family friendly',
  Friends: 'good for groups',
  Parents: 'comfortable seating quiet',
};

const OCCASION_QUERY: Record<string, string> = {
  Casual: 'casual',
  Date: 'romantic date',
  Celebration: 'celebration party',
  'Work lunch': 'business lunch',
  'Late-night': 'open late night',
};

/** Phase 9 §4 — EAT_TIME_WINDOW_OPTIONS/EXPLORE_TIME_WINDOW_OPTIONS' own words. */
const TIME_WINDOW_QUERY: Record<string, string> = {
  Morning: 'breakfast morning',
  Brunch: 'brunch',
  Lunch: 'lunch',
  Afternoon: 'afternoon',
  Evening: 'evening',
  Night: 'dinner night',
  'Late night': 'open late night',
};

const KITCHEN_QUERY: Record<string, string> = {
  'Veg-only kitchen': 'pure vegetarian',
  'Veg available': 'vegetarian options',
  'Non-veg': 'non vegetarian',
};

/** Phase 9 §3 — CUISINE_OPTIONS' own words, Eat door only. */
const CUISINE_QUERY: Record<string, string> = {
  'South Indian': 'south indian',
  'North Indian': 'north indian',
  Chinese: 'chinese',
  Continental: 'continental',
  Italian: 'italian',
  'Street food': 'street food stall',
  Cafe: 'cafe',
  'Fine dining': 'fine dining upscale',
  Bakery: 'bakery',
};

/** Phase 9 §3 — PLACE_TYPE_OPTIONS' own words, Explore door only. */
const PLACE_TYPE_QUERY: Record<string, string> = {
  'Touristic landmark': 'tourist attraction landmark',
  'Museum or gallery': 'museum art gallery',
  Nightlife: 'nightlife clubs bars',
  'Local favorite': 'local favorite hidden gem',
  Scenic: 'scenic viewpoint',
};

/**
 * Free-text query that carries who, occasion, vibe, kitchen, cuisine, place
 * type, most-famous, pets and area.
 *
 * Google has no structured field for any of these, so they are folded into
 * words rather than dropped. Budget is the exception — it maps to a real
 * request parameter below.
 */
function textQueryFor(input: SearchCandidatesInput): string {
  const parts: string[] = [];
  for (const vibe of input.vibes ?? []) parts.push(VIBE_QUERY[vibe] ?? vibe);
  if (input.who) parts.push(WHO_QUERY[input.who] ?? input.who);
  if (input.occasion) parts.push(OCCASION_QUERY[input.occasion] ?? input.occasion);
  if (input.timeWindow) parts.push(TIME_WINDOW_QUERY[input.timeWindow] ?? input.timeWindow);
  if (input.kitchen) parts.push(KITCHEN_QUERY[input.kitchen] ?? input.kitchen);
  if (input.cuisine) parts.push(CUISINE_QUERY[input.cuisine] ?? input.cuisine);
  if (input.placeType) parts.push(PLACE_TYPE_QUERY[input.placeType] ?? input.placeType);
  if (input.mostFamous) parts.push('famous popular well known trending');
  if (input.allowsPets) parts.push('pet friendly');
  if (input.servesPetFood) parts.push('serves pet food');
  if (input.familyFriendly) parts.push('family friendly');
  if (input.coupleFriendly) parts.push('good for couples');
  if (input.openLate) parts.push('open late');
  if (input.waitCare) parts.push(input.door === 'eat' ? 'no wait' : 'not crowded');

  // De-duplicated: "Family" as the who-chip and "family friendly" as a switch
  // are the same words, and repeating them skews the text match.
  const seen = new Set<string>();
  const words = parts.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  const subject = input.door === 'eat' ? 'restaurants' : 'places to visit';
  const where = input.areaText?.trim() ? ` in ${input.areaText.trim()}` : '';
  return `${words.join(' ')} ${subject}${where}`.trim();
}

/**
 * Budget chips → Google price levels.
 *
 * Both the S15 per-head cap and the S16 band land on the same axis, so the
 * narrower of the two wins rather than one silently overwriting the other.
 * Returns null when neither is set, or when the person said price is not the
 * issue — an empty `priceLevels` array would filter everything out.
 *
 * Phase 8 §6: resolved via priceLevelsForBudgetLabel (searchState.tsx) now,
 * not a hardcoded label→tiers table here — that table only ever covered
 * India's rupee labels plus the relative $ notation, so a new currency's
 * labels would have silently stopped narrowing the search at all.
 */
function priceTiersFor(input: SearchCandidatesInput): number[] | null {
  const sets = [
    priceLevelsForBudgetLabel(input.budgetCap ?? null, input.countryCode ?? null, 'cap'),
    priceLevelsForBudgetLabel(input.budget ?? null, input.countryCode ?? null, 'band'),
  ].filter((tiers) => tiers.length > 0);
  if (sets.length === 0) return null;
  // Intersect, so two answers narrow rather than fight. If they contradict
  // each other outright, fall back to the first — an empty set would return
  // nothing at all, which reads as "there is nowhere to eat here".
  const intersection = sets.reduce((acc, tiers) => acc.filter((t) => tiers.includes(t)));
  return intersection.length > 0 ? intersection : sets[0];
}

/**
 * Numeric tiers → the `PriceLevel` enum members the Places library expects.
 *
 * Resolved from the library object rather than hardcoded, and skipped
 * entirely if the enum is missing: sending an unrecognised value would fail
 * the whole search, and losing the budget filter is a far smaller cost than
 * losing the results.
 */
function priceLevelsFor(
  places: google.maps.PlacesLibrary,
  tiers: number[] | null,
): google.maps.places.PriceLevel[] | undefined {
  if (!tiers || tiers.length === 0) return undefined;
  const e = (places as unknown as { PriceLevel?: Record<string, string> }).PriceLevel;
  if (!e) return undefined;
  const byTier: Record<number, string | undefined> = {
    1: e.INEXPENSIVE,
    2: e.MODERATE,
    3: e.EXPENSIVE,
    4: e.VERY_EXPENSIVE,
  };
  const levels = tiers
    .map((t) => byTier[t])
    .filter((v): v is string => typeof v === 'string') as google.maps.places.PriceLevel[];
  return levels.length > 0 ? levels : undefined;
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
    const placesLib = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;
    const { Place } = placesLib;
    const priceLevels = priceLevelsFor(placesLib, priceTiersFor(input));
    const includedType = singleIncludedTypeFor(input);

    const { places } = await Place.searchByText({
      textQuery: textQueryFor(input),
      fields: SEARCH_FIELDS,
      locationBias: {
        center: new maps.LatLng(input.center.lat, input.center.lng),
        radius: input.radiusMeters,
      },
      maxResultCount: maxResults,
      // Both omitted unless asked for: `isOpenNow: false` is a request to see
      // only closed places, not an absence of preference.
      ...(input.openNow ? { isOpenNow: true } : {}),
      ...(priceLevels ? { priceLevels } : {}),
      ...(includedType ? { includedType } : {}),
    });

    const candidates = (places ?? [])
      .map(toCandidate)
      .filter((c): c is GoogleCandidate => c !== null)
      .filter((c) => belongsOnDoor(input, c.types));

    if (input.clipToRadius === false) return candidates;
    return withinRadius(candidates, input.center, input.radiusMeters);
  } catch (err) {
    throw asMapsError(err, 'Places API (New)');
  }
}

/**
 * Phase 8 §5: S52's direct name search, against live Google Places rather
 * than only the 17-place seeded catalogue — a search for any real place
 * used to come back "No matches" the moment it wasn't one of those 17.
 * Deliberately not door-restricted like searchCandidates: a name search
 * should find a place whether it happens to be an Eat or Explore door
 * pick, or neither. Biased toward the person's area but not clipped to a
 * radius — someone searching a name may mean a place well outside it.
 */
export async function searchPlacesByQuery(
  query: string,
  near: LatLng,
  maxResults = 10,
): Promise<GoogleCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const maps = await loadGoogleMaps();
  try {
    const { Place } = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;
    const { places } = await Place.searchByText({
      textQuery: trimmed,
      fields: SEARCH_FIELDS,
      locationBias: { center: new maps.LatLng(near.lat, near.lng), radius: 50_000 },
      maxResultCount: maxResults,
    });
    return (places ?? []).map(toCandidate).filter((c): c is GoogleCandidate => c !== null);
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

export interface ResolvedArea {
  center: LatLng;
  /** ISO 3166-1 alpha-2 (e.g. "IN", "US"), or null when Google didn't return one. */
  countryCode: string | null;
}

/**
 * Resolves an autocomplete suggestion to the coordinates a search needs —
 * and its country, which is what actually decides currency and distance
 * unit for the filters built from wherever this area turns out to be.
 */
export async function resolveAreaCenter(placeId: string): Promise<ResolvedArea> {
  const maps = await loadGoogleMaps();
  try {
    const { Place } = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: ['location', 'addressComponents'] });
    const loc = place.location;
    if (!loc) throw new Error(`place ${placeId} has no location`);
    const countryCode =
      place.addressComponents?.find((c) => c.types.includes('country'))?.shortText ?? null;
    return { center: { lat: loc.lat(), lng: loc.lng() }, countryCode };
  } catch (err) {
    throw asMapsError(err, 'Places API (New)');
  }
}

export interface ReverseGeocodedArea {
  /** The smallest real locality name Google reports, or null. */
  label: string | null;
  /** ISO 3166-1 alpha-2 (e.g. "IN", "US"), or null when Google didn't return one. */
  countryCode: string | null;
}

/**
 * A raw GPS reading, named — and its country, for the same reason
 * `resolveAreaCenter` above returns one. Used when a device position is too
 * far from any of the eight seeded neighbourhoods to bucket into one
 * honestly (S8) — Madli is not restricted to one city, so a reading from
 * anywhere else in the world still needs a real, human name rather than
 * being force-fit into the nearest Hyderabad neighbourhood regardless of
 * actual distance.
 *
 * `label` prefers the smallest real locality Google reports — a
 * sublocality/neighbourhood over the whole city — falling back to the
 * city, then the full formatted address, so this always returns
 * *something* nameable rather than a bare coordinate pair.
 */
export async function reverseGeocodeArea(point: LatLng): Promise<ReverseGeocodedArea> {
  const maps = await loadGoogleMaps();
  try {
    const { Geocoder } = (await maps.importLibrary('geocoding')) as google.maps.GeocodingLibrary;
    const { results } = await new Geocoder().geocode({ location: point });
    const first = results?.[0];
    if (!first) return { label: null, countryCode: null };
    const pick = (type: string) =>
      first.address_components.find((c) => c.types.includes(type))?.long_name;
    const pickShort = (type: string) =>
      first.address_components.find((c) => c.types.includes(type))?.short_name;
    return {
      label:
        pick('sublocality_level_1') ??
        pick('sublocality') ??
        pick('neighborhood') ??
        pick('locality') ??
        first.formatted_address ??
        null,
      countryCode: pickShort('country') ?? null,
    };
  } catch (err) {
    throw asMapsError(err, 'Geocoding API');
  }
}
