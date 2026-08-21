# Madli — Phase 3 Handoff (Frontend + Supabase Integration)

Read this before starting Phase 3. It gives you everything Phase 1 (backend) and Phase 2 (frontend
UI, mock data) established, so you don't need to re-derive it or re-read either phase's full
conversation. Full detail lives in `PHASE_1_COMPLETION_REPORT.md`, `PHASE_1_CHECKLIST.md`,
`PHASE_2_HANDOFF.md`, `PHASE_2_COMPLETION_REPORT.md`, `PHASE_2_CHECKLIST.md`, and `supabase/README.md`
— this is the condensed operating brief.

## 0. Do this first, before writing any Phase 3 code

**Phase 1's own Vitest suite (`tests/`, run via `npm test` at the repo root) has still never been
run end-to-end by an actual test runner.** Phase 1 built it, then verified every assertion
independently via direct SQL because this sandbox's network policy blocked outbound HTTPS to
`*.supabase.co`. Phase 2 didn't touch it either (out of scope) and had the same network
restriction, so this remains true today. Run it first, in an environment with normal network
access:
```
npm install
cp .env.example .env.local   # fill in the real anon key + test account password — see §3 below
npm test
```
It should pass cleanly given the SQL-level verification already done in Phase 1. If anything is
red, that's real signal — investigate before wiring any UI to that part of the schema.

## 1. What exists today

- **Live Supabase project**: `wybpprdunzrzyzsbiarv`, org `madhupriya's Org`, `us-east-2`, Postgres
  17. 17 tables, full RLS, 12 migrations applied (`supabase/migrations/`), real seed data
  (`supabase/seed.sql`), one deployed Edge Function (`share-preview`). Credentials/URL: see
  `.env.example` for the shape and `supabase/README.md` for where to get the real values (Supabase
  Dashboard → this project → Settings → API). Nothing in this repo is a real secret — `.env.local`
  is gitignored and was never committed.
- **Complete frontend UI** (this repo's `src/`, built in Phase 2): all 52 screens, all 28 design
  system components, a typed mock data layer, a dev persona/breakpoint harness, and a Vitest+RTL
  suite (55 tests, all passing as of the end of Phase 2). No real Supabase call exists anywhere in
  `src/` yet — that is entirely Phase 3's job.
- **Design source of truth**: `design_handoff_madli/` — read `CLAUDE.md` first, as it itself
  instructs.

## 2. The exact seams to replace — grep for `TODO(phase-3)`

Every seam below is a single, clearly-marked comment in the code. Replace the function body next to
each comment with the real call; **do not change the function's name, parameters, or return
shape** — every screen and hook already calls these by that contract, so a matching swap requires
no changes above the data layer.

| File : line | Mock function | Becomes |
|---|---|---|
| `src/fixtures/places.ts:6` | the static `places` array | a TanStack Query hook reading `supabase.from('places').select('*, place_eat_details(*), place_explore_details(*)')` |
| `src/fixtures/appConfig.ts:6` | the static `appConfig` object | a TanStack Query hook reading `supabase.from('app_config').select()` |
| `src/data/places.ts:6` | `getPublishedPicks` | `supabase.from('published_picks').select()` (apply `.eq()`/`.limit(3)` filters at the call site, same as now) |
| `src/data/rankedEntries.ts:8` | `logRankedVisit` | `supabase.rpc('fn_log_ranked_visit', { p_place_id, p_tier, p_compare_place_id_1?, p_preferred_new_over_1?, p_compare_place_id_2?, p_preferred_new_over_2? })` — and `getVisibleRankedEntries`/`getAllRankedEntries` become `supabase.from('ranked_entries_visible' \| 'ranked_entries').select()` |
| `src/data/plans.ts:6` | `createPlanShareToken` / `getSharedPlan` | `supabase.rpc('fn_create_plan_share_token', {...})`, then a `supabase.from('plans').select()` sent with an `x-share-token` **request header** (a per-request client override, e.g. `global: { headers: { 'x-share-token': token } }`) — **not** a `.eq()` query filter; the real RLS policy reads the header |
| `src/data/businessClaims.ts:5` | `submitBusinessClaim` / `getBusinessClaims` | `supabase.from('business_claims')` insert/select |
| `src/data/admin.ts:8` | `adminOverrideRanking` | `supabase.rpc('fn_admin_override_ranking', { p_place_id, p_gap_tone, p_gap_points, p_reason })` |
| `src/data/admin.ts:28` | `adminAdjustContributorWeight` | `supabase.rpc('fn_admin_adjust_contributor_weight', { p_target_user_id, p_new_weight, p_reason })` |
| `src/data/admin.ts:49` | `listGemCandidates` | `supabase.rpc('fn_admin_list_gem_candidates')` — `gem_candidates` has no client SELECT grant, must go through the function |
| `src/data/admin.ts:55` | `adminReadLocationHistory` | `supabase.rpc('fn_admin_read_location_history', { p_target_user_id, p_reason })` — never query `location_history` directly as admin, it returns nothing by design |
| `src/data/admin.ts:82` | `logAdminLoginAttempt` | `supabase.rpc('fn_log_admin_login_attempt', { p_identifier, p_event_type, p_user_id })` |
| `src/data/admin.ts:99` | `deleteOwnAccount` | `supabase.rpc('fn_delete_own_account', { p_confirm: true })` |

Not a `TODO(phase-3)` comment, but also mock-only and needs real wiring: **all of `src/lib/mockAuth.ts`**
(`mockLogin`/`mockSignUp`/`mockVerifyOtp`/`mockRequestPasswordReset`/`mockResetPassword`) — replace
with the matching `supabase.auth.*` calls, and **`src/dev/PersonaContext.tsx`** — replace its
`useState`-based persona with a real `supabase.auth` session + a `profiles` row read (`role`,
`admin_tier`, `can_override_ranking`, `can_access_location_history`), keeping the same
`usePersona()` hook shape so no screen needs to change. **`src/lib/guestSession.tsx`** is the one
exception with *no* seam and *no* comment — Phase 1 confirmed this is genuinely client-side only
(no backend table), so it stays exactly as-is in production; don't "integrate" it.

## 3. Test accounts (dev-only, rotate/delete before anything production-adjacent)

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin (superadmin) | `admin.superadmin@dev.madli.test` | `MadliDev!2026` | `role=admin`, `admin_tier=superadmin`, both grants (`can_override_ranking`, `can_access_location_history`) |
| User | `user.test@dev.madli.test` | `MadliDev!2026` | plain `role=user` |
| Owner | `owner.test@dev.madli.test` | `MadliDev!2026` | `role=user` + a **verified** claim on Cafe Bahar (`00000000-0000-0000-0000-0000000000f5`) |

These ids match the ones Phase 2's mock layer already uses (`MOCK_USER_ID`/`MOCK_OWNER_ID`/
`MOCK_ADMIN_ID` in `src/dev/PersonaContext.tsx` = `10000000-0000-0000-0000-000000000002/3/1`), so
fixture-keyed UI decisions made in Phase 2 (e.g., PlaceDetailScreen's owner resolution) should
mostly just start working once real auth returns the same ids.

## 4. Still-open items — resolve or keep flagging, don't silently assume

Carried unchanged from Phase 1 (`PHASE_2_HANDOFF.md`'s own list — none were touched by any Phase 2
UI decision):
1. What feeds `places.outside_fame_rank` (manual admin entry vs. external data).
2. The actual per-contributor ranking-weight formula/curve.
3. The default `admin_tier` → (`can_override_ranking`, `can_access_location_history`) mapping (built
   as independent per-account grants instead — Phase 2's S50 UI manages the two grants explicitly,
   still doesn't assume a tier implies them).
4. Whether the report-type taxonomy is complete (sourced from the prototype's mock data, not
   independently confirmed against the fuller README prose).
5. Which SMS provider will back phone OTP (not configured in Supabase Auth at all yet).
6. Whether admin-login-failure logging should move to a GoTrue Auth Hook (client-invoked logging
   exists today instead).

New from Phase 2, per its completion report §9:
7. No exhaustive per-state, per-screen click-through was done — only the default state of all 52
   screens plus the ranking loop's full path were verified in a real browser. Every conditional
   branch for secondary states (error variants, admin-tier permission combinations, etc.) exists in
   the code and was reviewed, but not individually clicked. Worth spot-checking as you wire each
   screen to real data, since a real backend response can hit a branch the mock data never did.
8. No automated accessibility scan (contrast/axe-core) or full keyboard-only pass was run across all
   52 screens — a real gap, not assumed fine. `<main>` landmark coverage was fixed as part of Phase
   2 (see its completion report §6), but that's one specific finding, not a full audit.
9. `pickComparisonTargets`'s choice of "current #1, plus the median once there are 3+ entries" (in
   `src/data/rankedEntries.ts`) is a real UX decision against an explicitly-open Phase 1 question,
   not a confirmed-correct one — worth a product read before treating it as final.

## 5. Things Phase 3 should *not* re-litigate

- The stack (Vite + React + TS, no Tailwind/component library/CSS-in-JS) — settled in
  `design_handoff_madli/CLAUDE.md`, carried through both prior phases.
- The data access pattern (direct `supabase-js` client calls governed by RLS, `.rpc()` for the
  atomic/ordered operations listed in §2 above) — this is exactly what Phase 2's mock layer was
  built to match, function-for-function.
- Any UI decision phase 2 made and documented (`PHASE_2_COMPLETION_REPORT.md` §2) where the design
  handoff was ambiguous — re-open only if wiring real data reveals the decision was actually wrong,
  not on aesthetic preference.
