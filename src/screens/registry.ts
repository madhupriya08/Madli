// The screen catalogue, per design_handoff_madli/README.md. S12 (OTP
// verification) is deliberately absent: Madli has no second factor, so the
// screen and its route were removed rather than left reachable-but-unused.
// Phase 7: S43/S44/S45 (Catalogue list/edit/bulk-import), S46 (Ranking and
// trust), S48 (Business claims queue), S49 (Reports and moderation), and S51
// (Location history access) were removed the same way, on explicit request
// — the screens, their routes, and their AdminShell nav entries are gone,
// not just hidden. S34 (Settings — claim a business) and the whole Owner
// group (S37-S40: claim request, claim status, edit listing, owner profile)
// were removed for the same reason — nobody can become an Owner through the
// app any more, so there's nothing left for that group to hold. The 'owner'
// persona itself was retired alongside it (src/dev/PersonaContext.tsx) since
// nothing in the app treats it differently from 'user' any more.
// P14: S4 (Neighbourhood page), S25/S26/S27 (Log a visit — trigger/
// comparison/landed) were removed the same way, once the seed catalogue
// they were built on was retired. S4 was a per-fixed-neighbourhood SEO page
// enumerated from the eight seeded areas, with nothing else in the app
// linking to it; S25-27 was a pairwise ranking mechanic that only ever
// understood the 17 seeded places (RankGooglePlaceForm covers the same
// ground for any real place, catalogue or not).
// The handoff's own numbering is kept for every other screen. Drives the dev
// harness's persona/state switcher and "All screens" tray (§7 of the Phase 2
// prompt) and the router in routes.tsx. `states` lists the variants that
// screen's own README table specifies — the dev harness uses this to offer a
// state picker instead of a generic one.
export type ScreenGroup =
  | 'Marketing'
  | 'App shell & onboarding'
  | 'Discovery core loop'
  | 'Personal state'
  | 'Admin';

export interface ScreenMeta {
  id: string;
  name: string;
  path: string;
  group: ScreenGroup;
  states: string[];
  roles: string;
  realDivergence?: boolean;
}

export const screenRegistry: ScreenMeta[] = [
  // Marketing
  {
    id: 'S1',
    name: 'Landing page',
    path: '/landing',
    group: 'Marketing',
    states: ['default'],
    roles: 'Guest',
  },
  {
    id: 'S2',
    name: 'How it works',
    path: '/how-it-works',
    group: 'Marketing',
    states: ['default'],
    roles: 'Guest',
  },
  {
    id: 'S3',
    name: 'Gem of the town',
    path: '/gem-of-the-town',
    group: 'Marketing',
    states: ['default'],
    roles: 'All',
  },
  {
    id: 'S5',
    name: 'Legal and static',
    path: '/legal',
    group: 'Marketing',
    states: ['default'],
    roles: 'All',
  },

  // App shell & onboarding
  {
    id: 'S6',
    name: 'First open / splash',
    path: '/splash',
    group: 'App shell & onboarding',
    states: ['default'],
    roles: 'Guest',
  },
  {
    id: 'S7',
    name: 'Home — two doors',
    // Not '/': that is now a session gate (src/screens/RootRoute.tsx) which
    // serves the marketing landing page to logged-out visitors. The app home
    // needs a path of its own so guests — who have no session by definition —
    // can still be sent here.
    path: '/app',
    group: 'App shell & onboarding',
    states: ['default', 'personalized'],
    roles: 'Guest, User',
  },
  {
    id: 'S8',
    // Merged with the old S9 manual-area screen: a single required step
    // between the auth choice and Home, not a cold OS prompt with a typed
    // fallback screen behind it. S9 no longer exists as its own screen.
    name: 'Pick your area',
    path: '/area',
    group: 'App shell & onboarding',
    states: ['default'],
    roles: 'Guest, User',
  },
  {
    // Not one of the original 52 — a new screen this round asked for,
    // inserted right after S8. Given the next free sequential id rather than
    // a slug, matching how S52 (also added later) was numbered.
    id: 'S53',
    name: 'Local or visitor',
    path: '/local-or-visitor',
    group: 'App shell & onboarding',
    states: ['default'],
    roles: 'Guest, User',
  },
  {
    id: 'S10',
    name: 'Out of coverage',
    path: '/out-of-coverage',
    group: 'App shell & onboarding',
    states: ['default'],
    roles: 'Guest, User',
  },
  {
    id: 'S11',
    name: 'Signup',
    path: '/signup',
    group: 'App shell & onboarding',
    states: ['default', 'validation error'],
    roles: 'Guest → User',
  },
  {
    id: 'S13',
    name: 'Login',
    path: '/login',
    group: 'App shell & onboarding',
    states: ['default', 'invalid'],
    roles: 'User, Owner',
  },
  {
    id: 'S14',
    name: 'Forgot password',
    path: '/forgot-password',
    group: 'App shell & onboarding',
    states: ['request sent', 'reset form', 'success'],
    roles: 'Guest → User',
  },

  // Discovery core loop
  {
    id: 'S52',
    name: 'Search entry',
    path: '/search',
    group: 'Discovery core loop',
    states: ['default'],
    roles: 'Guest, User',
  },
  {
    id: 'S15',
    name: 'Intake',
    path: '/intake',
    group: 'Discovery core loop',
    states: ['default'],
    roles: 'Guest, User',
    realDivergence: true,
  },
  {
    id: 'S16',
    name: 'Filters and tags',
    path: '/filters',
    group: 'Discovery core loop',
    states: ['default', 'saved sets'],
    roles: 'Guest, User',
  },
  {
    id: 'S17',
    name: 'Results — food',
    path: '/results/eat',
    group: 'Discovery core loop',
    states: ['default', 'loading', 'empty', 'guest capped'],
    roles: 'Guest, User',
    realDivergence: true,
  },
  {
    id: 'S18',
    name: 'Results — visit places',
    path: '/results/explore',
    group: 'Discovery core loop',
    states: ['default', 'loading', 'map view', 'empty'],
    roles: 'Guest, User',
    realDivergence: true,
  },
  {
    id: 'S19',
    name: 'Place detail',
    path: '/places/:slug',
    group: 'Discovery core loop',
    states: ['guest', 'shared link', 'user', 'admin'],
    roles: 'All',
    realDivergence: true,
  },
  {
    id: 'S20',
    name: 'Bridge tap',
    path: '/places/:slug/bridge',
    group: 'Discovery core loop',
    states: ['default', 'locked'],
    roles: 'User',
    realDivergence: true,
  },
  {
    id: 'S21',
    name: 'Map and directions',
    path: '/places/:slug/map',
    group: 'Discovery core loop',
    states: ['default'],
    roles: 'Guest, User',
    realDivergence: true,
  },
  {
    id: 'S22',
    name: 'Share sheet',
    path: '/share',
    group: 'Discovery core loop',
    states: ['default'],
    roles: 'All',
  },

  // Personal state
  {
    id: 'S23',
    name: 'Bookmarks and wishlist',
    path: '/bookmarks',
    group: 'Personal state',
    states: ['default', 'empty', 'nearby'],
    roles: 'User',
  },
  {
    id: 'S24',
    name: 'Saved plan detail',
    path: '/plans/:id',
    group: 'Personal state',
    states: ['default', 'shared link'],
    roles: 'User',
  },
  {
    id: 'S28',
    name: 'Save your list (guest gate)',
    path: '/save-your-list',
    group: 'Personal state',
    states: ['default'],
    roles: 'Guest',
  },
  {
    id: 'S29',
    name: 'Ranking onboarding',
    path: '/ranking-onboarding',
    group: 'Personal state',
    states: ['default'],
    roles: 'User',
  },
  {
    id: 'S30',
    name: 'Post-visit nudge',
    path: '/post-visit-nudge',
    group: 'Personal state',
    states: ['default'],
    roles: 'User',
  },
  {
    id: 'S31',
    name: 'My ranked list',
    path: '/my-list',
    group: 'Personal state',
    states: ['default', 'empty'],
    roles: 'User',
    realDivergence: true,
  },
  {
    id: 'S32',
    name: 'Profile',
    path: '/profile',
    group: 'Personal state',
    states: ['default'],
    roles: 'User',
  },
  {
    id: 'S33',
    name: 'Settings — main',
    path: '/settings',
    group: 'Personal state',
    states: ['default'],
    roles: 'User',
  },
  {
    id: 'S35',
    name: 'Notification settings',
    path: '/settings/notifications',
    group: 'Personal state',
    states: ['default'],
    roles: 'User',
  },
  {
    id: 'S36',
    name: 'Privacy settings',
    path: '/settings/privacy',
    group: 'Personal state',
    states: ['default', 'delete confirm'],
    roles: 'User',
  },

  // Admin
  {
    id: 'S41',
    name: 'Admin login',
    path: '/admin/login',
    group: 'Admin',
    states: ['default', 'invalid credentials', 'access-denied'],
    roles: 'Admin',
  },
  {
    id: 'S42',
    name: 'Analytics dashboard',
    path: '/admin',
    group: 'Admin',
    states: ['default', 'loading'],
    roles: 'Admin',
    realDivergence: true,
  },
  {
    id: 'S47',
    name: 'Gem selection',
    path: '/admin/gems',
    group: 'Admin',
    states: ['default'],
    roles: 'Admin',
  },
  {
    id: 'S50',
    name: 'Roles, accounts, audit log',
    path: '/admin/roles',
    group: 'Admin',
    states: ['default'],
    roles: 'Admin',
    realDivergence: true,
  },
];

export function screenById(id: string): ScreenMeta | undefined {
  return screenRegistry.find((s) => s.id === id);
}
