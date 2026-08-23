# Madli — Phase 4 Completion Checklist

Mirrors the Phase 4 prompt's §16 definition-of-done. See `PHASE_4_QA_REPORT.md` for full evidence
behind every line — this file states plainly what was and wasn't actually exercised, in the same
disclosure style as the three prior phases' checklists.

- [x] **§0's branch-push status is resolved and confirmed** — access was fixed between sessions;
      `git push` succeeded, confirmed via `git ls-remote`. Not left as a stale claim.
- [x] **The second admin account's grants are reconfirmed against the live database** — real SQL
      query, real result: `admin_tier=moderation`, `can_override_ranking=false`,
      `can_access_location_history=true`, exactly as intended. No correction needed.
- [x] **`npx playwright test` produces a real, reported pass/fail signal in this session's
      environment** — run twice this phase (once for §4's fresh attempt, once as the final §14
      build-audit run). Real result both times: functional E2E hits the same disclosed network
      constraint as Phase 3 (now failing fast instead of hanging, a real diagnostic improvement);
      accessibility + keyboard (network-mocked) ran fully and found/fixed 5 real bugs. Not assumed
      blocked without trying — actually attempted, actually diagnosed.
- [x] **`claim-lifecycle.spec.ts` is fixed for repeat-run reliability** — real `finally`-block
      cleanup via the admin's real DELETE grant; no longer collides with
      `business_claims_active_unique` on a second run.
- [x] **`RolesAccountsAuditScreen` is fully converted off fixture data, with a properly hardened
      backend addition** — `fn_admin_list_accounts()`, `SECURITY DEFINER`, search_path locked,
      revoked from `public`/`anon` from the start, verified live in both directions (admin success,
      non-admin/anon rejection). Fixture array deleted, confirmed nothing else imported it.
- [x] **The functional-audit completeness matrix exists and covers meaningfully more than Phase
      3's default-states-only coverage** — all 52 screens' default states now have a real,
      automated render+accessibility check (new this phase); roughly half of the 73 additional
      named states have real scripted coverage; the rest are named with a specific reason each,
      not silently skipped. See `PHASE_4_QA_REPORT.md` §6 for the full per-screen table.
- [x] **Database, Supabase, frontend, integration, security, code quality, repository, and build
      audits are each complete with real evidence** — §§7–14 of the QA report, each with actual
      command output, actual SQL results, or actual grep output, not a checkmark alone. Two real,
      previously-unnoticed gaps were found and fixed during these audits: a migration-history
      divergence (`pg_net`/`http` extensions recorded as installed but actually dropped, closed
      with a new idempotent migration) and a misfiled runtime dependency
      (`@supabase/supabase-js` was in `devDependencies`, moved to `dependencies`).
- [x] **An automated accessibility scan and a genuine keyboard-only pass have actually been run,
      with real findings fixed or explicitly justified** — 55 real Playwright tests (52 screens +
      3 keyboard checks), real axe-core violations found and triaged: 2 real bugs fixed outright
      (a missing progressbar name; a systemic `navigate()`-during-render anti-pattern in 5 screens),
      1 real missing feature fixed (Dialog had no modal focus management at all), 1 real
      regression from that same fix caught and fixed before it shipped (a stale-callback effect
      dependency that broke typing in a delete-confirmation dialog), 2 near-miss color-contrast
      tokens fixed (barely-perceptible darkening), and 2 further color-contrast issues explicitly
      **not** fixed with exact numbers and reasoning (they need a real design decision, not a QA
      nudge) — carried into the Production Readiness Summary as launch-blocking-if-AA-compliance-
      matters, not silently left unresolved.
- [x] **The README is consolidated into one current, coherent document** — setup, env vars, every
      command, a real data model/RLS summary, auth status, the E2E/accessibility split, test
      accounts, dev harness usage, and a table to each phase's own deeper report. `supabase/README.md`'s
      stale "no frontend yet" opening line also fixed.
- [x] **The production readiness summary is written, honest, and correctly categorized** — its own
      document, `PRODUCTION_READINESS_SUMMARY.md`, addressed to the human team, not folded into the
      engineering report and not rounded up into a single "ready to launch" line.

## What this phase did NOT do (by design, not oversight)

- Did not invent an SMS provider or Google OAuth client choice — no product decision and no
  Dashboard access existed this session for either.
- Did not attempt `supabase db reset` against a clean local environment — no Docker/CLI access in
  this sandbox, same constraint disclosed since Phase 1.
- Did not redefine `--text-faint`/`--slate-400` or the `Button` `accent` variant's coral background
  to force the two remaining color-contrast findings to pass — both need a real design decision
  (see `PHASE_4_QA_REPORT.md` §9 for exact numbers), not a unilateral QA-phase color change to the
  brand's signature accent or its faintest text tier.
- Did not script E2E coverage for S44 (catalogue add/edit) or S45 (catalogue bulk import) — judged
  lowest real-user risk of the admin surface and out of this phase's scripting budget; each screen
  still got the same automated default-state accessibility check every other screen got.
- Did not touch `src/lib/guestSession.tsx` or `fixtures/admin.ts`'s seed arrays — confirmed, again,
  as genuinely not load-bearing for anything this phase touched, and (for the seed arrays)
  deliberately kept as labeled historical design evidence rather than deleted as dead weight.
