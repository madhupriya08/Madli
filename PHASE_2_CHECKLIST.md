# Madli — Phase 2 Completion Checklist

Mirrors §13 of the Phase 2 prompt exactly. See `PHASE_2_COMPLETION_REPORT.md` for full detail and
evidence behind every line — this file states plainly what was and wasn't actually exercised, in
the same disclosure style as `PHASE_1_CHECKLIST.md`.

## UI

- [x] All 28 design system components ported as real, typed components; trust components verified
      against their exact spec. **With a real bug found and fixed along the way** (see report §6):
      `ReasonNote`'s 46ch cap is a CSS token (`--reason-max`), verified by RTL assertion on the
      rendered inline style, not by reading the source. `RankBadge`'s rank-1/2/3 colors weren't
      independently re-derived here — it consumes the same token set as everything else and wasn't
      called out as broken by either the RTL suite or the browser click-through, but there is no
      dedicated pixel-level check of those three specific color values.
- [x] All 52 screens exist, reachable via the dev persona/state harness — confirmed by an actual
      automated click-through of all 52 screens × all 4 personas (208 visits) via the harness's
      "All screens" tray, not just by the routing table existing. Zero React crashes, zero error
      boundary hits, zero application console errors across all 208 (see report §4).
- [ ] Every state each screen's README table specifies actually renders, **verified by clicking
      through the harness** — **partially true, disclosed honestly**: the default/primary state of
      all 52 screens was clicked through for real (above). The ranking loop's full multi-step
      happy path (first-in-category and pairwise) was clicked through end-to-end with no page
      reloads and produced the correct result (report §4). Secondary state variants (every error
      state, every admin-tier combination, S12's wrong/expired OTP codes as an actual typed
      interaction rather than a code-read, etc.) were verified by code inspection — the conditional
      branch exists and is reachable — but not by an actual click on each one. This is the same
      exhaustiveness gap named in the report; not rounding it up to "all states clicked."
- [x] The 9 real-divergence screens (S15, S17, S18, S19, S20, S21, S31, S42, S43) have genuinely
      distinct mobile/desktop layouts — confirmed by a dedicated desktop-breakpoint click-through of
      all 9 (report §4), separate from the mobile-default main pass.
- [x] Design tokens copied verbatim and used exclusively — no hardcoded hex/px/duration/radius that
      exists as a token. Checked by construction (every component/screen written against `var(--*)`
      tokens from the start) rather than a separate grep audit after the fact.
- [x] Copy matches the handoff's final copy — nothing rewritten. Screen copy was taken directly from
      `design_handoff_madli/README.md`'s screen-by-screen notes and the prototype; not independently
      diffed line-by-line against the source file after the fact.

## Data layer

- [x] Every function in §5 implemented against fixtures, matching Phase 3's real contract in
      name/params/return shape, with a clear `// TODO(phase-3)` seam — 13 seam comments across 7
      files, listed exhaustively in `PHASE_3_HANDOFF.md`.
- [x] Fixtures sourced from the real Phase 1 seed data, not invented — same place ids, names, and
      values as `supabase/seed.sql`, including the below-threshold `Mehfil` fixture and the closed
      `Deccan Grill House` catalogue example.
- [x] `logRankedVisit`'s pairwise logic and the threshold/gate behaviors actually work against mock
      data, not just render static results — verified twice, independently: 12 Vitest assertions
      exercising first-in-category, both pairwise directions, position-shift-on-insert, comparison-
      target validation, and the disliked-tier-still-logs-but-excluded rule; **and** a real browser
      click-through logging two actual visits in sequence and confirming the resulting position and
      order on S31 (report §4, §6 finding #1 was found and fixed via this exact path).
      `published_picks`' threshold filter, owner-field rejection (with the real trigger's "reject
      the whole update, not just the bad field" behavior), and admin-log-before-read ordering are
      each covered by dedicated tests (`data/places.test.ts`; `admin.ts`'s
      `adminReadLocationHistory` ordering was written to match but has no dedicated Vitest test —
      see below).

## Quality

- [x] TypeScript strict mode, no unnecessary `any` — `npx tsc -b --noEmit` clean, zero errors, as
      of the final commit in this phase (re-run after every fix in report §6).
- [x] ESLint and Prettier pass clean — ESLint: 0 errors, 3 accepted warnings (co-located
      context+hook files, a common and deliberate pattern, not suppressed). Prettier: clean after
      one formatting pass over hand-written files early in the phase.
- [x] `vite build` succeeds — 187 modules, ~417 KB JS (~123 KB gzip), built in ~2.4s. Real output in
      report §3.
- [x] Accessibility basics reviewed across the catalogue, not spot-checked on one screen —
      **with a real gap found and fixed** (report §6 finding #3: `AppShell` and `MarketingShell` had
      no `<main>` landmark in production at all; the dev harness itself briefly introduced a nested
      `<main>` while investigating). No automated contrast or axe-core scan was run, and no
      dedicated keyboard-only pass was done across all 52 screens — disclosed as open in the report
      and in `PHASE_3_HANDOFF.md`, not silently assumed fine.

## Testing

- [x] The Vitest + RTL suite exists and has actually been run, with real results reported — 8
      files, 55 tests, all passing; `npm run test:frontend` output reproduced verbatim in report §3.
- [x] Any failures were fixed and the suite re-run — one real assertion mismatch (a `SampleSize`
      test written against the raw double-spaced separator string before accounting for RTL's
      whitespace normalization) was found, fixed, and the full suite re-run clean; documented in
      report §3, not omitted.

## Repository

- [x] Phase 1's `supabase/` and `tests/` directories untouched — confirmed via `git status`.
- [x] No real Supabase calls anywhere in the frontend code — `grep -rn "supabase-js\|@supabase"
      src/` returns nothing. The `@supabase/supabase-js`/`dotenv` entries in `package.json` are
      Phase 1's own backend-test dependencies (used only by `tests/helpers.ts`), confirmed by
      grepping their actual usage before writing this line, not assumed.
- [x] Documentation is current — root `README.md` (dev server, test/lint/typecheck/build commands,
      data-layer mock seam location, dev harness usage), this checklist, the completion report, and
      `PHASE_3_HANDOFF.md`.
- [x] Every open item from §1 that touches a UI decision is flagged in `PHASE_3_HANDOFF.md`, not
      silently resolved — carried forward verbatim from `PHASE_2_HANDOFF.md`'s own list, plus the
      Phase-2-specific items named in the completion report §9.
