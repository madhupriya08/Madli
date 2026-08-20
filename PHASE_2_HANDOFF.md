# Madli — Phase 2 Handoff (Frontend UI)

Read this before starting Phase 2. It gives you everything Phase 1 (Supabase
backend) established, so you don't need to re-derive it. Full detail and
rationale is in `PHASE_1_COMPLETION_REPORT.md` and `supabase/README.md`; this
is the condensed operating brief.

## What Phase 1 built

A complete Supabase backend for **Madli** (locally-ranked food/travel app,
Hyderabad) already applied to a real, live project:

- Project: **Madli**, `wybpprdunzrzyzsbiarv`, org `madhupriya's Org`,
  `us-east-2`, Postgres 17.
- 17 tables, full RLS, 12 migrations (`supabase/migrations/`), all applied.
- Seed data applied: 8 eat places, 8 explore places, 8 neighbourhoods (real,
  from the design handoff prototype) + 1 fixture place for the below-threshold
  path. See `supabase/seed.sql` and `supabase/README.md` "Known characteristic".
- 3 dev test accounts (admin/user/owner) — credentials in `supabase/README.md`.
- One Edge Function, `share-preview`, deployed and active.

**Design source of truth**: `design_handoff_madli/` at the repo root
(`README.md` — full 52-screen spec; `CLAUDE.md` — build order and ground
rules; `design-system/` — tokens, 28 components, guidelines; `prototype/` —
the interactive reference). Read `CLAUDE.md` first, as it instructs.

## Frontend stack — already decided, don't re-litigate

`design_handoff_madli/CLAUDE.md` is explicit: **React + TypeScript + Vite**,
plain CSS Modules or vanilla CSS consuming the token files verbatim — no
Tailwind, no component library, no CSS-in-JS. This applies because the repo
was greenfield when Phase 1 started (no existing frontend scaffold). This
also resolved the backend prompt's flagged Next.js-vs-Vite tension in favor
of Vite, which is *why* Phase 1 built a Share Preview Edge Function (a plain
SPA can't render per-request Open Graph tags itself — see the function's
header comment in `supabase/functions/share-preview/index.ts`).

Suggested build order, per `CLAUDE.md`: token layer + `Icon`/`Logo` → core/
forms/feedback/navigation components → the 5 trust components (`PickCard`,
`RankBadge`, `RankGap`, `SampleSize`, `ReasonNote` — get these exactly right,
they carry the product's whole promise) → discovery core loop screens →
auth/onboarding → ranking loop → personal state → marketing → owner → admin.

## Data access pattern

No custom API server. Direct Supabase client (`@supabase/supabase-js`) calls
governed by RLS, plus `.rpc()` calls for the handful of operations that must
be atomic or must enforce server-side ordering:

- **Logging a ranked visit** (S25-S27): call `fn_log_ranked_visit(p_place_id, p_tier, p_compare_place_id_1?, p_preferred_new_over_1?, p_compare_place_id_2?, p_preferred_new_over_2?)`.
  Omit the comparison args entirely for the first-in-category path (the
  function detects it). It returns `(entry_id, landed_position, total_in_category)`
  — `landed_position` is what S27 shows directly. Which existing entry to
  offer as the comparison target (current #1? a median?) is a frontend/UX
  decision Phase 1 deliberately left open — the function just accepts
  whatever you pass.
- **Reading the user's ranked list** (S31): query `ranked_entries_visible`
  (a view), not `ranked_entries` directly — it already filters out
  `tier='disliked'` per the "disliked places stay logged but drop out of the
  visible list" rule. Query the raw table only if you specifically need
  disliked entries too.
- **Reading picks** (S17/S18): query `published_picks` (a view over
  `places`), not `places` directly — it already applies the ~50-local-ratings
  threshold from `app_config.ranking_threshold_locals`. Apply your own
  `LIMIT 3` at the query layer (§ this is a query convention, not a DB
  constraint — "three picks, never more" is enforced by you, not the schema).
- **Sharing a plan** (S22, S24): call `fn_create_plan_share_token(p_plan_id)`
  to mint a token, then share a URL containing it. To *read* a shared plan
  anonymously, you must send the token as an `x-share-token` **request
  header** (not just a query filter) — the RLS policy matches against that
  header. In supabase-js: create a client (or a per-request override) with
  `global: { headers: { 'x-share-token': token } }`.
- **Claiming a business** (S37): insert into `business_claims` as the user.
  `status` starts `pending` (render as neutral, never a warning — the
  handoff is explicit about this). Only admin can change `status`/
  `called_at`/`called_by`/resolution fields.
- **Owner editing a listing** (S39): update `places`/`place_eat_details`/
  `place_explore_details` directly as the Owner — RLS allows it for a place
  with your verified claim, but a trigger will reject any attempt to touch
  ranking-relevant columns (`category_id`, `reason`, `tags`, `gap_tone`,
  `gap_points`, `locals`, `visitors`, `outside_fame_rank`, `is_active`,
  `slug`, `name`, `type`, `neighborhood`, `area_id`, `price_level` on
  `places`; `gem` on `place_eat_details`) even though RLS itself lets the
  UPDATE statement through. Owner-editable: `history`, `phone`, `address`,
  `hours` on `places`; `wait_time`, `serving_hours`, `dishes` on
  `place_eat_details`; `crowd_level`, `best` on `place_explore_details`.
  Build the S39 UI to only expose those fields — the backend rejects the
  rest regardless.
- **Admin ranking override** (S46): call
  `fn_admin_override_ranking(p_place_id, p_gap_tone, p_gap_points, p_reason)`
  — reason is mandatory, writes a permanent `admin_audit_log` row.
- **Admin location-history access** (S51): call
  `fn_admin_read_location_history(p_target_user_id, p_reason)` — never query
  `location_history` directly as admin, it will return nothing (no admin
  SELECT policy exists on purpose). Reason is mandatory; the access-log row
  is written before data returns, atomically.
- **Account deletion** (S36): call `fn_delete_own_account(p_confirm: true)`.
  Typed confirmation is your job in the UI; the backend guard is
  `p_confirm` must be `true`.
- **Gem candidates** (S47, admin-only): call `fn_admin_list_gem_candidates()`,
  not a direct table/view query — `gem_candidates` has no client SELECT grant.

## Roles — how to think about them in the frontend

- **Guest**: no session. Full read access to public tables (`places`, `areas`,
  `categories`, `app_config`, `published_picks`). No backend-persisted state
  for search counters or session reject lists — that's genuinely client-side
  (§8 open question #1, resolved: build it in frontend state/sessionStorage).
- **User**: `profiles.role = 'user'`. Standard authenticated session.
- **Owner**: **not a role value**. Check `owns_verified_claim(place_id)` (an
  RPC-callable function) or simply attempt the query — RLS already scopes
  Owner-mode UI affordances (S39's edit button, etc.) should be shown based
  on whether the current user has a `business_claims` row with
  `status='verified'` for that place, not based on any `role` field.
- **Admin**: `profiles.role = 'admin'`. Additionally has `admin_tier`
  (`superadmin`/`catalogue`/`moderation` — real, evidenced tiers, see
  completion report §2 #4) and two independent boolean grants,
  `can_override_ranking` and `can_access_location_history`. **The
  tier→default-grant mapping was not specified anywhere in the material
  available to Phase 1** — build the S50 permissions UI to show/manage the
  two grants explicitly per admin account, don't assume a tier implies them.
  Admin login must be a genuinely separate screen/route from consumer login
  (S41) — never let a valid non-admin session satisfy an admin check. On a
  failed or access-denied admin login attempt, call
  `fn_log_admin_login_attempt(identifier, 'invalid_credentials'|'access_denied', user_id?)`.

## Auth setup you'll need to do in Phase 2/3

- **Email/password**: already works, nothing to configure.
- **Phone OTP**: not configured. No SMS provider is set up for this project.
  Pick one (Twilio, MessageBird, Vonage...), enable it in Supabase Dashboard
  → Authentication → Providers → Phone, and only then build S12.
- **Google OAuth**: not configured. No OAuth client exists yet. Create one in
  Google Cloud Console, enable the provider in Supabase Dashboard →
  Authentication → Providers → Google, then wire the button on S11/S13.
- **Password reset** (S14): works as-is via `supabase.auth.resetPasswordForEmail()`.

## Testing

`tests/` (Vitest + `@supabase/supabase-js`) exercises the whole backend for
real — RLS, functions, auth. It's written and internally consistent but has
never actually been run by a test runner end-to-end (Phase 1's sandbox had no
network path to `*.supabase.co` — see the completion report §0 for why; every
assertion was instead independently verified via direct SQL). **Run it once,
first thing in Phase 2, in an environment with normal network access**:
```
npm install
cp .env.example .env.local   # fill in the anon key + test password from supabase/README.md
npm test
```
It should pass cleanly given the SQL-level verification already done; if
anything is red, that's real signal — investigate before building UI against it.

## Config flags (all in `app_config`, one source of truth)

`guest_paywall_at` (default: 4th search), `second_comparison` (default:
skippable), `home_mode`, `intake_length`, `rank_honesty`, `bridge_prompt` —
read these from the table rather than hardcoding the defaults; they're
designed to be flippable for A/B testing per the design handoff's own "Open
questions" section.

## Genuinely unresolved — don't guess, ask or flag again

1. What feeds `places.outside_fame_rank` (manual admin entry vs. external data).
2. The actual per-contributor ranking-weight formula/curve.
3. The default `admin_tier` → (`can_override_ranking`, `can_access_location_history`)
   mapping (built as independent per-account grants instead).
4. Whether the report-type taxonomy (`duplicate_listing`, `timings_wrong`,
   `permanently_closed`, `inappropriate_content`, `wrong_contact_info`,
   `other`) is complete — sourced from the prototype's mock data, not
   independently confirmed against the fuller README prose.
5. Which SMS provider to use for phone OTP.
6. The GoTrue Auth Hook for tamper-proof admin-login-failure logging is not
   wired (client-invoked logging exists instead) — worth doing properly once
   you have Dashboard/project-config access this session's tools didn't have.
