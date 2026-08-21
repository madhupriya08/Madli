// Admin-surface fixtures, sourced verbatim from the prototype's own mock
// tables (ADMIN_ROWS, CLAIM_ROWS, REPORT_ROWS, AUDIT_ROWS, gemCandidates,
// lhRows/lhReasons in Madli Prototype.dc.html) — same source Phase 1 used
// for its real seed data. Place references are resolved against fixtures/places.ts.
import { placeById } from './places';

export const PLACE_IDS = {
  hotelShadab: '00000000-0000-0000-0000-0000000000f1',
  nimrah: '00000000-0000-0000-0000-0000000000f2',
  roastery: '00000000-0000-0000-0000-0000000000f3',
  chutneys: '00000000-0000-0000-0000-0000000000f4',
  cafeBahar: '00000000-0000-0000-0000-0000000000f5',
  subhanBakery: '00000000-0000-0000-0000-0000000000f6',
  mehfil: '00000000-0000-0000-0000-0000000000f9',
  deccanGrillHouse: '00000000-0000-0000-0000-0000000000f10',
  durgamCheruvu: '00000000-0000-0000-0000-0000000000e1',
  charminar: '00000000-0000-0000-0000-0000000000e5',
} as const;

export type AdminTier = 'superadmin' | 'catalogue' | 'moderation';
export type AdminAccountStatus = 'Active' | 'Suspended';

export interface AdminAccountRow {
  email: string;
  tier: AdminTier;
  lastActive: string;
  status: AdminAccountStatus;
}

// ADMIN_ROWS — this is the real evidence Phase 1 used to resolve "admin
// permission granularity" (multiple real tiers exist, not a single flat role).
export const adminAccounts: AdminAccountRow[] = [
  { email: 'priya@madli.app', tier: 'superadmin', lastActive: 'Now', status: 'Active' },
  { email: 'arjun@madli.app', tier: 'catalogue', lastActive: '26 min ago', status: 'Active' },
  { email: 'sneha@madli.app', tier: 'moderation', lastActive: '3 h ago', status: 'Active' },
  { email: 'vikram@madli.app', tier: 'catalogue', lastActive: '12 d ago', status: 'Suspended' },
];

export type ClaimStatus = 'pending' | 'verified' | 'rejected';

export interface BusinessClaimFixture {
  id: string;
  placeId: string;
  businessName: string;
  contactName: string;
  claimedRole: string;
  contactPhone: string;
  mapsLink: string;
  ageLabel: string;
  status: ClaimStatus;
  calledAt: string | null;
}

// CLAIM_ROWS — Cafe Bahar / Imran A. / Verified is the exact example the
// Phase 1 owner test account mirrors (see supabase/README.md test accounts).
export const businessClaimsSeed: BusinessClaimFixture[] = [
  {
    id: 'claim-1',
    placeId: PLACE_IDS.hotelShadab,
    businessName: 'Hotel Shadab',
    contactName: 'Ravi Kumar',
    claimedRole: 'Owner',
    contactPhone: '+91 98490 12345',
    mapsLink: 'https://maps.google.com/?q=Hotel+Shadab+Hyderabad',
    ageLabel: '2 days',
    status: 'pending',
    calledAt: null,
  },
  {
    id: 'claim-2',
    placeId: PLACE_IDS.roastery,
    businessName: 'Roastery Coffee House',
    contactName: 'Meera S.',
    claimedRole: 'Manager',
    contactPhone: '+91 91234 56780',
    mapsLink: 'https://maps.google.com/?q=Roastery+Coffee+House+Hyderabad',
    ageLabel: '4 days',
    status: 'pending',
    calledAt: null,
  },
  {
    id: 'claim-3',
    placeId: PLACE_IDS.cafeBahar,
    businessName: 'Cafe Bahar',
    contactName: 'Imran A.',
    claimedRole: 'Owner',
    contactPhone: '+91 99887 66554',
    mapsLink: 'https://maps.google.com/?q=Cafe+Bahar+Hyderabad',
    ageLabel: '12 days',
    status: 'verified',
    calledAt: '2026-08-08T10:00:00.000Z',
  },
  {
    id: 'claim-4',
    placeId: PLACE_IDS.deccanGrillHouse,
    businessName: 'Deccan Grill House',
    contactName: 'N. Prasad',
    claimedRole: 'Family',
    contactPhone: '+91 90000 11122',
    mapsLink: 'https://maps.google.com/?q=Deccan+Grill+House+Hyderabad',
    ageLabel: '19 days',
    status: 'rejected',
    calledAt: null,
  },
  {
    id: 'claim-5',
    placeId: PLACE_IDS.chutneys,
    businessName: 'Chutneys',
    contactName: 'Lakshmi D.',
    claimedRole: 'Owner',
    contactPhone: '+91 98765 43210',
    mapsLink: 'https://maps.google.com/?q=Chutneys+Hyderabad',
    ageLabel: '26 days',
    status: 'verified',
    calledAt: '2026-07-26T10:00:00.000Z',
  },
];

export type ReportType =
  | 'duplicate_listing'
  | 'timings_wrong'
  | 'permanently_closed'
  | 'inappropriate_content'
  | 'wrong_contact_info'
  | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ReportFixture {
  id: string;
  type: ReportType;
  label: string;
  placeId: string;
  reportedBy: string; // "user 4412" or "auto-flag"
  ageLabel: string;
  status: ReportStatus;
}

// REPORT_ROWS — resolves the report taxonomy (§8 open question #5, provisional).
export const reportsSeed: ReportFixture[] = [
  {
    id: 'report-1',
    type: 'timings_wrong',
    label: 'Timings wrong',
    placeId: PLACE_IDS.cafeBahar,
    reportedBy: 'user 4412',
    ageLabel: '3 h',
    status: 'open',
  },
  {
    id: 'report-2',
    type: 'permanently_closed',
    label: 'Permanently closed',
    placeId: PLACE_IDS.deccanGrillHouse,
    reportedBy: 'user 1187',
    ageLabel: '1 d',
    status: 'open',
  },
  {
    id: 'report-3',
    type: 'duplicate_listing',
    label: 'Duplicate listing',
    placeId: PLACE_IDS.mehfil,
    reportedBy: 'user 9903',
    ageLabel: '1 d',
    status: 'open',
  },
  {
    id: 'report-4',
    type: 'inappropriate_content',
    label: 'Dish name is abusive',
    placeId: PLACE_IDS.hotelShadab,
    reportedBy: 'auto-flag',
    ageLabel: '2 d',
    status: 'open',
  },
  {
    id: 'report-5',
    type: 'wrong_contact_info',
    label: 'Wrong phone number',
    placeId: PLACE_IDS.chutneys,
    reportedBy: 'user 2210',
    ageLabel: '5 d',
    status: 'resolved',
  },
];

export interface AuditLogFixture {
  id: string;
  when: string;
  who: string;
  what: string;
}

// AUDIT_ROWS
export const auditLogSeed: AuditLogFixture[] = [
  {
    id: 'audit-1',
    when: '14:02',
    who: 'priya@',
    what: 'Read location history for user 8841 — support ticket 4821',
  },
  { id: 'audit-2', when: '13:48', who: 'sneha@', what: 'Approved claim: Cafe Bahar' },
  { id: 'audit-3', when: '11:20', who: 'arjun@', what: 'Bulk import: 231 places added' },
  {
    id: 'audit-4',
    when: '10:07',
    who: 'priya@',
    what: 'Override: Hotel Shadab to #4 — coordinated logging from 14 accounts',
  },
  {
    id: 'audit-5',
    when: '09:31',
    who: 'sneha@',
    what: 'Suspended user 6620 — 41 logs in 20 minutes',
  },
  { id: 'audit-6', when: 'Yesterday', who: 'arjun@', what: 'Marked Deccan Grill House as closed' },
];

export interface GemCandidateFixture {
  placeId: string;
  name: string;
  localRank: number;
  outsideFameRank: number;
  locals: number;
  /** gemScore = outsideFameRank - localRank, confirmed formula (Phase 1). */
  gemScore: number;
}

// gemCandidates — the numbers themselves confirm gemScore = outside - local.
export const gemCandidatesSeed: GemCandidateFixture[] = [
  {
    placeId: PLACE_IDS.subhanBakery,
    name: 'Subhan Bakery',
    localRank: 4,
    outsideFameRank: 214,
    locals: 507,
    gemScore: 210,
  },
  {
    placeId: PLACE_IDS.nimrah,
    name: 'Nimrah Cafe & Bakery',
    localRank: 6,
    outsideFameRank: 180,
    locals: 318,
    gemScore: 174,
  },
  {
    placeId: PLACE_IDS.chutneys,
    name: 'Chutneys',
    localRank: 2,
    outsideFameRank: 94,
    locals: 289,
    gemScore: 92,
  },
  {
    placeId: PLACE_IDS.cafeBahar,
    name: 'Cafe Bahar',
    localRank: 9,
    outsideFameRank: 312,
    locals: 61,
    gemScore: 303,
  },
  {
    placeId: PLACE_IDS.durgamCheruvu,
    name: 'Durgam Cheruvu',
    localRank: 3,
    outsideFameRank: 41,
    locals: 344,
    gemScore: 38,
  },
];

export type LocationHistoryAction = 'search' | 'log_visit' | 'directions';

export interface LocationHistoryFixture {
  id: string;
  when: string;
  area: string;
  action: LocationHistoryAction;
  actionLabel: string;
}

// lhRows — the target user's location history, revealed only through the
// admin gate (S51). actionLabel preserves the prototype's exact copy.
export const locationHistorySeed: LocationHistoryFixture[] = [
  {
    id: 'lh-1',
    when: 'Today, 13:40',
    area: 'Jubilee Hills',
    action: 'search',
    actionLabel: 'Search',
  },
  { id: 'lh-2', when: 'Today, 09:12', area: 'Madhapur', action: 'search', actionLabel: 'Search' },
  {
    id: 'lh-3',
    when: 'Yesterday, 20:05',
    area: 'Old City',
    action: 'log_visit',
    actionLabel: 'Logged a visit',
  },
  {
    id: 'lh-4',
    when: 'Yesterday, 13:22',
    area: 'Jubilee Hills',
    action: 'search',
    actionLabel: 'Search',
  },
  {
    id: 'lh-5',
    when: '3 Aug, 19:44',
    area: 'Kondapur',
    action: 'directions',
    actionLabel: 'Directions',
  },
  {
    id: 'lh-6',
    when: '3 Aug, 08:30',
    area: 'Jubilee Hills',
    action: 'search',
    actionLabel: 'Search',
  },
  {
    id: 'lh-7',
    when: '2 Aug, 21:10',
    area: 'Secunderabad',
    action: 'log_visit',
    actionLabel: 'Logged a visit',
  },
  {
    id: 'lh-8',
    when: '1 Aug, 12:55',
    area: 'Banjara Hills',
    action: 'search',
    actionLabel: 'Search',
  },
];

// lhReasons
export const locationHistoryReasonOptions = [
  { value: 'support', label: 'Support ticket' },
  { value: 'abuse', label: 'Abuse investigation' },
  { value: 'legal', label: 'Legal request' },
] as const;

// CAT_ROWS-derived catalogue status, for the S43 list (derived from live
// place data rather than duplicated as a separate fixture).
export function catalogueStatus(placeId: string): 'Live' | 'Thin' | 'Closed' {
  const place = placeById(placeId);
  if (!place || !place.isActive) return 'Closed';
  return place.locals >= 50 ? 'Live' : 'Thin';
}
