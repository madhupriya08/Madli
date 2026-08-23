# Madli — Frontend (Phase 3: real Supabase integration)

Locally-ranked food and travel app for Hyderabad. This is the Phase 3 frontend: all 52 screens
from Phase 2, now wired to the real Phase 1 Supabase backend — real auth, real reads/writes, real
RLS, real triggers, real RPCs. No mock data layer remains in `src/data/`.

Phase 1 (Supabase backend) lives in `supabase/` and `tests/`. See `PHASE_1_COMPLETION_REPORT.md`,
`PHASE_1_CHECKLIST.md` for what it built. Phase 2 (frontend UI over a mock data layer) is described
in `PHASE_2_COMPLETION_REPORT.md`, `PHASE_2_CHECKLIST.md`, `PHASE_3_HANDOFF.md` (Phase 2's handoff
into this phase). This phase's own results are `PHASE_3_COMPLETION_REPORT.md`,
`PHASE_3_CHECKLIST.md`, and `PHASE_4_HANDOFF.md` (this phase's handoff into the next one).

## Running it

```
npm install
cp .env.example .env.local   # fill in the real Supabase URL + anon key + test account password
npm run dev                  # http://localhost:5173, dev harness enabled
```

Without a real `.env.local`, the app fails fast at boot with a visible error screen ("Madli
couldn't load") rather than silently showing stale mock data — `src/lib/supabaseClient.ts` throws
if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, and `src/main.tsx` shows that error
screen if the real startup fetch (`src/lib/liveConfig.ts`) fails.

The dev server always opens onto the **dev harness** (`src/dev/DevHarness.tsx`) — a left rail with
a persona switcher (Guest/User/Owner/Admin, plus admin tier and grants), a breakpoint switcher
(mobile 390 / desktop 1280), and an "All screens" tray listing all 52 screens by group. The
Guest/User/Owner/Admin quick-switch is a dev-only convenience that still bypasses real login
(`src/dev/PersonaContext.tsx` documents this explicitly) — a real `LoginScreen`/`AdminLoginScreen`
sign-in creates a real Supabase session first and converges on the same state shape. The harness is
stripped from production builds (`import.meta.env.PROD` early-return in `DevHarness.tsx`).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with the dev harness, against the real Supabase project in `.env.local` |
| `npm run build` | `tsc -b` (type-check) then `vite build` — production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b --noEmit`, strict mode |
| `npm run lint` / `lint:fix` | ESLint (typescript-eslint + react-hooks + react-refresh) |
| `npm run format` | Prettier over `src/**/*.{ts,tsx,css}` |
| `npm run test:frontend` | Vitest + RTL suite (`src/**/*.test.{ts,tsx}`) — network-free; the client is mocked at the module boundary, not the fixture layer |
| `npm run test:frontend:watch` | Same, in watch mode |
| `npm test` / `npm run test:watch` | Phase 1's **backend** Vitest suite (`tests/`, `vitest.config.ts`) — real Supabase round trips, requires `.env.local` |
| `npx playwright test` | The Phase 3 E2E suite (`e2e/`) — a real browser against a real running dev server and the real live Supabase project. See `PHASE_3_COMPLETION_REPORT.md` for the real result of running it, including any environment constraints hit. |
| `npx playwright show-report` | Open the HTML report from the last E2E run |

`npm test`'s root `vitest.config.ts` is scoped to `include: ['tests/**/*.test.ts']` specifically so
it cannot accidentally collect `src/**/*.test.tsx` (needs jsdom + `vitest.frontend.config.ts`) or
`e2e/**/*.spec.ts` (needs Playwright's own runner) — both crash under the wrong runner if collected
together. This was a real, previously-unnoticed bug: nobody had run `npm test` end to end until
Phase 3, because Phase 1 verified everything via direct SQL instead (this sandbox blocks outbound
HTTPS to `*.supabase.co`, so even Phase 3 could only confirm the fix, not get a fully green
`npm test` run here — see `PHASE_3_COMPLETION_REPORT.md` §3).

## Auth provider status

- **Email/password**: fully functional — signup, login, logout, password reset, all real
  `supabase.auth` calls against the live project.
- **Phone OTP**: code-complete (`src/lib/auth.ts`'s `signUp`/`verifyOtp` call the real
  `supabase.auth` phone methods) but **not functional** — no SMS provider is configured on this
  Supabase project (open since Phase 1, `.env.example` §"SMS provider"). Calling it returns the
  project's real "provider not enabled" error; it is not faked as working.
- **Google OAuth**: same status — `signInWithGoogle()` is wired to the real
  `supabase.auth.signInWithOAuth` call but no OAuth client is configured yet.

## Data layer — now real Supabase calls

- `src/lib/supabaseClient.ts` — the one `createClient()` call in the app, built from
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` only. `supabaseWithShareToken(token)` returns a
  per-request client with an `x-share-token` header, for the anonymous shared-plan read path.
- `src/data/*.ts` (`places.ts`, `rankedEntries.ts`, `plans.ts`, `businessClaims.ts`, `admin.ts`) —
  every function is a real `supabase.from(...)` / `supabase.rpc(...)` call. No `TODO(phase-3)`
  markers remain anywhere in `src/` — grepping for that string returns nothing.
- `src/lib/auth.ts` — real `supabase.auth` calls, replacing Phase 2's `src/lib/mockAuth.ts` (deleted).
- `src/dev/PersonaContext.tsx` — reflects a real session + `profiles` row on mount
  (`getSession()`/`onAuthStateChange`), while keeping the dev-harness quick-switch for local
  development. See its own header comment for why "Owner" here is a coarse dev-harness concept and
  real per-place ownership must use `useOwnsVerifiedClaim(placeId)` instead.
- `src/lib/guestSession.tsx` — untouched, as instructed: it is client-side-only state with no
  backend seam.
- `src/lib/liveConfig.ts` — a deliberate architectural deviation from a strict per-screen-hook
  conversion: `places`/`categories`/`areas`/`app_config` are fetched once at startup and used to
  overwrite the Phase 2 fixture arrays in place, rather than rewriting the 25+ screens that consume
  them synchronously. Documented in full in the file itself and in
  `PHASE_3_COMPLETION_REPORT.md` §2.

## E2E suite (`e2e/`)

Playwright, run against a real dev server and the real live Supabase project — the opposite of
Phase 2's frontend suite, which deliberately excluded E2E. Covers the core ranking loop, the full
business-claim lifecycle (submit → admin call → admin approve → owner edit → protected-field
rejection), admin ranking overrides and the location-history access gate, a guest opening a shared
plan link with no account, and a dedicated failure-paths spec (network failure at boot, invalid
credentials, duplicate/invalid data, an unauthorized direct-URL write, an expired session, missing
resources, and a real Edge Function error). See `e2e/helpers.ts` for the test accounts it drives.

```
npx playwright test              # whole suite, headless chromium
npx playwright test e2e/admin.spec.ts   # one file
npx playwright show-report
```

## Dev harness usage

- **Persona**: switches `usePersona()` (`src/dev/PersonaContext.tsx`) for local development without
  a real login. A real session (via `LoginScreen`/`AdminLoginScreen`) takes precedence and reflects
  the actual signed-in user's real `profiles` row.
- **Admin tier / grants**: only shown when persona is Admin — toggles `admin_tier` and the two
  independent boolean grants (`can_override_ranking`, `can_access_location_history`). For real
  permission testing against an account that does *not* hold every grant, see the second admin test
  account documented in `PHASE_4_HANDOFF.md`.
- **Breakpoint**: mobile (390px) / desktop (1280px). The 9 screens with real layout divergence
  (S15, S17, S18, S19, S20, S21, S31, S42, S43) render genuinely different markup at each, not just
  reflowed CSS.
- **All screens tray**: every registered screen (`src/screens/registry.ts`), grouped and
  filterable.
