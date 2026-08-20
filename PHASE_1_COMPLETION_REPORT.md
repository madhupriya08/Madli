# Madli — Phase 1 Completion Report (Supabase Backend)

Date: 2026-08-20
Scope: Supabase backend only, per the Phase 1 prompt. No frontend UI was built.

---

## 0. Environment reality check (read this first)

Two facts shaped how this phase was executed and verified, and both are
sandbox-specific, not design or code limitations:

1. **A Supabase project already existed.** Org `madhupriya's Org`, project
   **Madli** (`wybpprdunzrzyzsbiarv`, `us-east-2`, Postgres 17), created at
   session start, empty. This became the "real dev instance" every migration
   was applied to and every test was run against — not a local stand-in.
2. **This sandbox's outbound network is allowlisted, and `*.supabase.co` is
   not on it.** `docker pull` failed (blocked registry), and direct HTTPS from
   Node/curl to the Supabase REST/Auth API failed with a 403 at the egress
   proxy — confirmed not Supabase-specific (`google.com` also 403'd). The
   Supabase MCP tool connection itself has a separate, working path to the
   database, so all DDL/DML/testing in this report went through that channel
   instead of direct HTTP. This is disclosed here rather than worked around
   silently — see §5 for exactly what that means for "actually verified."

---

## 1. What was implemented

**Schema** (12 migrations, `supabase/migrations/`, all applied to the live
project): `profiles` (role model + two admin-tier dangerous-capability
grants), `areas`, `categories`, `app_config` (6 product flags + the ranking
threshold, all data-driven), `places` + `place_eat_details` +
`place_explore_details`, `bookmarks`, `plans` (+ share-token RLS),
`ranked_entries` (+ the pairwise ranking function), `business_claims`,
`location_history` + `location_history_access_log` (+ the gated-read
function), `admin_audit_log`, `admin_login_audit_log`, `reports`,
`place_rank_snapshots` + `gem_candidates`. 17 tables total, all with RLS
enabled.

**Postgres functions**: `fn_log_ranked_visit` (pairwise binary-insert
ranking), `fn_protect_ranking_fields`/`fn_protect_profile_admin_fields`/
`fn_protect_claim_resolution_fields`/`fn_protect_report_resolution_fields`
(column-protection triggers), `fn_admin_read_location_history` (log-before-load
gate), `fn_admin_override_ranking`, `fn_admin_adjust_contributor_weight`,
`fn_admin_list_gem_candidates`, `fn_admin_capture_rank_snapshot`,
`fn_log_admin_login_attempt`, `fn_delete_own_account`, `fn_create_plan_share_token`,
plus the `is_admin()`/`owns_verified_claim()`/etc. RLS helper functions.

**RLS**: every table, policies described in `supabase/README.md` and each
migration's header comments.

**Auth**: email/password works (default-enabled); test accounts created and
their password hashes verified against the real bcrypt mechanism. Phone OTP
and Google OAuth are **not configured** (no SMS provider, no OAuth client —
open per §8 question #6, and there was never a Google client to begin with).
Admin-login audit logging primitive built and verified; the ideal
tamper-proof version (a GoTrue Auth Hook) needs project-level Auth config not
reachable by any tool in this session.

**Edge Function**: `share-preview`, deployed and `ACTIVE` on the live
project, `verify_jwt=false` (deliberate — see its header comment and
§9 decision below). Not invoked over HTTP in this session (network
constraint above); deployment itself is confirmed via `list_edge_functions`.

**Seed data**: real 8 eat + 8 explore + 8 area dataset, lifted verbatim from
`design_handoff_madli/prototype/Madli Prototype.dc.html`, plus one fixture
place (`Mehfil`) for the below-threshold path. Applied to the live project.

**Test accounts**: 3 dev accounts (admin/user/owner), created directly in
`auth.users`, documented in `supabase/README.md`.

---

## 2. Design handoff — what it resolved vs. what's still open

The uploaded `design_handoff_madli/` package (`README.md`, `CLAUDE.md`,
`design-system/`, `prototype/`) was read in full, plus targeted searches of
the prototype's embedded mock data (`AREAS`, `FOOD`, `EXPLORE`, `CAT_ROWS`,
`ADMIN_ROWS`, `REPORT_ROWS`, `CLAIM_ROWS`, `AUDIT_ROWS`, `gemCandidates`,
`lhRows`/`lhReasons`), which turned out to contain real evidence for several
of the backend prompt's open questions — not guessed at, sourced:

| # | Question | Resolution | Evidence |
|---|---|---|---|
| 1 | Guest session state | **Resolved: client-side only.** No backend table built. | README's own "Client/session state in the prototype" list names `searches`/`rejects` as prototype/session state. |
| 2 | "Outside fame" score | **Partially resolved.** Formula confirmed: `gem_score = outside_fame_rank - local_rank`. Source of `outside_fame_rank` itself (manual entry vs. external feed) **still open**. | `gemCandidates` mock: every row's `score` = `outside_rank - local_rank` exactly (e.g. Subhan Bakery #4 local vs #214 outside → score 210). |
| 3 | Ranking weight curve | **Still open.** Storage built (`profiles.ranking_weight`, `fn_admin_adjust_contributor_weight`), formula not invented. | S46/S32 confirm the concept is real ("progress toward 25") but never give the curve. |
| 4 | Admin permission granularity | **Resolved: multiple real tiers exist**, contradicting the backend prompt's own "default to single flat Admin role" fallback. Exact tier→dangerous-capability default mapping **still open** (built as explicit per-account grants, not inferred from tier name). | `ADMIN_ROWS` mock lists real accounts with roles "Superadmin", "Catalogue", "Moderation". |
| 5 | Report taxonomy | **Resolved** using the prototype's own mock queue (5 concrete types below), not independently cross-checked against README's S49 prose (which doesn't enumerate beyond "duplicate listing"). | `REPORT_ROWS`: "Timings wrong", "Permanently closed", "Duplicate listing", "Dish name is abusive", "Wrong phone number". |
| 6 | SMS provider | **Still open.** Nothing configured. | Not mentioned anywhere in the material available. |

Additional finding not in the original six: the backend prompt's §4 flagged a
Next.js-vs-Vite conflict for Phase 2 to resolve deliberately. The design
handoff's own `CLAUDE.md` already resolves it for a greenfield repo (this
one): **React + TypeScript + Vite, plain CSS**. This also directly justified
building the `share-preview` Edge Function (§9) rather than skipping it: a
Vite SPA has no server-side rendering, so it can't generate the per-request
Open Graph tags S22 requires on its own.

`place_rank_snapshots` (§5.8) — confirmed needed, not just inferred: S47's
"ranking history per candidate stops a one-week spike becoming a gem" is
backed by a real prototype UI (`gemCandidates` list), so it was built.

---

## 3. Design decisions made and why

- **§5.5 owner-edit protection: trigger, not table split.** `gem` is an
  eat-only field but also explicitly named as ranking-relevant and
  Owner-protected. A permission-based table split can't cleanly hold an
  owner-editable field (`dishes`) and an admin-only field (`gem`) side by
  side in the same eat-only table. A trigger checking specific protected
  columns, applied to both `places` and `place_eat_details`, handles this
  correctly. Verified for real (§5 below).
- **`fn_log_ranked_visit` tier/position semantics.** The backend prompt
  specifies position is scoped per `(user_id, category)`, not per-tier, so
  tier and position are stored as independent attributes rather than
  tier-scoped comparison buckets. Which existing entry the frontend offers
  for comparison is left as a Phase 2/3 UX decision — the function accepts
  whatever candidate(s) it's given.
- **`location_history_access_log` kept as its own dedicated table**, not
  folded into `admin_audit_log`, following §5.7's more specific instruction
  over §5.10's more general "or unify" suggestion.
- **Plans share-link access is a real RLS policy**, not a wrapper RPC:
  `share_token = current_setting('request.headers', true)::json ->> 'x-share-token'`.
  Verified this is genuinely scoped (an unfiltered `select *` with the right
  header still only ever returns the one matching row) — not a blanket
  public SELECT, per the explicit instruction.
- **`published_picks`/`gem_candidates` views set `security_invoker = true`**
  so they respect the querying user's RLS on underlying tables rather than
  the view owner's. `gem_candidates` additionally has direct table access
  revoked entirely and is exposed only through an admin-gated function
  (S47 is Admin-only) — a plain view can't be scoped to a specific app-level
  role the way RLS scopes a table.

---

## 4. Security review (§12)

- No secrets hardcoded anywhere — grepped for service-role/password literals
  across `supabase/`, `tests/`; none found beyond documented placeholders.
- `SUPABASE_SERVICE_ROLE_KEY` is **not used anywhere** in this backend. Every
  RLS-bypass need is served by a `SECURITY DEFINER` Postgres function (a
  database-level privilege escalation, independent of Supabase's API-level
  service-role key). This is a stronger posture than the minimum bar
  ("used only in service-role-context functions") — the key isn't needed at
  all.
- `.env.local` is git-ignored (confirmed via `git status`); `.env.example`
  documents every variable with placeholders only.
- `get_advisors(security)` was run **twice**: after the initial schema+RLS
  migrations, and again after a follow-up hardening migration
  (`20260820101100_security_hardening.sql`). Findings and resolution:
  - **Fixed**: 9 functions had a mutable `search_path` (a real
    search-path-hijacking risk for `SECURITY DEFINER`/trigger functions) —
    locked to `search_path = public, pg_temp` (or `+ extensions` where a
    function calls an `extensions`-schema function).
  - **Fixed**: 6 admin-gated `SECURITY DEFINER` functions were callable by
    `anon` despite an explicit `revoke all ... from public` — Supabase's
    schema-level default privileges re-grant `EXECUTE` to `anon`/`authenticated`
    on every new function, silently overriding a plain `revoke from public`.
    Fixed with an explicit `revoke ... from public, anon` per function.
  - **Reviewed and accepted, not changed**: `is_admin()`, `is_admin_tier()`,
    `can_override_ranking()`, `can_access_location_history()`,
    `owns_verified_claim()`, `handle_new_user()`, `fn_log_admin_login_attempt()`
    remain callable by `anon`. Each returns only a boolean derived from the
    caller's own (absent, for anon) `auth.uid()`, is used inside other
    tables' RLS policies, and leaks no data itself; `fn_log_admin_login_attempt`
    is intentionally anon-callable (a failed login attempt by definition has
    no session).
- **Confirmed directly** (not by inspection): `location_history` and every
  audit table cannot be read except through their intended gated path — see
  §5.7 verification results below.
- **Confirmed directly**: the §5.5 owner-edit trigger blocks a direct client
  UPDATE of a protected column, including the cross-table `gem` case — see
  results below.
- `npm audit` on the test-suite's dev dependencies shows a known esbuild
  advisory (moderate, dev-server-only, propagates as "critical" through the
  dependency chain per npm's severity rollup). Reviewed and accepted: it only
  affects `vite`'s dev server accepting cross-origin requests, which this
  project never runs (`vitest run`, not `vite dev`); not a shipped-code or
  production risk.

---

## 5. Testing — what was actually run, and how

**The Vitest suite** (`tests/`, 8 files) is written to make real HTTP
requests via `@supabase/supabase-js` against the hosted project — real
sign-ins, real anon/authenticated/admin sessions. It could not be executed
end-to-end in this sandbox (§0). **It has not been claimed as "passing" on
that basis** — instead:

**Every distinct assertion in the suite was independently re-verified**
directly against the live database via the Supabase MCP `execute_sql` tool,
using `SET LOCAL ROLE anon|authenticated` + `SET LOCAL request.jwt.claims`
(and `request.headers` for the plans policy) to simulate each persona
exactly as PostgREST does — the same technique pgTAP uses for RLS testing —
each batch wrapped in a transaction ending `ROLLBACK` so seed data was never
mutated by the verification itself. This is real verification against a real
database with real RLS/triggers/functions, not a reading of the policy SQL.

**Results: 91 distinct checks run, all passing** by the end (two real issues
were found and fixed mid-verification — see below), covering:

- Public-read tables + write restrictions (6 checks)
- `profiles` RLS incl. self-promotion blocked by trigger (6)
- `bookmarks` + `plans` incl. the share-token header policy, both correct-
  and wrong-token cases (10)
- `ranked_entries` RLS + `fn_log_ranked_visit`: first-in-category, single
  comparison both directions, final position ordering, disliked-tier
  logged-but-hidden, duplicate-rank rejection, comparison-required
  enforcement, anon blocked (7)
- §5.5 owner-edit protection: allowed column succeeds, ranking fields
  rejected (`locals`, `reason`, cross-table `gem`), owner-editable
  cross-table field (`dishes`) succeeds, non-owner fully blocked, admin
  bypass works (9)
- §5.7 location-history gate: owner reads own rows, admin direct SELECT
  returns nothing, empty-reason rejected, non-privileged caller rejected,
  anon blocked, valid call logs-then-returns, direct log INSERT blocked (8)
- §5.8 ranking threshold: below/at-threshold places, config-driven not
  hardcoded, non-admin blocked, plus `business_claims` RLS incl.
  `called_at`-distinct-from-approval (15, after correcting 4 — see below)
- `admin_audit_log`/`reports` UPDATE-blocked-by-RLS re-verification (2)
- `admin_login_audit_log`: two distinct logged outcomes, anon-callable
  logger, admin-only reader, invalid-event-type rejected (6)
- Admin functions: `fn_admin_override_ranking` (reason required, updates +
  logs, append-only), `fn_admin_adjust_contributor_weight` (negative
  rejected, zeroing works), `gem_candidates` (formula correct, non-admin
  blocked at both the function and the view), `fn_delete_own_account` guard (10)
- Full account-deletion cascade (real delete, real cascade, rolled back) +
  constraint/FK/duplicate failure cases (12)

**Two real bugs were found this way and fixed, not glossed over:**

1. A ranking-function test used a place from the wrong category (Simply
   South is `Breakfast and tiffin`, not `Cafes`), making the function
   correctly treat it as first-in-a-different-category rather than a same-
   category comparison. Test data fixed, not the function — the function's
   behavior was correct.
2. **A methodology bug affecting the Vitest suite too, not just the SQL
   verification**: several assertions assumed an `UPDATE`/`DELETE` blocked
   purely by an RLS `USING` clause (no protective trigger backing it) would
   raise an error. It doesn't — PostgREST reports success with zero affected
   rows. This produced 4 false-negative results in the SQL verification pass
   (caught and fixed on the spot with `GET DIAGNOSTICS row_count`), and the
   same wrong pattern was found and fixed in 4 places in the Vitest suite
   (`ranking_threshold.test.ts`, `admin_functions.test.ts`, `rls.test.ts` ×2)
   using `.select()` to check actually-affected rows instead of expecting an
   `error`. The underlying security property was correct in every case; only
   the test assertions were wrong.

**Auth**: email/password sign-in itself could not be exercised over real
HTTP (§0). Verified instead via the same bcrypt mechanism GoTrue uses
(`crypt('MadliDev!2026', encrypted_password) = encrypted_password` → true for
all 3 accounts; wrong password → false), which confirms a real sign-in
*would* succeed/fail correctly, without being able to invoke the HTTP
endpoint directly. Phone OTP and Google OAuth: not configured, not tested,
disclosed as such (§0, §1) rather than silently treated as done.

**Ranking-threshold filter**: verified live — Mehfil (locals=9) and
Charminar (locals=47) absent from `published_picks`; Cafe Bahar (locals=61)
present; raising the config threshold to 100 removes Cafe Bahar, restoring
it to 50 brings it back — proving the filter reads live config, not a
hardcoded literal.

---

## 6. Unresolved issues carried forward

All six from §2's table where marked "open" above, plus:

- Vitest suite is correct (post-fix) and ready to run, but has never been
  executed end-to-end by an actual test runner in *any* environment — only
  verified via the equivalent direct-SQL technique. Whoever has real network
  access to this project should run `npm test` once, expecting it to pass
  cleanly given the SQL-level verification, as a final confirmation.
- `share-preview` Edge Function is deployed but not invoked over HTTP in this
  session (§0) — curl it once real network access exists.
- Admin login's invalid-credentials logging is client-invoked
  (`fn_log_admin_login_attempt`), not enforced by a GoTrue Auth Hook — see
  §1 and `supabase/README.md`.
- Local Supabase stack (`supabase start`) untested — Docker registry pulls
  were blocked in this sandbox specifically; should work in a normal
  environment with Docker network access.
