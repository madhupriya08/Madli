# Madli — Supabase backend

Schema, RLS, Postgres functions, auth wiring, seed data, and one Edge Function for **Madli**, a
locally-ranked food/travel app for Hyderabad. Originally Phase 1's deliverable; the frontend
(`src/`) is now fully integrated against this backend for real — see the root `README.md` for the
current, whole-repo picture and where each phase's own report lives.

## Project

- Supabase project: **Madli** (`wybpprdunzrzyzsbiarv`, org `madhupriya's Org`, `us-east-2`, Postgres 17).
- This is a real, already-provisioned dev project — not a placeholder. All migrations,
  seed data, and test accounts in this repo have been applied directly to it.
- Design source of truth: `design_handoff_madli/` at the repo root (`README.md`,
  `CLAUDE.md`, `design-system/`, `prototype/`).

## Prerequisites

- Node.js 18+ (developed against Node 22).
- The Supabase CLI (`npm install -g supabase`) if you want to run migrations
  locally rather than through the hosted project directly.
- **Docker is required for a fully local Supabase stack** (`supabase start`).
  It was not usable in the Phase 1 development sandbox (outbound registry
  pulls were blocked by that sandbox's network policy) — untested locally, but
  should work in a normal environment with Docker access. All Phase 1 work was
  instead verified directly against the hosted dev project.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. See that file for
the full list and what each variable is for. Key points:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — public, client-safe.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, and **not actually required by
  anything in this Phase 1 backend**. Every operation that needs to bypass RLS
  does so through a `SECURITY DEFINER` Postgres function (a Postgres-level
  privilege, independent of Supabase's API-level service-role key), not
  through this key. It's documented for completeness/Phase 2+ needs (e.g. an
  admin backoffice script), not because Phase 1 uses it.
- Google OAuth client credentials are **not
  configured** for this project — see "Auth" below and the completion report's
  open items.

## Migrations

All schema is in `supabase/migrations/`, applied in filename order. Each file
has a header comment explaining the design decision it encodes, not just what
it does — read those before changing anything, especially `20260820100300_places.sql`
(§5.5 owner-edit protection) and `20260820101000_rls_policies.sql`.

To apply against a **local** stack (once Docker is available):
```
supabase start
supabase db reset   # applies all migrations + supabase/seed.sql
```

To apply against the **hosted dev project** (what Phase 1 actually used):
```
supabase link --project-ref wybpprdunzrzyzsbiarv
supabase db push
```
(Phase 1 applied each migration via the Supabase MCP `apply_migration` tool
instead of the CLI, since that was the only reachable path to the database in
that sandbox — see the completion report's "Environment constraints" section.
The migration files here are the source of truth and are what `db push` would
apply; the project's live schema already matches them.)

## Seed data

`supabase/seed.sql` — lifted verbatim from `design_handoff_madli/prototype/Madli Prototype.dc.html`
(the `FOOD`/`EXPLORE`/`AREAS` arrays): 8 eat places, 8 explore places, 8
neighbourhoods, plus one extra fixture place (`Mehfil`, Alwal, locals=9) added
specifically to exercise the below-ranking-threshold path — see the seed
file's own comments for exactly which fields are real handoff data vs.
synthesized fixture placeholders.

Run it via `supabase db reset` locally, or it has already been applied to the
hosted dev project.

**Known characteristic of this seed set**: the Explore door has no places
above the ~50-local-ratings pick threshold (the source material's `EXPLORE`
array simply doesn't carry `locals`/`visitors` numbers for 7 of its 8 rows;
only Charminar has a real number, 47, still below threshold). The Eat door has
8 above-threshold picks. This wasn't padded with invented numbers — see the
seed file's comments. Phase 2/3 content ops should enter real Explore ratings
via the admin catalogue before demoing that door's "picks" state.

## Test accounts

Dev-only, created directly in `auth.users` for this project (never real
credentials — rotate/delete before anything production-adjacent):

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin (superadmin) | `admin.superadmin@dev.madli.test` | `MadliDev!2026` | `role=admin`, `admin_tier=superadmin`, both dangerous-capability grants (`can_override_ranking`, `can_access_location_history`) |
| Admin (moderation, partial grant) | `admin.moderation@dev.madli.test` | `MadliDev!2026` | `role=admin`, `admin_tier=moderation`, **not** `can_override_ranking` (real permission-denial testing — see `e2e/admin.spec.ts`) — created in Phase 3, see `PHASE_4_HANDOFF.md` for the one-query check to reconfirm its exact grants against the live project |
| User | `user.test@dev.madli.test` | `MadliDev!2026` | plain `role=user` |
| Owner | `owner.test@dev.madli.test` | `MadliDev!2026` | `role=user` + a **verified** `business_claims` row on Cafe Bahar (`00000000-0000-0000-0000-0000000000f5`) — mirrors the prototype's own "Imran A. · Owner · Verified" example |

## Auth (§6)

- **Email/password**: works, enabled by default on a fresh Supabase project.
  Verified in Phase 1 (see completion report) via the underlying `pgcrypto`
  password hash mechanism directly, since this sandbox's network policy
  blocked outbound HTTPS to `*.supabase.co` (so the real GoTrue HTTP endpoint
  itself couldn't be exercised from here) — a genuine environment constraint,
  not a design gap. Any environment with normal network access should be able
  to run `tests/auth.test.ts` against this project directly and get a real
  HTTP-level result.
- **Phone OTP / SMS auth**: **removed from the product**, not merely
  unconfigured. Madli signs people in with email and password in one step, so
  the phone signup path, the OTP verification step and the `[auth.sms]` /
  `[auth.sms.twilio]` / `[auth.mfa.phone]` sections of `config.toml` were all
  deleted. Nothing is waiting on an SMS provider decision any more.
- **Google OAuth**: **not configured**. No OAuth client exists for this
  project yet. Same story — Dashboard configuration + real Google Cloud
  credentials, not a schema change.
- **Password reset**: standard Supabase Auth flow, request-side verified.
- **Admin login is a separate surface** (S41): `profiles.role='admin'` is the
  real gate; `admin_login_audit_log` + `fn_log_admin_login_attempt` capture
  the two required distinct outcomes (`invalid_credentials`, `access_denied`).
  **Known limitation**: the most robust way to guarantee *every* invalid-password
  attempt is logged is a Supabase Auth "Password Verification Hook" (a
  Postgres function GoTrue calls on every attempt) configured at the project
  level — that project-level Auth configuration is outside what this session's
  tools could reach. What's built is the callable logging primitive; Phase 2's
  admin login screen must call `fn_log_admin_login_attempt` on failure. Wiring
  the real Auth Hook (if you want tamper-proof coverage, not just
  client-invoked coverage) is a recommended follow-up.

## RLS model summary

Every table has RLS enabled. The short version, per table, is in each
migration file's header comment; the full policy set is in
`20260820101000_rls_policies.sql`. The load-bearing patterns to know before
touching anything:

- **`is_admin()` / `can_override_ranking()` / `can_access_location_history()` /
  `owns_verified_claim(place_id)`** — `SECURITY DEFINER` helper functions used
  inside other tables' policies (standard Supabase pattern, avoids RLS
  recursion). All are `SECURITY DEFINER` with a locked `search_path`.
- **Owner-edit protection (§5.5)** is a **trigger**, not a table split — see
  `fn_protect_ranking_fields()`. Reason: `gem` is an eat-only field that must
  still be admin-only, so column-level protection had to be independent of
  which table a field lives in.
- **`location_history`** has no admin SELECT policy at all — the only path is
  `fn_admin_read_location_history()`, `SECURITY DEFINER`, which logs to
  `location_history_access_log` *before* returning data, in one transaction.
- **`plans`** share-link access is a real RLS policy (not a wrapper function):
  `share_token = (current_setting('request.headers', true)::json ->> 'x-share-token')`.
  Phase 2/3 clients must send the token as an `x-share-token` header, not just
  a query filter, when fetching a shared plan anonymously.
- **`admin_audit_log` / `location_history_access_log` / `admin_login_audit_log`**
  have no client-facing INSERT/UPDATE/DELETE policy at all — writes only
  happen inside `SECURITY DEFINER` functions. They are genuinely append-only.

## Testing

`tests/` is a Vitest suite (`npm install && npm test`) written to exercise
real HTTP requests against the hosted project via `@supabase/supabase-js`
(real sign-ins, real anon/authenticated/admin sessions, real RLS responses) —
per the backend prompt's explicit instruction to verify against real
requests, not by inspecting policy SQL.

**It could not be executed end-to-end in the Phase 1 development sandbox**:
that sandbox's egress policy blocks essentially all outbound HTTPS other than
a small allowlist (npm, PyPI, GitHub, Anthropic — confirmed even `google.com`
returned a 403 at the proxy), so `@supabase/supabase-js` could never reach
`*.supabase.co`. This is a sandbox-specific network policy, not a code or
design issue, and Phase 1 did not route around it.

What actually happened instead: every assertion in this suite has an
equivalent verification performed directly via SQL against the live hosted
database, using `SET LOCAL ROLE anon|authenticated` + `SET LOCAL request.jwt.claims`
(and `request.headers` for the plans share-token policy) to simulate each
persona exactly the way PostgREST does, run inside a transaction that ends in
`ROLLBACK` so the real seed data is untouched. This is a standard, legitimate
RLS-testing technique (the same one pgTAP uses) — real policies, real
triggers, real functions, against the real live database, not a mock. Full
results are in the Phase 1 completion report. Two real bugs were found and
fixed this way: a test-data category mismatch in one ranking-function check,
and (more importantly) a wrong assumption across several Vitest assertions
that an RLS-`USING`-clause rejection on `UPDATE`/`DELETE` throws an error —
it doesn't; PostgREST reports success with zero affected rows. Those
assertions were rewritten to check the actually-affected rows via `.select()`
instead of expecting an `error`.

**Run it yourself** once you have network access to `*.supabase.co`:
```
npm install
cp .env.example .env.local   # fill in the real anon key + test account password
npm test
```

## Edge Functions

One function, `supabase/functions/share-preview/`: renders Open Graph/Twitter
meta tags for a shared Place (`?type=place&slug=...`) or Plan
(`?type=plan&token=...`), unauthenticated by design (shared links open fully).
See the file's header comment for why this is a genuine Edge Function and not
redundant CRUD — short version: the design handoff resolves Phase 2 to a
plain Vite SPA (no server-side rendering), which can't generate per-request
OG tags on its own, so link-preview unfurling (S22) needs something server-side.

Deployed to the hosted project (`ACTIVE`, `verify_jwt=false`). **Not yet
invoked/tested over HTTP in this session** — same network constraint as
above; the Supabase MCP tooling can deploy but has no "invoke" tool, and
direct `curl` from this sandbox is blocked. Test it once you have network
access: `curl "https://wybpprdunzrzyzsbiarv.supabase.co/functions/v1/share-preview?type=place&slug=restaurants/hotel-shadab"`.

Set the `APP_URL` function secret once Phase 2/3 has a real deployed frontend
URL (falls back to a placeholder otherwise).

## Open items carried into Phase 2 (see `PHASE_2_HANDOFF.md` for full detail)

The six items below are genuinely unresolved in the material available to
this phase — not silently guessed at. Full detail, and everything that *was*
resolved (several were, using real evidence from the prototype file), is in
`PHASE_1_COMPLETION_REPORT.md`.

1. Guest session state — resolved: client-side only, no backend table.
2. "Outside fame" score data source — **open**: formula is confirmed
   (`gem_score = outside_fame_rank - local_rank`), but what feeds
   `outside_fame_rank` (manual admin entry vs. an external source) isn't specified.
3. Ranking weight curve — **open**: storage exists (`profiles.ranking_weight`),
   the actual formula/thresholds aren't specified anywhere available.
4. Admin permission granularity — resolved: multiple real tiers exist
   (Superadmin/Catalogue/Moderation, from the prototype's own admin mock data);
   the exact tier→dangerous-capability default mapping is **open**.
5. Report taxonomy — resolved using the prototype's own mock report queue
   (5 concrete types); not independently cross-checked against README's S49 prose.
6. SMS provider — **closed**: SMS/phone auth was removed from the product;
   signup and login are email + password in one step.
