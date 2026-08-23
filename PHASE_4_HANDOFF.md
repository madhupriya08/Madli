# Madli — Phase 4 Handoff

Read this before starting Phase 4. Phase 3 replaced every mock data-layer seam with a real Supabase
call, wired real auth, fixed the fixture-based Owner check, and built a committed Playwright E2E
suite. Full detail lives in `PHASE_3_COMPLETION_REPORT.md` and `PHASE_3_CHECKLIST.md` — this is the
condensed operating brief plus everything still open.

## 0. Before doing anything else: get this branch actually pushed

This phase's work is fully committed locally (branch `claude/phase-1-completion-amma9f`, in
`/home/user/Madli`) but **could not be pushed to GitHub from this session** — this needs a human to
resolve before anyone else can see this work:

- Plain `git push`/`git ls-remote` against `https://github.com/madhupriya08/Madli` fails with
  `repository not found`, even for a read-only `ls-remote` — this session has no git-level
  credentials wired for this repo at all.
- The GitHub MCP tools are authenticated as a **different** GitHub account than the repo owner
  (`madhupriya08`) — confirmed **twice**, across two separate MCP reconnects in this same session,
  with two different resulting identities (`chsreemayee`, then later `prashanthreddya0707-cmyk`,
  both confirmed via `get_me`). `list_branches` against `madhupriya08/Madli` returns a real `404`
  for both. This rules out "just a transient reconnect" — it's an access-grant problem that survives
  a fresh MCP connection with a completely different backing account.
- This is an access/configuration problem, not a transient network error — retrying won't fix it.
  A human needs to either: reconnect this session's GitHub integration under the `madhupriya08`
  account (claude.ai Settings → Connectors), or grant whichever account/App is installed access to
  this repo (an org owner does this at claude.ai/admin-settings/claude-tag), or manually pull the
  `claude/phase-1-completion-amma9f` branch from wherever this container's local clone ends up
  preserved, or ask the next session (once access is fixed) to push it.
- **Nothing is lost**: the local commit exists (`git log` on that branch shows it), it's just not on
  GitHub yet. Do not re-do this phase's work — once access is fixed, a plain `git push -u origin
  claude/phase-1-completion-amma9f` from that same checkout is all that's needed.

## 1. What exists today

- **Live Supabase project**: `wybpprdunzrzyzsbiarv`, 17 tables, full RLS, real seed data, one
  deployed Edge Function (`share-preview`). Nothing changed about the schema/migrations/functions in
  this phase — Phase 3 was frontend-only.
- **Complete, real-Supabase-integrated frontend** (`src/`): all 52 screens, all 28 design system
  components, a real data layer (no mocks left except the one disclosed exception below), real
  `supabase.auth`, a real per-user Owner-mode check, and a committed Playwright E2E suite (`e2e/`).
- **The one still-fixture-backed seam, disclosed, not hidden**:
  `src/screens/admin/RolesAccountsAuditScreen.tsx`'s admin-accounts listing. `profiles` has no email
  column, `auth.users` isn't client-queryable via the anon key, and no listing view/RPC exists yet.
  To convert this for real: add a `SECURITY DEFINER` function (admin-only, mirroring
  `fn_admin_read_location_history`'s gate pattern) that joins `auth.users.email` with `profiles`, or
  add an explicit `email` column to `profiles` kept in sync via a trigger on `auth.users`. Either is
  a real backend change, out of scope for a frontend-only phase.

## 2. Test accounts (dev-only, rotate/delete before anything production-adjacent)

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin (superadmin) | `admin.superadmin@dev.madli.test` | `MadliDev!2026` | `role=admin`, `admin_tier=superadmin`, both grants |
| Admin (moderation, partial grant) | `admin.moderation@dev.madli.test` | `MadliDev!2026` | `role=admin`, `admin_tier=moderation`, **not** `can_override_ranking` — created this phase specifically for real permission-denial testing (`e2e/admin.spec.ts`'s "a partial-grant admin cannot override a ranking" test) |
| User | `user.test@dev.madli.test` | `MadliDev!2026` | plain `role=user` |
| Owner | `owner.test@dev.madli.test` | `MadliDev!2026` | `role=user` + a **verified** claim on Cafe Bahar (`00000000-0000-0000-0000-0000000000f5`) |

**One thing to re-confirm, not assumed either way**: the moderation account's `can_override_ranking
= false` is certain (it's directly exercised by a passing assertion path in `e2e/admin.spec.ts`), but
its `can_access_location_history` value could not be re-confirmed against the live project in the
final part of this phase — the Supabase MCP tool's project access unexpectedly repointed to an
unrelated project mid-session (see `PHASE_3_COMPLETION_REPORT.md` §4), and this session ended before
that access was restored. Run this once, early in Phase 4, to confirm (and correct if needed):

```sql
select p.role, p.admin_tier, p.can_override_ranking, p.can_access_location_history
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'admin.moderation@dev.madli.test';
```

## 3. The Playwright E2E suite

Location: `e2e/*.spec.ts`, config at `playwright.config.ts`, shared helpers/accounts at
`e2e/helpers.ts`. Run with:

```
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at minimum
npx playwright test
```

**What actually happened when this was run in this session's sandbox** (full detail:
`PHASE_3_COMPLETION_REPORT.md` §4c): 13 of 14 tests could not complete because this specific
sandbox's network policy makes a **browser-originated** request to `wybpprdunzrzyzsbiarv.supabase.co`
hang indefinitely (never resolves, never rejects) rather than fail fast — confirmed to be different
from this same sandbox's handling of **Node-originated** requests to the same host, which do get a
fast, clean `403` (this sandbox's proxy explicitly denies the `CONNECT`, and Node picks up
`HTTPS_PROXY`; Chromium, launched by Playwright, does not by default). The one test that manually
intercepted its own request at the browser/CDP level (`page.route(...).abort()`, bypassing the
sandbox's network layer entirely) passed cleanly.

**Two things worth doing early in Phase 4, in a normal network-enabled environment:**
1. Just run `npx playwright test` there first, with no changes — every spec targets real, already
   backend-verified behavior (see `PHASE_3_COMPLETION_REPORT.md` §4a/§4b for what was independently
   confirmed via SQL/HTTP already), so the expectation is a clean pass, not a suite that needs
   rewriting.
2. If a similarly-sandboxed environment needs to run this suite again, consider adding
   `use: { proxy: { server: process.env.HTTPS_PROXY } }` to `playwright.config.ts`'s chromium project
   — this would very likely convert 13 silent hangs into 13 fast, readable pass/fail results (still
   blocked in a fully egress-locked sandbox, but diagnosable in seconds instead of ~5 minutes of
   timeouts). Not done in this phase because it wouldn't have changed the outcome here (the host is
   policy-denied either way) — noted as a real, low-cost improvement for whoever runs this next in a
   similar environment.

`e2e/claim-lifecycle.spec.ts` uses "Simply South" and is **not idempotent across repeated runs**
against the same project — a second run hits the real `business_claims_active_unique` constraint at
the submit step (documented in the spec file itself). If this becomes a recurring friction in CI,
either add a teardown that deletes the test claim afterward, or rotate to a fresh, never-claimed
place per run.

## 4. Open items carried forward (not silently resolved)

- **§0 above — get the branch pushed.** The single highest-priority item; everything else in this
  phase's work is otherwise complete and ready.
- **The GitHub-push access problem itself** may recur for any future session working this repo —
  worth fixing at the account/App-installation level (not per-session) so it doesn't block Phase 4
  the same way.
- **`RolesAccountsAuditScreen`'s admin-accounts listing** — still fixture-backed (§1). Needs a real
  backend addition (a `SECURITY DEFINER` function or a synced `email` column) before it can be
  converted — a real, disclosed backend gap, not a frontend oversight.
- **Phone OTP and Google OAuth** — genuinely non-functional, open since Phase 1. Needs an SMS
  provider and a Google OAuth client configured in Supabase Auth settings before `src/lib/auth.ts`'s
  already-real `verifyOtp`/`signInWithGoogle` calls will do anything beyond return the project's
  "provider not enabled" error.
- **The Playwright suite's real pass/fail signal** — genuinely not yet obtained in any environment
  with normal network access (§3). This is the most important thing to check first in Phase 4, since
  every spec targets real, previously-verified backend behavior and *should* pass cleanly — if it
  doesn't, that's new, real signal worth investigating immediately, not dismissed as "probably the
  same sandbox issue."
- **The second admin account's `can_access_location_history` grant** — needs the one-query
  reconfirmation in §2.
- Everything Phase 2 already carried forward and Phase 3 didn't touch: the exhaustive per-state,
  per-screen click-through and the automated a11y/keyboard pass (`PHASE_2_HANDOFF.md` §9,
  unchanged), and the six items from Phase 1's own §8 (unchanged since Phase 1).

## 5. What NOT to do

- Don't re-do Phase 3's seam conversion — it's complete; grep for `TODO(phase-3)` in `src/` to
  confirm zero results before assuming otherwise.
- Don't touch `src/lib/guestSession.tsx` — confirmed, twice now (Phase 1 and Phase 3), to be
  genuinely client-side-only with no backend seam.
- Don't rewrite the Playwright suite before actually running it somewhere with real network access —
  it is expected to pass as-is; treat any real failure there as new signal, not as confirmation of
  the sandbox issue repeating.
