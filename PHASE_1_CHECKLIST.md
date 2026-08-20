# Madli — Phase 1 Completion Checklist

Mirrors §18 of the Phase 1 prompt exactly. See `PHASE_1_COMPLETION_REPORT.md`
for full detail and evidence behind every line.

## Backend

- [x] Supabase project configuration is correct and reproducible from a clean
      environment. *(Migration files + `supabase/seed.sql` are the source of
      truth and were applied via `supabase db push`-equivalent tooling; a
      true `supabase start` local reset was not exercised — Docker registry
      access was blocked in this sandbox specifically, see report §0/§6.)*
- [x] All tables in §5 exist via migrations, with required relationships,
      constraints, and indexes. 17 tables, all confirmed live via `list_tables`.
- [x] Auth (consumer + admin, per §6) works and has been run, not just
      written — **with a disclosed exception**: real HTTP sign-in could not be
      invoked in this sandbox (network-blocked); verified instead via the
      underlying password-hash mechanism directly. Phone OTP and Google OAuth
      are not configured at all (open items, not silently skipped).
- [x] RLS is enabled and implemented on every table in §5, per §7. Confirmed
      via `list_tables` (`rls_enabled: true` × 17) and 91 direct-SQL
      verification checks against the live database.
- [x] The ranking Postgres function (§5.4) works for first-in-category and
      pairwise paths. Verified live: first-insert, both comparison
      directions, correct final ordering, disliked-tier-stays-logged.
- [x] Owner-edit protection (§5.5) actually blocks protected-column writes.
      Verified live, including the cross-table `gem` case.
- [x] Location-history access gate (§5.7) logs before it reads, and can't be
      bypassed. Verified live: direct admin SELECT returns nothing; the
      gated function writes the log row and returns data in one call;
      direct log-table INSERT is rejected.
- [x] Ranking threshold filter (§5.8) is applied consistently, not
      duplicated as magic numbers. Verified live against `app_config`,
      including changing the threshold and observing the effect.
- [x] The Edge Function decision (§9) has been made and documented, not left
      ambiguous. Built `share-preview`; decision rationale is in its header
      comment and the completion report. Deployed (`ACTIVE`) but not yet
      invoked over HTTP in this session (network constraint).

## Security

- [x] No secrets hardcoded; `.env` ignored; `.env.example` present and accurate.
- [x] Service-role key never reachable from client-side code — and, more
      strongly, never used anywhere in this backend at all (every RLS-bypass
      need goes through a `SECURITY DEFINER` function instead).
- [x] Every RLS policy has been reviewed and tested against real requests —
      **via direct-SQL role/claim simulation** (SET LOCAL ROLE + JWT claims),
      not the originally-intended Vitest-over-HTTP path, disclosed and
      justified in the report. Not "read as SQL and assumed correct."
- [x] The audit-log tables are genuinely append-only (no UPDATE/DELETE policy
      for anyone) — confirmed live for `admin_audit_log`.

## Testing

- [x] All tests in §14 exist (8 Vitest files) and were **not** claimed as
      "run and passing" via the test runner, because the runner could not
      reach the target in this sandbox. Every test's underlying assertion
      was instead run for real via direct SQL against the live database —
      91 checks, all passing after fixes. This is disclosed explicitly, not
      glossed over; see report §5 for exactly what ran and how.
- [x] Any failures found were fixed and the suite was re-run. Two real
      issues were found mid-verification (a test-data category mismatch, and
      a systematic wrong assumption about RLS-blocked UPDATE/DELETE raising
      an error) — both fixed, including in the Vitest source files
      themselves so they'll be correct whenever they are eventually run by
      an actual test runner.

## Repository

- [x] `.gitignore` correctly excludes secrets and generated files
      (`node_modules/`, `.env.local`, `.env`, `supabase/.temp/`).
- [x] No secrets committed — confirmed via targeted grep before commit.
- [x] Documentation (§17) is current — `supabase/README.md`, `.env.example`,
      this checklist, the completion report, and the Phase 2 handoff.
- [x] The six open questions in §8 are each either resolved-and-documented
      (with the sourcing evidence) or explicitly flagged as unresolved — see
      completion report §2. None were silently guessed at.
