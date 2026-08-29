// Mirrors Phase 1's `areas` table exactly (same ids/labels as supabase/seed.sql,
// sourced verbatim from the prototype's AREAS array). Alwal is deliberately
// below ranking threshold — the design's own thin-coverage example.
//
// `lat`/`lng` are new: approximate real neighbourhood centroids, added so a
// GPS reading can be resolved to "the nearest seeded neighbourhood" (S8).
// They are bucketing coordinates, not surveyed geocodes — good enough to rank
// eight known points by distance, not claimed as precise addresses.
export interface Area {
  id: string;
  name: string;
  coverageDepthLabel: string;
  lat: number;
  lng: number;
}

export const areas: Area[] = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    name: 'Jubilee Hills',
    coverageDepthLabel: '418 places · deep coverage',
    lat: 17.4325,
    lng: 78.4074,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    name: 'Banjara Hills',
    coverageDepthLabel: '362 places · deep coverage',
    lat: 17.4156,
    lng: 78.4347,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    name: 'Old City',
    coverageDepthLabel: '284 places · deep coverage',
    lat: 17.3616,
    lng: 78.4747,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a4',
    name: 'Madhapur',
    coverageDepthLabel: '251 places · deep coverage',
    lat: 17.4483,
    lng: 78.3915,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a5',
    name: 'Secunderabad',
    coverageDepthLabel: '203 places · good coverage',
    lat: 17.4399,
    lng: 78.4983,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a6',
    name: 'Kondapur',
    coverageDepthLabel: '166 places · good coverage',
    lat: 17.4615,
    lng: 78.3809,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a7',
    name: 'Nampally',
    coverageDepthLabel: '94 places · thin coverage',
    lat: 17.3937,
    lng: 78.4691,
  },
  {
    id: '00000000-0000-0000-0000-0000000000a8',
    name: 'Alwal',
    coverageDepthLabel: '31 places · not enough to rank',
    lat: 17.5,
    lng: 78.506,
  },
];

/** Nearest seeded neighbourhood to a raw coordinate, by straight-line distance. */
export function nearestArea(point: { lat: number; lng: number }): Area {
  let best = areas[0];
  let bestDist = Infinity;
  for (const a of areas) {
    const dLat = a.lat - point.lat;
    const dLng = a.lng - point.lng;
    // Squared planar distance is enough to just rank candidates by proximity
    // — no need for haversine's real-metres accuracy to pick a nearest-of-8.
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      best = a;
      bestDist = dist;
    }
  }
  return best;
}
