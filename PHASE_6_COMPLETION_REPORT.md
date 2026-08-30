# Madli — Phase 6 Completion Report

Filters, onboarding, results & plans fixes.

## §1 — Real place coordinates + a single haversine function

14 of the 17 seeded places already had real, geocoded `lat`/`lng`/`google_place_id` from an earlier
phase. Exactly 3 did not: **Mehfil**, **AutoLounge Rooftop**, **HICC Novotel Lawns**.

Treatment decided per place from its own fixture data, not guessed at:

- **Mehfil** (`restaurants/mehfil`) — its own `reason` field says outright: "[fixture placeholder —
  source gives only the catalogue-row summary] ... seeded specifically to exercise the
  below-threshold 'not enough evidence' path." A deliberate test fixture, not a real business.
  Given a plausible point inside its stated neighbourhood, Alwal (`17.503, 78.508` — near, not
  exactly on, the area's own centroid).
- **AutoLounge Rooftop** (`places/prabhat-nightlife`) — a generic invented name with flavour-text
  history ("opened in 2021 in a converted terrace..."), zero locals/visitors/gapTone. Another
  placeholder. Its address ("Financial District, Gachibowli") is a real sub-locality, so it's placed
  plausibly within that real area (`17.4174, 78.3416`).
- **HICC Novotel Lawns** (`places/hicc-live`) — HICC (the Hyderabad International Convention
  Centre) is a real, well-known, publicly documented venue in Madhapur/HITEC City. Given its real
  coordinates (`17.4351, 78.3803`), not approximated, per the instruction not to fabricate precision
  for a real business.
- **Deccan Grill House** (the 18th, `isActive: false` fixture used only for admin-mock display rows)
  is deliberately left without coordinates — it's never reachable through nearby-search, plan
  anchors, or bridge-tap distance features, so it doesn't need one the way the other 17 do. Stated
  here explicitly rather than left as a silent gap.

Migration: `supabase/migrations/20260830170000_backfill_place_coordinates.sql`, applied to the live
project. `src/fixtures/places.ts` updated to match.

**Haversine:** the existing `haversineMeters` (`src/lib/searchState.tsx`) is the one canonical
implementation, already used app-wide (BridgeTapScreen, Home's nearest-gem, MapScreen,
PlaceDetailScreen). §7 and §9 both reuse it — no second implementation was written.

Mehfil having real coordinates now moved it off the one place that demonstrated the "no
coordinates" map-placeholder fallback UI; that test (and its e2e counterpart) now targets Deccan
Grill House instead, the one fixture that still has none.

## §2 — Bug: search returns nothing

**Reproduced first**, then fixed. `SearchEntryScreen`'s `<SearchField onSubmit>` received the typed
query as an argument (`SearchField` already passes it: `onSubmit?.(value)`) but the screen's handler
ignored it entirely — `onSubmit={() => navigate(resultsPath)}` — and navigated to whatever generic,
filter-driven results screen was already in `search` state. Confirmed by temporarily reverting the
fix and running the new regression test against the old code: submitting "Mehfil" landed on
`/results/eat` with zero reference to the query anywhere.

**Root cause, precisely:** the query was discarded, not merely mishandled — nothing about
case-sensitivity or partial-match logic existed at all, because no search logic existed at all.

**Which table/view, decided and documented:** search is a direct, navigational name lookup, not a
discovery recommendation — so it queries the full local catalogue (`places`, mirrored client-side
in `src/fixtures/places.ts`, the same array every other screen already reads places from — not a
new Supabase round trip), not the above-threshold `published_picks` set. A below-threshold place
(Mehfil, seeded exactly to exercise that path) must still be directly findable by typing its name.
Inactive fixtures (Deccan Grill House) are excluded from search results — admin-mock-only, never
meant to be reached by a person searching.

**Fix:** `searchPlacesByName(query)` (`src/fixtures/places.ts`) — case-insensitive partial match on
`name`, active places only. `SearchEntryScreen` now shows real matches (click one → straight to that
place) or a real "No matches" empty state — never a silent redirect to unrelated generic results.

**Tests:** `SearchEntryScreen.test.tsx` — exact/case-insensitive/partial match against the real
seeded "Mehfil", clicking a match opens that exact place, and a non-matching query shows the empty
state rather than redirecting.

## §3 — Category-specific intake/filters

Checked the actual design handoff (`design_handoff_madli/prototype/Madli Prototype.dc.html` and its
`README.md`), not just the current code, before changing anything:

- **S16 (Filters) already correctly branches by door**, in both the handoff and this codebase: Vibe
  options differ (`EAT_VIBE_OPTIONS`/`EXPLORE_VIBE_OPTIONS`), Kitchen is Eat-only, Area type is
  Explore-only (absent, not disabled), and the wait-care switch label differs by door. Nothing to
  fix here — added `FiltersScreen.test.tsx` to lock this in with real, run assertions instead of
  leaving it verified only by reading the code.
- **S15 (Intake)'s Who/Occasion questions are door-agnostic in the design handoff itself** — its own
  state builder (`whoChips`/`occChips` in the prototype source) never branches on door, and neither
  the prototype's own S15 notes nor the README's S15 entry mention category-specific intake
  questions anywhere. This codebase already matches that faithfully.

**Flagged, not guessed:** some Occasion chips ("Work lunch", "Late-night") read oddly for the
Explore door — visiting a fort "for a work lunch" doesn't parse. Branching those would mean
inventing copy/options beyond what the handoff specifies, which conflicts with the handoff's own
ground rule that prototype copy is final and not to be rewritten (`design_handoff_madli/CLAUDE.md`).
This is a real, open product question, not something to resolve by guessing which door a new chip
belongs to.

## §4 — "Edit filters" now surfaces both intake and filter answers

The catch-all "Edit filters" tag on results opened only `/filters` (S16) — Vibe/Budget/Kitchen/
Distance/Area type/switches — never S15's own answers (who/occasion/hard constraint). Reaching
those required clicking that one field's already-applied chip, which routed to `/intake` instead —
two disconnected edit paths, and no way in at all for a field that had never been set.

**Fix:** `FiltersScreen` now also renders Who/Occasion/Hard-constraint as editable groups, reusing
the same options and toggle-to-deselect behaviour as `IntakeScreen`, making it the one combined
surface for everything shown as an applied-filter chip. `AppliedFilterChips`' per-field chips for
who/occasion/time-window/drive-preset/budgetCap now all route to `/filters` too, instead of a mix
of `/filters` and `/intake`. `IntakeScreen` itself is untouched — still the first-time onboarding
step. "Reset" in `FiltersScreen` still only resets the S16 filter fields (`FILTER_DEFAULTS`),
matching its existing, deliberate scope from the account-filter-persistence work (Phase 5 §5) — not
extended to intake answers, since resetting "who this is for" as a side effect of clearing filters
would be a real surprise.

**Tests:** both groups render together; picking an intake answer here writes to the same search
state results already reads; a real applied "who" chip and the catch-all "Edit filters" tag land on
the exact same screen.

## §5 — "Skip for now" moved to the top of ranking onboarding

S29 has one reflowing layout (no separate mobile/desktop branches — confirmed in the design
handoff's own responsive table), so this applies at both breakpoints identically. "Skip for now"
used to sit below the entire nearby-places list (both Eat and Explore sections) — the literal
opposite of the screen's own doc comment claiming it was "reachable before answering anything at
all." It now renders directly under the intro copy, before the residency question and both door
sections, and is no longer duplicated at the bottom.

**Tests:** its DOM position relative to the places list (not just that the text exists somewhere),
that it isn't duplicated, and that clicking it leaves immediately without requiring a residency
answer or any rating.

## §6 — Results capped at 5, "None of these" removed, guest gating reconciled

`INITIAL_VISIBLE_PICKS` (3) / `MAX_VISIBLE_PICKS` (5) already existed and already were the real cap
— no change needed there. Two things didn't match the spec:

- **"None of these" removed everywhere** — the button, its handler, and the reject-list plumbing it
  was the only caller of (`ResultsScreen`'s `rejectedGoogleIds` state, `useDiscovery`'s second
  parameter, `buildDiscovery`'s `rejectedGooglePlaceIds` filter). "Show me two more" never used that
  plumbing — it only ever reveals more of the same stable, sorted pool — so removing it changes no
  visible behaviour for that action.
- **"Show me two more" now disables instead of disappearing** once nothing more can be shown (the
  5-pick cap, or a genuinely exhausted pool) — it always renders now.

**Guest-gating interpretation, stated plainly (this was pre-decided by the task, not a judgment call
made here):** a Guest's first tap on "Show me two more" still shows the sign-up prompt immediately,
exactly as before this change — that gate fires whether or not more picks actually exist behind it,
unrelated to the pick cap itself.

**Tests:** no "None of these" anywhere; the 3-of-N initial cap; "Show me two more" revealing up to 5
then disabling — never hiding; a pool with only 3 available starting already disabled; guest-gating
coverage carried over for "Show me two more."

## §7 — Bridge tap: Eat/Explore selector + a real reference point

Two Eat/Explore Tabs let a person override the auto-computed default door (still the opposite of
the anchor's own type) instead of being locked to it.

The nearby search's centre point — and everything measured from it (drive labels, the map's second
marker) — is no longer always the place first tapped into. **Interpretation stated plainly, as the
task asked (this was pre-decided, not guessed):** priority is (1) the most recently added stop in
the plan/outing being built, (2) the plan's own anchor location — read here as its "first stop",
since a Plan's `anchor_lat`/`anchor_lng` fields are literally the outing's starting point, just
stored separately from `plan_items` because that is how the schema records it, not because it isn't
conceptually the first stop — and (3) the user's current location, wired in for completeness even
though it is not reachable in this screen today (`anchor` is always resolved, with a real location,
before this code ever runs; the screen shows an empty state otherwise).

Guest outings (local, `outingPlans.ts`) and signed-in Users' real Plans both feed this the same way:
the last stop by insertion/position order if it has coordinates, else the anchor.

**Tests:** the default-door auto-selection; overriding it re-searches the other door; a Guest
outing and a signed-in User's Plan both search from their most-recently-added stop, not the
original anchor.

## §8 — Bug: "Add another stop" — reproduced, and the real bug was narrower than the leading hypothesis

Reproduced first, per the task's own instruction — and what actually broke was **not** what the
leading hypothesis (before this session touched it) predicted.

**What it isn't:** `SavedPlanDetailScreen`'s "Add another stop" navigates to
`/places/<anchorKey>/bridge` using the plan's raw `anchor_key`. When that key is a real Google place
id, `BridgeTapScreen` already resolves it correctly — `placeBySlug` can't match a bare id, but the
existing fallback re-fetches that same id directly from Google, and `existingPlan` matches on it.
**A new test proves this already worked before this session's change** — `addPlanItem` was called,
never `createPlan`. No duplicate plan.

**What it actually is:** when a plan's anchor is a catalogue place with **no** Google place id
(Mehfil, AutoLounge Rooftop, HICC Novotel Lawns — the three from §1), `anchor_key` is that place's
own catalogue UUID. `placeBySlug` can't match a UUID against any slug, and a UUID isn't a valid
Google place id either — so the Google fallback fails too, and `anchor` never resolves at all. The
screen dead-ends on "Can't place this spot yet" instead of letting the person add anything, to any
plan. Confirmed by a failing test against the pre-fix code.

**Fix:** fall back to `placeById(decoded)` alongside `placeBySlug(decoded)` when resolving the
catalogue anchor. A plan's own `anchor_key` already carries exactly the identifier needed (either a
slug-resolvable Google id or a catalogue place's own id), so this one-line fallback closes both
cases through the existing catalogue lookup rather than adding a new resolution path.

**Tests:** the Google-place-id case (already correct — `addPlanItem`, never `createPlan`) and the
catalogue-id case (failed with the empty state before the fix; now also appends via `addPlanItem`
to the one existing plan). Backend atomicity/idempotency of appending a stop
(`fn_add_plan_item`, the unique `(plan_id, google_place_id)`/`(user_id, anchor_key)` constraints)
was already verified at the SQL/RLS level in Phase 5 — this session's bug and fix are specifically
in the frontend's anchor-resolution, so that is where the new tests are targeted.

## §9 — Shortest-route display ordering for 3+ stop plans

New `optimalStopOrder` (`src/lib/routeOrder.ts`): an exact, brute-force search over stop
permutations (branch-and-bound pruned against the best complete route found so far), reusing
`haversineMeters` from §1 rather than a second distance function. Verified against configurations
where the optimal order is obvious by hand (stops laid out along one line, so nearest-first is
trivially shortest) — a 3-stop and a deliberately-zigzagged 4-stop case.

Wired into `SavedPlanDetailScreen`: the stop list, map markers, and "Open route in Google Maps" now
show/use the shortest visiting order once a plan has 3+ stops with real coordinates and the anchor
has coordinates too.

**Treated exactly as the task specified, stated plainly:** this is a *display*-order computation
only. `orderedOutingStops` never writes anything back — it recomputes fresh from the plan's current
stop set on every render, and the stored order (`plan_items.position`, or a Guest Outing's
insertion order) is left completely untouched. A 1- or 2-stop plan, or one missing anchor
coordinates, renders exactly as stored — unchanged from before this section. A caption ("Ordered
for the shortest route from X — not the order you added them") appears whenever reordering actually
ran, so "Stop 1" not being the first place added doesn't read as a bug.

**Tests:** the pure function against known configurations (`routeOrder.test.ts`); the screen
against a known 4-stop zigzag (renders nearest-first, with the caption) and a 2-stop plan (renders
exactly as stored, no caption).

## Testing — run for real, not assumed

Every section above was verified by actually reproducing the reported behaviour (old code failing
the new test, or a temporarily-reverted fix failing it) before calling it fixed, per the task's
explicit instruction. Full suite, run together at the end of this work:

- `npx vitest run --config vitest.frontend.config.ts`: **28 files, 177 tests, all passing.**
- `npx playwright test e2e/guest-flow-clickthrough.spec.ts e2e/phase5-flow.spec.ts`: **8/8 passing.**
  (`e2e/shared-plan.spec.ts` needs a live Supabase connection this sandbox's network policy blocks —
  unaffected by inspection: it only ever builds a 1-stop plan, below §9's 3-stop reordering
  threshold.)
- `npx tsc --noEmit -p tsconfig.app.json`: clean.
- `npm run build`: succeeds.
- `npx eslint .`: no new errors or warnings from this session's changes. Two pre-existing lint
  *errors* (`GoogleMapView.tsx`'s ref-during-render, `PlaceDetailScreen.tsx`'s setState-in-effect)
  and a handful of pre-existing fast-refresh warnings predate this session (confirmed via `git log`/
  `git show` against commits before this work started) — out of scope for this task, left as found
  rather than silently fixed or silently ignored.

## Definition of done

- [x] §1 Real place coordinates added; one haversine function reused throughout.
- [x] §2 Search-returns-nothing bug reproduced, root-caused, fixed, regression-tested.
- [x] §3 Category-specific intake/filters verified against the actual design handoff; S16 already
      correct; S15's door-agnostic design confirmed intentional; one genuine ambiguity flagged.
- [x] §4 "Edit filters" is one combined entry point for intake + filter answers.
- [x] §5 "Skip for now" moved to the top of ranking onboarding, both breakpoints.
- [x] §6 Results capped at 5; "None of these" removed everywhere; "Show me two more" disables
      rather than hides; guest-gating interpretation stated plainly.
- [x] §7 Bridge tap has an Eat/Explore selector; reference-point priority implemented and stated
      plainly.
- [x] §8 "Add another stop" bug reproduced (found narrower than hypothesized) and fixed.
- [x] §9 Shortest-route display ordering for 3+ stop plans; stored order left untouched.
- [x] §10 Regression tests for every section above, all run for real, all passing.

## What is left ambiguous, not guessed at

Whether S15's Occasion chips ("Work lunch", "Late-night") should ever diverge by door for the
Explore door, where they read oddly. The literal design handoff says no (door-agnostic by its own
construction); a stronger product argument says maybe. Genuinely undecided — a real follow-up
question for whoever owns the design, not something resolved here by inventing new copy.
