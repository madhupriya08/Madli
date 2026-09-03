import type { Door } from '../lib/searchState';

/**
 * P13 §7: "the ranking list should categorize the places... even divide the
 * places based on the selected filters like breakfast spots, bar and
 * restaurant, pub, or temples, concerts etc" — a Google-sourced ranking only
 * ever grouped by door (one "Eat" column, one "Explore" column), which is
 * the coarsest possible split once someone has ranked more than a handful
 * of places. This is the finer grouping, built on Google's own `types`
 * array (already stored per ranking — see google_place_rankings.types'
 * own comment) rather than inventing a new taxonomy: the same subtype logic
 * search already understands (KITCHEN_QUERY, PLACE_TYPE_QUERY in
 * placesSearch.ts) reused here for display, not for search.
 *
 * A Google place carries far more types than the handful the search filters
 * ever query for (DOOR_TYPES in placesSearch.ts) — a ranked restaurant's own
 * `types` might include 'bar', a museum's might include 'tourist_attraction'
 * — so this checks against the full, documented Google Places type
 * vocabulary, not just the types this app's own search requests.
 */

export interface RankedSubtype {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface SubtypeRule {
  test: (types: string[]) => boolean;
  subtype: RankedSubtype;
}

function has(types: string[], ...candidates: string[]): boolean {
  return candidates.some((c) => types.includes(c));
}

const EAT_RULES: SubtypeRule[] = [
  {
    test: (t) => has(t, 'bakery'),
    subtype: { id: 'bakery', label: 'Bakeries', icon: 'utensils', color: 'var(--coral-400)' },
  },
  {
    test: (t) => has(t, 'cafe', 'coffee_shop'),
    subtype: { id: 'cafe', label: 'Cafes', icon: 'utensils', color: 'var(--sky-400)' },
  },
  {
    test: (t) => has(t, 'bar', 'pub', 'night_club', 'wine_bar'),
    subtype: { id: 'bar', label: 'Bars & pubs', icon: 'sparkles', color: 'var(--coral-500)' },
  },
  {
    test: (t) => has(t, 'meal_takeaway', 'meal_delivery'),
    subtype: { id: 'quick-bite', label: 'Quick bites', icon: 'utensils', color: 'var(--teal-400)' },
  },
  {
    // Google splits breakfast out as its own type on many listings.
    test: (t) => has(t, 'breakfast_restaurant', 'brunch_restaurant'),
    subtype: {
      id: 'breakfast',
      label: 'Breakfast spots',
      icon: 'utensils',
      color: 'var(--sky-500)',
    },
  },
];
const EAT_FALLBACK: RankedSubtype = {
  id: 'restaurant',
  label: 'Restaurants',
  icon: 'utensils',
  color: 'var(--teal-500)',
};

const EXPLORE_RULES: SubtypeRule[] = [
  {
    test: (t) => has(t, 'hindu_temple', 'place_of_worship', 'church', 'mosque', 'synagogue'),
    subtype: {
      id: 'worship',
      label: 'Temples & worship',
      icon: 'sparkles',
      color: 'var(--slate-500)',
    },
  },
  {
    test: (t) => has(t, 'museum', 'art_gallery'),
    subtype: {
      id: 'museum',
      label: 'Museums & galleries',
      icon: 'map-pin',
      color: 'var(--slate-500)',
    },
  },
  {
    test: (t) => has(t, 'park', 'national_park', 'garden'),
    subtype: { id: 'park', label: 'Parks & lakes', icon: 'map-pin', color: 'var(--teal-600)' },
  },
  {
    test: (t) =>
      has(t, 'stadium', 'movie_theater', 'performing_arts_theater', 'concert_hall', 'auditorium'),
    subtype: { id: 'events', label: 'Concerts & shows', icon: 'sparkles', color: 'var(--sky-500)' },
  },
  {
    test: (t) => has(t, 'night_club', 'bar'),
    subtype: { id: 'nightlife', label: 'Nightlife', icon: 'sparkles', color: 'var(--coral-500)' },
  },
];
const EXPLORE_FALLBACK: RankedSubtype = {
  id: 'landmark',
  label: 'Landmarks & sights',
  icon: 'map-pin',
  color: 'var(--teal-600)',
};

/** Which display bucket a ranked Google place falls into, for this door. Always resolves to something — the door-appropriate fallback when nothing more specific matches. */
export function subtypeFor(door: Door, types: string[]): RankedSubtype {
  const rules = door === 'eat' ? EAT_RULES : EXPLORE_RULES;
  const fallback = door === 'eat' ? EAT_FALLBACK : EXPLORE_FALLBACK;
  return rules.find((r) => r.test(types))?.subtype ?? fallback;
}
