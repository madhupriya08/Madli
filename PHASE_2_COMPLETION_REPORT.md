# Madli — Phase 2 Completion Report (Frontend UI)

Scope: the complete frontend UI for Madli, built and demoable independently of the real Supabase
backend — mock data layer only, no real Supabase/auth calls anywhere. Full requirements in
`Madli_Phase2_Frontend_UI_Prompt.md`; this report follows its numbering where relevant.

Companion documents: `PHASE_2_CHECKLIST.md` (the §13 definition-of-done, marked against what's
actually true) and `PHASE_3_HANDOFF.md` (everything a fresh session needs to start Phase 3).

---

## 0. How to read this report

Per instruction, this does not claim "everything passes" — it states what was actually run and
what the runner actually printed, and separately what was verified by real browser click-through
(via a throwaway Playwright script, not a committed E2E suite — the prompt explicitly excludes
building Playwright/E2E tests as a deliverable) versus what was only verified by code
inspection. Three real bugs were found via that click-through process and are documented in §6,
not glossed over.

---

## 1. What was built

- **Scaffold**: Vite 5 + React 19 + TypeScript (strict mode), React Router v7, TanStack Query v5.
  ESLint (typescript-eslint v8 + `eslint-plugin-react-hooks` v7 + `eslint-plugin-react-refresh`) and
  Prettier configured from the start. Two separate Vitest configs: root `vitest.config.ts` (Phase
  1's backend suite, untouched) and `vitest.frontend.config.ts` (this phase, jsdom + React Testing
  Library).
- **Design tokens**: `public/design-system/tokens/*.css` and `styles.css` copied verbatim from
  `design_handoff_madli/design-system/`, plus fonts and logo assets. Consumed via inline
  `style={{ font: 'var(--type-h3)', ... }}`, matching the reference `.jsx` pattern — no hardcoded
  hex/px/duration/radius that exists as a token.
- **28 design system components**, ported as real TypeScript components using each `.d.ts` contract
  as the authoritative prop type (the `.jsx` reference files were read for behavior, not
  copy-pasted): 8 core (`Button`, `Card`, `Badge`, `Tag`, `Icon`, `IconButton`, `Logo`,
  `PhotoFrame`), 6 forms (`Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `SearchField`), 5
  feedback (`Dialog`, `Toast`/`ToastProvider`, `EmptyState`, `Skeleton`, `Tooltip`), 3 navigation
  (`TopBar`, `TabBar`, `Tabs`), 5 trust (`PickCard`, `RankBadge`, `RankGap`, `ReasonNote`,
  `SampleSize`) — plus `AppShell`/`MarketingShell`/`AdminShell` as composite layout wrappers (not
  counted in the 28, per the handoff's own component list).
- **Fixtures** (`src/fixtures/`): 17 places (8 eat, 8 explore, plus the `Mehfil` below-threshold
  fixture and `Deccan Grill House` closed-catalogue fixture), 8 neighbourhoods/areas, categories,
  `app_config` mirror, and the full admin-side mock tables (accounts, business claims, reports,
  audit log, gem candidates, location history) — all lifted verbatim from the same source Phase 1
  used for its real seed data (`supabase/seed.sql` / the prototype's embedded mock arrays), not
  invented.
- **Data layer** (`src/data/`): one function per §5 operation, each matching the real Phase 3
  contract in name/params/return shape, each with a `// TODO(phase-3)` seam comment. All exposed
  through TanStack Query hooks in `src/data/hooks.ts` (queries for reads, mutations for writes).
  See `PHASE_3_HANDOFF.md` for the full seam list.
- **Dev harness** (`src/dev/`): `PersonaContext` (Guest/User/Owner/Admin, admin tier, two grants,
  breakpoint) and `DevHarness` (persona/breakpoint switcher + "All screens" tray), stripped from
  production via an `import.meta.env.PROD` early-return.
- **Mock auth** (`src/lib/mockAuth.ts`): `mockLogin`/`mockSignUp`/`mockVerifyOtp` (with dev
  convenience codes `000000`=wrong, `999999`=expired)/`mockRequestPasswordReset`/`mockResetPassword`
  — no real Supabase Auth call anywhere.
- **Guest session state** (`src/lib/guestSession.tsx`): search counter, per-session reject list,
  one free "None of these" — genuinely client-side, confirmed in Phase 1 that no backend table
  exists for it.
- **All 52 screens** (`src/screens/`), routed via `src/screens/routes.tsx` against the registry in
  `src/screens/registry.ts`. Every screen ID maps to a real component — no `PlaceholderScreen`
  fallback is actually used in the final routing table.

## 2. UI decisions made where the handoff was ambiguous

- **`pickComparisonTargets`** (`src/data/rankedEntries.ts`): the handoff explicitly left "which
  existing entry to offer as the comparison target" open. Chose: offer the current #1, plus (only
  when the category has 3+ entries and `second_comparison` isn't `removed`) the current median
  entry as an optional second comparison. Rationale: a fast single-tap answer for a short list, a
  coarse binary-search-like second question for a longer one — matches the "two-tap budget" the
  handoff treats as a hard constraint (S25–S27).
- **TabBar's four destinations**: the design system confirms a bottom nav exists but not its exact
  tab set. Chose Home / Search / Saved / Profile (`map-pin`, `search`, `bookmark`, `user` — all
  confirmed Lucide slugs), in `src/screens/layout/AppShell.tsx`.
- **S17/S18 as one shared component**: implemented literally as the README instructs — one
  `ResultsScreen` component (`src/screens/discovery/ResultsScreen.tsx`) parameterized by `door:
  'eat' | 'explore'`, not two near-duplicate screens.
- **S16's "side drawer"**: `Dialog`'s existing `modal`/`sheet` variants stand in for it (desktop
  modal, mobile sheet) rather than building a third dialog variant.
- **PlaceDetailScreen's "owner" resolution** (mock simplification, documented inline): the single
  Owner persona is treated as owning whichever place has a `verified` claim in the fixture data
  (Cafe Bahar, mirroring Phase 1's real owner test account) — Phase 3 checks the real signed-in
  user's own claim instead, not "the one verified claim in the fixtures."

## 3. Toolchain — actually run, real output

All four commands below were run after every source change in this phase, most recently after the
bug fixes in §6. Exact output:

**Type-check** (`npx tsc -b --noEmit`): clean, zero errors, zero output.

**Lint** (`npx eslint .`):
```
/home/user/Madli/src/components/feedback/ToastProvider.tsx
  77:17  warning  Fast refresh only works when a file only exports components...
/home/user/Madli/src/dev/PersonaContext.tsx
  79:17  warning  Fast refresh only works when a file only exports components...
/home/user/Madli/src/lib/guestSession.tsx
  77:17  warning  Fast refresh only works when a file only exports components...
✖ 3 problems (0 errors, 3 warnings)
```
The 3 warnings are `react-refresh/only-export-components` on files that co-locate a context
provider with its `use*` hook — a deliberate, common pattern (splitting each into two files for
this warning alone would hurt readability for no real benefit), left as-is rather than suppressed.

**Frontend tests** (`npx vitest run --config vitest.frontend.config.ts`):
```
 Test Files  8 passed (8)
      Tests  55 passed (55)
```
8 files: `data/rankedEntries.test.ts` (12), `lib/guestSession.test.tsx` (6),
`components/trust/trust.test.tsx` (11), `lib/mockAuth.test.ts` (11), `data/places.test.ts` (5),
`screens/onboarding/SignupScreen.test.tsx` (4), `screens/owner/ClaimRequestFormScreen.test.tsx` (4),
`screens/personal/PrivacySettingsScreen.test.tsx` (2). See §5 for what each covers. One real
assertion mismatch was found and fixed mid-development (a `SampleSize` test expected the raw
double-spaced separator string before RTL's whitespace normalization collapsed it) — fixed and
re-run, not left in.

**Production build** (`npx vite build`):
```
✓ 187 modules transformed.
dist/index.html                       0.59 kB │ gzip:   0.38 kB
dist/assets/logo-mark-WW3MQ8V5.png  411.00 kB
dist/assets/index-BdoHi9Qi.js       417.40 kB │ gzip: 122.56 kB
✓ built in 2.38s
```

**Prettier** (`npx prettier --check "src/**/*.{ts,tsx,css}"`): clean after one `--write` pass over
hand-written files (pure formatting, no logic changes — confirmed by diff review before and after).

## 4. Real browser click-through verification (beyond code inspection and unit tests)

The prompt is explicit that screens must "actually render... verified by clicking through the
harness, not by code review alone." Vitest+RTL (§5) verifies component and logic behavior in
isolation; the following used a real headless Chromium browser (via Playwright, already present in
this environment for other purposes — not committed to the repo, since the prompt excludes
Playwright/E2E as a deliverable) driving the actual running dev server, to catch integration
problems unit tests can't see: React crashes, error boundaries, and cross-screen state that only
breaks when screens are visited in the order a real session would visit them.

- **Full-catalogue smoke pass**: for each of the 4 personas (Guest/User/Owner/Admin), clicked
  through all 52 screens via the dev harness's "All screens" tray (208 visits total), capturing
  every `pageerror` and `console.error`. Result: **zero React crashes, zero error boundary hits,
  zero application console errors** across all 208 visits, both before and after the fixes in §6.
  The only errors observed (41 of 208 visits, consistently) were
  `net::ERR_TUNNEL_CONNECTION_FAILED` from `Icon.tsx`'s CDN fetch (`unpkg.com/lucide-static`) —
  this sandbox's network proxy blocks `unpkg.com`; it is not reachable from a normal browser with
  real internet access. `Icon.tsx` is explicitly built to degrade gracefully when this happens
  (renders empty space, never a filled block, per its own doc comment) — confirmed true in
  practice, not just in the source comment.
- **Real-divergence desktop pass**: separately re-visited all 9 real-divergence screens (S15, S17,
  S18, S19, S20, S21, S31, S42, S43) at the desktop (1280px) breakpoint specifically — the main
  smoke pass only exercises the harness's mobile default. Zero errors on any of the 9.
- **Ranking-loop end-to-end click-through**: because §5's completeness bullet for the ranking loop
  demands verifying `logRankedVisit` "by actually clicking through it," not just via unit tests —
  ran the full real user path with no full-page reloads (so the in-memory mock store persists
  exactly like a real session): S17 results → "Show me two more" → click into Cafe Bahar's PickCard
  → S19 place detail → bookmark it → S23 bookmarks → "Mark as visited" → S25 trigger → S26 pairwise
  comparison against the previously-logged Hotel Shadab → S27 landed. Result: Hotel Shadab logged
  first landed at #1 of 1 (first-in-category path); Cafe Bahar then correctly landed at #1 of 2
  after being preferred over Hotel Shadab in the pairwise comparison, which was pushed to #2 — and
  S31's ranked list rendered exactly that order. This is real evidence the mechanic works end to
  end, not just that its unit tests pass in isolation.

**What this does not claim**: this was not an exhaustive click-through of every state variant on
every screen (e.g., every one of S9's error states, every admin-tier permission combination on
S50) — that would be dozens of hours of manual/scripted work beyond this phase's budget. States not
explicitly exercised above were verified by code inspection (the conditional rendering exists and
is reachable) but not by an actual click. This is disclosed, not implied to be more than it is.

## 5. Vitest + RTL suite — what each file actually covers

- **`data/rankedEntries.test.ts`** (12 tests): first-in-category landing at position 1; a second
  entry with no comparison target is rejected; pairwise insert in both directions (preferred-new
  above vs. below the target); a third insert correctly shifts every entry at/after the landing
  position down by one; a comparison target not in the user's list is rejected; duplicate logging
  and inactive-place logging are rejected; a `disliked` entry is present in
  `getAllRankedEntries` but absent from `getVisibleRankedEntries`; `pickComparisonTargets`'s
  empty/under-3/3-plus (median) behavior.
- **`lib/guestSession.test.tsx`** (6 tests): search counter increments and reports `paywalled` only
  at/after the configured `guest_paywall_at`; exactly one free "None of these" before the second
  use reports an intercept; the reject list accumulates across calls and actually prevents
  re-showing a place; `reset()` clears all three pieces of state.
- **`components/trust/trust.test.tsx`** (11 tests): `PickCard` renders rank/name/category/
  neighborhood/reason and switches to the gem label+badge; `ReasonNote` applies the shared
  `--reason-max` (46ch) token as its `max-width` regardless of content length (short or long);
  `RankGap` renders the near-tie "Close call" label, the "Thin data" label, an explicit points-based
  sentence, and an overriding custom note; `SampleSize` renders exact counts with thousands
  separators and correctly omits an unset segment.
- **`lib/mockAuth.test.ts`** (11 tests): `validateSignup`'s email/phone/password rules in both
  directions; `mockVerifyOtp`'s three dev outcomes; `mockLogin`'s unknown-identifier, too-short-
  password, and success paths.
- **`data/places.test.ts`** (5 tests): `updateOwnerListing` rejects a protected field
  (`ProtectedFieldError`, message names the field) and leaves the record untouched; succeeds on an
  allowed field; rejects the whole update (not just the bad key) when any field in the payload is
  protected; unknown place id throws.
- **`screens/onboarding/SignupScreen.test.tsx`** (4 tests, RTL): invalid email shows an inline
  `role="alert"` error and doesn't proceed; too-short password does the same even with a valid
  email; valid input clears the error; switching to phone mode changes the field's validation.
- **`screens/owner/ClaimRequestFormScreen.test.tsx`** (4 tests, RTL): a non-Maps link shows the
  specific "doesn't look like a Google Maps link" error; a missing contact number is rejected even
  with a valid Maps link; both a full `maps.google.com` link and a shortened `goo.gl/maps` link are
  accepted.
- **`screens/personal/PrivacySettingsScreen.test.tsx`** (2 tests, RTL): the permanent-delete button
  stays disabled for anything other than an exact `DELETE` (including a near-miss and a superstring)
  and enables only on an exact match.

## 6. Bugs found and fixed during real click-through (not by inspection)

These three were only found because of the browser-driven verification in §4 — none were visible
from reading the source, and all three are now fixed, re-verified, and covered by the toolchain
checks in §3 passing clean afterward:

1. **`MyRankedListScreen` (S31) never rendered any ranked places at the mobile breakpoint.**
   `activeCategory` was `useState(usedCategories[0]?.id)` — a plain `useState` initializer that
   only runs once at mount, before the async TanStack Query call resolves `entries`. On mount,
   `usedCategories` is empty (no data yet), so `activeCategory` was permanently `undefined` once
   real data did arrive on a later render, and the mobile tab view's `activeCategory ? columnFor(...)
   : null` rendered `null` forever. The desktop layout wasn't affected (it maps over all
   `usedCategories` directly, without touching this state). **Fixed** by deriving the effective
   active category on every render instead of syncing via effect: fall back to
   `usedCategories[0]?.id` whenever the currently-selected category isn't (or is no longer) one of
   the categories actually in the list.
2. **No screen anywhere called `useAddBookmark`.** The data layer's bookmark hooks
   (`useAddBookmark`/`useRemoveBookmark`) existed and were tested at the data layer, but no screen
   ever invoked them — `BookmarksScreen`'s own empty-state copy ("Bookmark a place from its detail
   page to see it here") describes an affordance that didn't exist yet, so S23's populated/`nearby`
   states could never be reached through real navigation, only by manually seeding `mockDb` in a
   test. **Fixed** by adding a bookmark/unbookmark `IconButton` to `PlaceDetailScreen` (S19), shown
   for the User persona, wired to the existing hooks — exactly the affordance the empty-state copy
   already promised.
3. **Nested `<main>` landmarks, and two shells with none at all.** Investigating a Playwright
   locator ambiguity on the admin screens surfaced that `AdminShell` renders its own `<main>` while
   the dev harness's device-frame wrapper also rendered a `<main>` around it (dev-only, but still
   invalid nested landmarks in the tool reviewers are told to use). Looking further, `AppShell` and
   `MarketingShell` — the two shells nearly every non-admin screen uses — had **no `<main>` landmark
   at all** in production, only plain `<div>`s. **Fixed**: the dev harness's wrapper is now a
   `<div>` (it's a device frame, not page content), and `AppShell`/`MarketingShell` now wrap their
   actual content in a single `<main>`, matching `AdminShell`'s existing pattern. Re-verified: every
   one of the 9 real-divergence screens (§4) now resolves to exactly one `<main>` element.

## 7. Accessibility — reviewed, not exhaustively audited

Reviewed across the catalogue for the specific items §9 calls out: semantic HTML (headings,
`<button>`/`<a>` used correctly, form `<label htmlFor>` associations in `Input`/`Select`/
`Checkbox`/`Radio`/`Switch`), icon-only buttons carry a required `label` prop that becomes
`aria-label`+`title` (`IconButton`), form errors are tied to their field via `aria-describedby`
pointing at a `role="alert"` element (`Input`), and `--tap-target-min` is used rather than a
reinvented value where controls need it. Fixed the `<main>` landmark gap in §6 as part of this
review. **Not done**: an automated contrast/axe-core scan, or a full keyboard-only pass through all
52 screens — those are real gaps, not silently assumed to be fine; flagged again in
`PHASE_3_HANDOFF.md`.

## 8. Repository hygiene

- `supabase/` and `tests/` are untouched — confirmed via `git status` showing no changes under
  either path.
- No real Supabase call anywhere in `src/`: `grep -rn "supabase-js\|@supabase" src/` returns
  nothing. `@supabase/supabase-js` and `dotenv` in `package.json`'s `devDependencies` are Phase 1's
  own backend-test dependencies (used by `tests/helpers.ts`), not something this phase added or
  uses — confirmed by grepping their only real usage.
- No Playwright dependency was added to the repo; the click-through verification in §4 used a
  throwaway script run against the dev server from outside the project, never committed.

## 9. Genuinely unresolved (carried and not silently assumed)

All six items from Phase 1's own §8 remain open exactly as `PHASE_2_HANDOFF.md` described them —
none were touched by any Phase 2 UI decision. In addition, specific to this phase:

- The exhaustive per-state, per-screen click-through described as "not done" in §4 and §7's
  automated a11y/keyboard pass.
- Whether `pickComparisonTargets`'s median-based second-comparison choice (§2) is the "right" UX —
  it's a reasonable, documented choice against an explicitly-open question, not a confirmed one.
- `PostVisitNudgeScreen`, `RankingOnboardingScreen`, and the default entry to `LogVisitTriggerScreen`
  all resolve to a fixed `places.find(p => p.isActive)` (the first active place, Hotel Shadab) when
  reached without an explicit `placeId` in navigation state. This matches the design handoff's own
  documented flow diagram (`S23 bookmarks → mark as visited → S25 trigger`, i.e., S25 is always
  meant to be entered with a specific place already selected, not as a generic picker) — so this is
  not a bug, but it does mean jumping to `/log-visit` directly (e.g., via the dev harness tray with
  no state) always shows the same fixture place; this is a test-navigation artifact, not a product
  gap, and is called out here so it isn't mistaken for one later.

See `PHASE_3_HANDOFF.md` for the full seam list, credentials location, and test accounts.
