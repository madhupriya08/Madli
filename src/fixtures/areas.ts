// Mirrors Phase 1's `areas` table exactly (same ids/labels as supabase/seed.sql,
// sourced verbatim from the prototype's AREAS array). Alwal is deliberately
// below ranking threshold — the design's own thin-coverage example.
export interface Area {
  id: string;
  name: string;
  coverageDepthLabel: string;
}

export const areas: Area[] = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    name: 'Jubilee Hills',
    coverageDepthLabel: '418 places · deep coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    name: 'Banjara Hills',
    coverageDepthLabel: '362 places · deep coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    name: 'Old City',
    coverageDepthLabel: '284 places · deep coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a4',
    name: 'Madhapur',
    coverageDepthLabel: '251 places · deep coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a5',
    name: 'Secunderabad',
    coverageDepthLabel: '203 places · good coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a6',
    name: 'Kondapur',
    coverageDepthLabel: '166 places · good coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a7',
    name: 'Nampally',
    coverageDepthLabel: '94 places · thin coverage',
  },
  {
    id: '00000000-0000-0000-0000-0000000000a8',
    name: 'Alwal',
    coverageDepthLabel: '31 places · not enough to rank',
  },
];
