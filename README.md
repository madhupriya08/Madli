# Madli

Locally-ranked food and travel app for Hyderabad — "three picks, one reason, two minutes." Real
Supabase backend, real frontend integration, a committed Playwright E2E suite, and an automated
accessibility scan across the full 52-screen catalogue. Built across four phases (backend → UI →
integration → final QA); this document is the current, single front door — for the phase-by-phase
history and full evidence behind every claim below, see "Where to find more" at the bottom.

## Running it

```
npm install
cp .env.example .env.local   # fill in the real Supabase URL + anon key + test account password
npm run dev                  # http://localhost:5173 — the app exactly as a visitor sees it
npm run dev:harness          # same, plus the dev persona/breakpoint/all-screens rail
```

Without a real `.env.local`, the app fails fast at boot with a visible error screen ("Madli
couldn't load") rather than silently showing stale mock data — `src/lib/supabaseClient.ts` throws
if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, and `src/main.tsx` shows that error
screen if the real startup fetch (`src/lib/liveConfig.ts`) fails.

`npm run dev:harness` opens onto the **dev harness** (`src/dev/DevHarness.tsx`) — a left rail with
a persona switcher (Guest/User/Owner/Admin, plus admin tier and grants), a breakpoint switcher
(mobile 390 / desktop 1280), and an "All screens" tray listing all 52 screens by group. The
Guest/User/Owner/Admin quick-switch is a dev-only convenience that bypasses real login
(`src/dev/PersonaContext.tsx` documents this explicitly) — a real `LoginScreen`/`AdminLoginScreen`
sign-in creates a real Supabase session first and converges on the same state shape.

The rail is **opt-in**, not the default: plain `npm run dev` renders the app exactly as production
does, so what you see locally is what a visitor gets. It is enabled by `VITE_DEV_HARNESS=1`, set by
the `.env.harness` mode file (`vite --mode harness`) so it behaves identically in PowerShell, cmd,
and POSIX shells, and it is stripped from production builds regardless
(`import.meta.env.PROD` early-return in `DevHarness.tsx`).

## Responsive layout

Two breakpoints, per the design handoff's §Responsive: mobile (390px frame) and desktop (1280
canvas, content capped at 1160). The switch-over is **1024px**, declared once in each of the two
places that need it and kept identical:

- CSS — `public/design-system/tokens/spacing.css` defines `--gutter`, `--section-y` and `--app-max`
  and swaps all three in one `@media (min-width: 1024px)` block. Screens reference those aliases,
  never `--gutter-mobile`/`--gutter-desktop` directly, so reflow is a token change, not a per-screen
  edit.
- JS — `src/lib/useBreakpoint.ts` (`useSyncExternalStore` over `matchMedia`) feeds
  `usePersona().breakpoint`, which the 9 real-divergence screens branch on. The harness's
  Mobile/Desktop buttons set an override that wins over the media query, for previewing the other
  layout on one machine.

`AppShell` is the consumer-app chrome: a centered column capped at `--app-max`, with the four
primary destinations rendered as a bottom `TabBar` on mobile and as a row inside the `TopBar` on
desktop (the handoff specifies the destinations but not where they sit on the wide canvas).

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values — see that file for the full list and
what each is for. In short:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — the frontend's pair (Vite only exposes
  `VITE_`-prefixed vars to the browser). `SUPABASE_URL` / `SUPABASE_ANON_KEY` (unprefixed) are the
  same two values, read by Phase 1's backend test suite (`tests/`, plain Node/dotenv).
- `SUPABASE_SERVICE_ROLE_KEY` — documented for completeness; **nothing in this app actually needs
  it**. Every operation that must bypass RLS does so through a `SECURITY DEFINER` Postgres function
  (a Postgres-level privilege), not this key. It must never appear in `src/`.
- `TEST_ADMIN_EMAIL` / `TEST_USER_EMAIL` / `TEST_OWNER_EMAIL` / `TEST_ADMIN2_EMAIL` /
  `TEST_ACCOUNT_PASSWORD` — dev-only fixture accounts (see "Test accounts" below).
- Google OAuth client credentials are commented out — not configured (see
  "Auth provider status").

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server against the real Supabase project in `.env.local` — no dev harness, same as production |
| `npm run dev:harness` | Same, with the dev persona/breakpoint/all-screens rail (`vite --mode harness`) |
| `npm run build` | `tsc -b` (type-check) then `vite build` — production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b --noEmit`, strict mode |
| `npm run lint` / `lint:fix` | ESLint (typescript-eslint + react-hooks + react-refresh) |
| `npm run format` | Prettier over `src/**/*.{ts,tsx,css}` |
| `npm run test:frontend` | Vitest + RTL suite (`src/**/*.test.{ts,tsx}`) — network-free; the client is mocked at the module boundary |
| `npm run test:frontend:watch` | Same, in watch mode |
| `npm test` / `npm run test:watch` | Phase 1's **backend** Vitest suite (`tests/`, root `vitest.config.ts`) — real Supabase round trips, requires `.env.local` |
| `npx playwright test` | The full E2E suite (`e2e/`) — see "E2E and accessibility" below |
| `npx playwright show-report` | Open the HTML report from the last E2E run |

`npm test`'s root `vitest.config.ts` is scoped to `include: ['tests/**/*.test.ts']` specifically so
it cannot accidentally collect `src/**/*.test.tsx` (needs jsdom + `vitest.frontend.config.ts`) or
`e2e/**/*.spec.ts` (needs Playwright's own runner) — both crash under the wrong runner if collected
together.

## Data model & RLS — the short version

Full detail lives in `supabase/README.md` and the migration files themselves
(`supabase/migrations/`, applied in filename order); this is the load-bearing shape.

- **17 tables, RLS enabled on every one.** Reference data (`places`, `categories`, `areas`,
  `app_config`) is public-read; everything a user creates (`bookmarks`, `plans`, `ranked_entries`,
  `business_claims`, `location_history`) is owner-scoped by default.
- **`is_admin()` / `can_override_ranking()` / `can_access_location_history()` /
  `owns_verified_claim(place_id)`** — `SECURITY DEFINER` helper functions, `search_path` locked,
  used inside other tables' policies (the standard Supabase pattern for avoiding RLS recursion).
- **Owner-edit protection** is a Postgres **trigger** (`fn_protect_ranking_fields()`), not a
  table split — an owner can edit their listing's practical details (phone, hours, description)
  but never the ranking-relevant fields (locals, visitors, gap, rank), enforced server-side
  regardless of what the UI happens to expose.
- **`location_history`** has no admin SELECT policy at all — the only path is
  `fn_admin_read_location_history()`, which logs the access *before* returning data, in one
  transaction (a real, verified log-before-read guarantee, not just a comment).
- **`plans`** share-link access is a real RLS policy keyed on an `x-share-token` request header,
  not a query filter — an anonymous client sending only that header gets back exactly the one
  matching plan.
- **Every admin-gated `SECURITY DEFINER` function** (`fn_admin_read_location_history`,
  `fn_admin_override_ranking`, `fn_admin_list_accounts`, etc.) is explicitly `revoke`d from
  `public` and `anon` and only `grant`ed to `authenticated` — Supabase's default privilege grants
  silently re-open `EXECUTE` to `anon`/`authenticated` on a new function otherwise, a real bug
  class this repo's own history hit once and now avoids from the start on every new function.

## Auth provider status

- **Email/password**: fully functional — signup, login, logout, password reset, all real
  `supabase.auth` calls against the live project.
- **No second factor, by design**: signup and login both complete in one step. There is no OTP
  screen, no SMS code and no emailed confirmation code between someone and the app — creating an
  account signs you in and lands you in ranking onboarding. The phone/SMS signup path, `verifyOtp`,
  the S12 OTP screen and the SMS-provider configuration were removed outright rather than left
  disabled. (Password reset still sends an email; that is a recovery flow you ask for by name, not
  a verification step on the way in.) Signup relies on Supabase's "Confirm email" setting being
  **off** for this project — `signUp()` raises a clear error rather than stranding anyone if it is
  ever turned on.
- **Google OAuth**: same status — `signInWithGoogle()` is wired to the real
  `supabase.auth.signInWithOAuth` call but no OAuth client is configured yet.

## Data layer

- `src/lib/supabaseClient.ts` — the one `createClient()` call in the app, built from
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` only. `supabaseWithShareToken(token)` returns a
  per-request client with an `x-share-token` header, for the anonymous shared-plan read path.
- `src/data/*.ts` (`places.ts`, `rankedEntries.ts`, `plans.ts`, `businessClaims.ts`, `admin.ts`) —
  every function is a real `supabase.from(...)` / `supabase.rpc(...)` call. No mock data layer
  remains for any of them.
- `src/lib/auth.ts` — real `supabase.auth` calls.
- `src/dev/PersonaContext.tsx` — reflects a real session + `profiles` row on mount
  (`getSession()`/`onAuthStateChange`), while keeping the dev-harness quick-switch for local
  development. See its own header comment for why "Owner" here is a coarse dev-harness concept and
  real per-place ownership must use `useOwnsVerifiedClaim(placeId)` instead.
- `src/lib/guestSession.tsx` — client-side-only state with no backend seam, deliberately untouched.
- `src/lib/liveConfig.ts` — `places`/`categories`/`areas`/`app_config` are fetched once at startup
  and used to overwrite the small set of reference-data fixture arrays those 25+ synchronous call
  sites already read from, rather than converting every one of those call sites to a loading-aware
  hook. Documented in full in the file itself.
- **One still-fixture-backed exception, disclosed, not hidden**: none as of this writing —
  `RolesAccountsAuditScreen`'s admin-accounts listing (the last one) was converted to a real,
  admin-gated `fn_admin_list_accounts()` call. If a future change reintroduces a fixture-backed
  screen, disclose it here the same way.

## E2E and accessibility (`e2e/`)

Playwright, against a real dev server. Two kinds of coverage, for two different constraints:

- **Functional E2E** (`core-loop`, `claim-lifecycle`, `admin`, `shared-plan`, `failure-paths`
  `.spec.ts`) — runs against the **real live Supabase project**, real login, real RLS, real
  triggers. Covers the core ranking loop, the full business-claim lifecycle (submit → admin call →
  admin approve → owner edit → protected-field rejection), admin ranking overrides and the
  location-history access gate, a guest opening a shared plan link with no account, and named
  failure paths (network failure, invalid credentials, duplicate/invalid data, an unauthorized
  direct-URL write, an expired session, a missing resource, a real Edge Function error).
- **Accessibility + keyboard** (`accessibility.spec.ts`, `keyboard-nav.spec.ts`) — runs against
  **mocked network responses** (`e2e/mockBoot.ts`, real seed-derived data, not synthetic
  placeholders) so it works regardless of live network access: an automated axe-core scan of every
  one of the 52 screens' default state, plus a genuine keyboard-only pass (modal focus trap/escape,
  tab order, visible focus).

```
npx playwright test                        # whole suite
npx playwright test e2e/admin.spec.ts      # one file
npx playwright test accessibility.spec.ts  # just the a11y scan (no live network needed)
npx playwright show-report
```

`e2e/helpers.ts` has the test accounts the functional specs drive. See the completion reports
(below) for the real, actually-observed pass/fail result of each run in the environment it was run
in, including any environment-specific constraints hit along the way — don't assume a clean run
without checking.

## Test accounts (dev-only — rotate/delete before anything production-adjacent)

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin (superadmin) | `admin.superadmin@dev.madli.test` | `MadliDev!2026` | full grants |
| Admin (moderation, partial grant) | `admin.moderation@dev.madli.test` | `MadliDev!2026` | no `can_override_ranking` — for real permission-denial testing |
| User | `user.test@dev.madli.test` | `MadliDev!2026` | plain `role=user` |
| Owner | `owner.test@dev.madli.test` | `MadliDev!2026` | a real **verified** claim on Cafe Bahar |

## Dev harness usage

Run `npm run dev:harness` (plain `npm run dev` does not render the rail).

- **Persona**: switches `usePersona()` for local development without a real login. A real session
  (via `LoginScreen`/`AdminLoginScreen`) takes precedence and reflects the actual signed-in user's
  real `profiles` row.
- **Admin tier / grants**: only shown when persona is Admin — toggles `admin_tier` and the two
  independent boolean grants (`can_override_ranking`, `can_access_location_history`).
- **Breakpoint**: mobile (390px) / desktop (1280px) — an explicit override of the real viewport
  media query, so both layouts can be reviewed on one machine. 9 screens (S15, S17, S18, S19, S20,
  S21, S31, S42, S43) render genuinely different markup at each, not just reflowed CSS.
- **All screens tray**: every registered screen (`src/screens/registry.ts`), grouped and
  filterable.

## Where to find more

This repo was built across four phases; each phase's own completion report and checklist have the
full evidence (exact commands run, exact output, every bug found and how) behind the summaries
above — read them, don't re-derive:

| Phase | What it built | Reports |
|---|---|---|
| 1 — Backend | Schema, RLS, Postgres functions, auth, seed data, one Edge Function | `PHASE_1_COMPLETION_REPORT.md`, `PHASE_1_CHECKLIST.md` |
| 2 — Frontend UI | All 52 screens, 28 design system components, over a mock data layer | `PHASE_2_COMPLETION_REPORT.md`, `PHASE_2_CHECKLIST.md` |
| 3 — Integration | Every mock seam replaced with real Supabase calls, real auth, a committed Playwright suite | `PHASE_3_COMPLETION_REPORT.md`, `PHASE_3_CHECKLIST.md` |
| 4 — Final QA | Full audit, the last fixture-backed screen closed, accessibility scan + fixes, production readiness | `PHASE_4_QA_REPORT.md`, `PHASE_4_CHECKLIST.md`, `PRODUCTION_READINESS_SUMMARY.md` |

`supabase/README.md` has the full backend detail (project info, migrations, seed data, the complete
RLS policy inventory, Edge Function detail). `design_handoff_madli/` is the original design source
of truth (`README.md`, `CLAUDE.md`, `design-system/`, `prototype/`) — read `CLAUDE.md` first, as it
itself instructs.
