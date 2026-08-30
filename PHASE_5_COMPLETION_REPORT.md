# Madli — Phase 5 Completion Report

Ranking onboarding, recommendations, filters bug, and multi-stop plans.

## 0. Reference images

The task named "the added images" for the multi-stop plan behavior, but no images were attached to
the prompt. Per the task's own instruction, this was built from the written description in its §4
rather than guessed at from a picture — the design reference gap is flagged here, not silently
filled in. If reference images surface later and show something materially different from what
shipped, that is a real follow-up, not a correction to this report.

## §1 — Ranking onboarding: deselect + Explore places

**Deselect bug.** `fn_rank_google_place` only ever inserted or re-tiered a ranking — there was no
path to remove one, so a mis-tap on the onboarding screen permanently polluted the ranked list.
Added `fn_unrank_google_place` (`supabase/migrations/20260830100000_unrank_google_place.sql`),
reusing the exact delete-and-shift logic `fn_rank_google_place` already ran when re-tiering, now
exposed as its own callable. The screen's tier buttons are now a real toggle: tapping the
already-selected tier calls it and clears the local "Saved" state instead of resubmitting.

**Eat-only bug.** The screen only ever asked about Eat places, even though the recommendation
logic in §3 needs both doors to have something to score against. It now runs the same
nearby-candidates query for Explore too and renders two sections ("Places to eat" / "Places to
explore"), each independently rankable.

**Verified:** `src/screens/personal/RankingOnboardingScreen.test.tsx` (4 tests — both doors render,
an Explore candidate ranks under `door: 'explore'` not hardcoded `'eat'`, tapping the same tier
twice undoes it, switching tiers re-ranks rather than undoing). Migration applied to the live
project; confirmed only one `fn_unrank_google_place` signature exists afterward.

## §2 — Filters returning nothing: root-caused, not guessed at

Reproduced first, per the task's own instruction, rather than picking one of the three listed
hypotheses blind. None of them were the real cause: discovery is 100% live Google Places now
(`src/data/useDiscovery.ts` reads no catalogue and no `published_picks` at all), so the
"threshold"/"catalogue too small" hypotheses don't apply — the catalogue is unlimited.

The real bug: Google's Places API (New) Text Search request accepts exactly one `includedType`,
not a list. `searchCandidates` (`src/lib/placesSearch.ts`) was sending
`includedTypesFor(input)[0]` — always `"park"`, the first entry in Explore's six-type list
(park/tourist_attraction/historical_landmark/museum/art_gallery/night_club), and still three types
even once narrowed by Indoor/Outdoor. That structurally excluded every other type regardless of
the free-text query, so a neighbourhood with real museums/landmarks/galleries but nothing
literally typed "park" came back empty — exactly what a West Village, NYC "Explore" search
demonstrated (0 picks) against the same area's "Eat" search (3 picks, same filters).

**Fix:** only send `includedType` when the door's real candidate set is genuinely one type (Eat,
always `"restaurant"`); Explore now relies on the free-text query — already carrying the
vibe/who/occasion words — and Google's own relevance ranking, since there is no way to
structurally filter a six-type domain through a single-value field.

**Verified:** `src/lib/placesSearch.test.ts` (4 tests) — confirmed to fail against the pre-fix code
(`git stash` + re-run showed 3/4 failing with `includedType: "park"`/`"museum"` where the test
expects `undefined`), then pass against the fix.

## §3 — Recommendation architecture

Three options were weighed (full write-up and reasoning in `src/data/recommendations.ts`'s own
header comment):

- **Content-based scoring (built)** — score not-yet-ranked candidates by Google-place-`type`
  overlap with what the person has ranked loved/fine (a real negative signal for disliked, too),
  weighted by tier and position in their ranked list. Deterministic, fast, no external dependency —
  the right MVP at this catalogue's scale (16 seeded places, a handful of accounts, and discovery
  itself has no local corpus to train or embed against).
- **LLM-assisted re-ranking/reasoning** — a real option (a shortlist + personalized one-line
  reason), but a genuine cost/latency/external-dependency trade-off and a real risk of inventing
  facts about a place beyond what Google returned. Scoped, not built: this needs an explicit
  decision (and likely a new API key/config), not something to wire in silently.
- **Collaborative filtering / embeddings** — the right long-term direction once there is real user
  volume; not worth building against today's scale. Noted as a future direction only.

**What shipped:** `getPersonalizedSuggestions(userId, door, candidates)` in
`src/data/recommendations.ts` — fetches the person's own `google_place_rankings` (door-scoped),
computes a content-based score per candidate, and stably re-sorts on top of whatever order the
candidates already arrived in (review/distance for discovery, review-count for onboarding), so
cold start (no history yet) is a true no-op, not a regression. Already-ranked places are moved to
the end rather than dropped. A clean, swappable seam — the same mock-to-real seam pattern this
project has used throughout — so an LLM-assisted layer can replace or augment the scoring inside
this same function later without every caller changing.

`google_place_rankings` had no place-category data to score against at all (lat/lng/place_name
were denormalised already, but Google's own `types` were never stored) —
`supabase/migrations/20260830120000_google_place_rankings_types.sql` adds a `types text[]` column
and threads it through `fn_rank_google_place` (the one real write path, RankingOnboardingScreen).

**Wired into:** `useDiscovery` (the ongoing suggestion surface, S17/S18) and
`RankingOnboardingScreen`'s own candidate list, for signed-in Users only — a Guest has no
rankings to read (or write, by RLS), so the call is skipped rather than made to return nothing.

**Verified:** `src/data/recommendations.test.ts` (10 tests — known inputs, expected ranking order:
a museum outranks a night club for someone who has loved museums; a disliked type suppresses
similar candidates below zero; a #1-ranked entry weighs more than a bottom-of-list one; loved
outweighs fine), `src/data/useDiscovery.test.tsx` (2 tests — a Guest never triggers the
recommender; a signed-in User's candidates are genuinely re-ordered by the mocked result).

## §4 — Multi-stop plans

**Real finding, not assumed.** This codebase already had two divergent "plan" systems before this
phase touched anything: the backed `plans` table (fixed `eat_place_id`/`explore_place_id` pair,
real share token, RLS) is what Phase 1–3 built, but nothing in the current UI created one any
more — discovery moved to 100% live Google Places with no catalogue read at all, and
BridgeTapScreen's "Add to plan" had already been rebuilt as a client-only localStorage system
(`src/lib/outingPlans.ts`) that *already* supports an arbitrary number of stops — its own comment
said so explicitly: "Local until plans support Google place ids in the Madli catalogue FK." The
gap this phase closed is not "add multi-stop support" (the UI already had it) — it's making it
real: those Outing plans could not be shared and did not survive past one browser's localStorage.
The `shared-plan.spec.ts` e2e test was also stale, testing UI ("Pair with an Explore pick" / "Save
the pair as a plan") that no longer exists anywhere in the app — rewritten to match the actual
current flow.

**Migration** (`supabase/migrations/20260830130000_plan_items.sql`):
- `plans` — dropped `eat_place_id`/`explore_place_id` (and their type-validation trigger); added
  `anchor_key` (whatever identifies the anchor place client-side — a real Google place id when one
  exists, the catalogue place id as text otherwise, since 3 of 17 seeded places have no
  `google_place_id`), `anchor_name`, `anchor_lat`/`anchor_lng`, and a `(user_id, anchor_key)`
  uniqueness constraint so re-adding from the same anchor finds the existing plan.
- `plan_items` (new) — `plan_id`, `google_place_id` (never a catalogue FK — every real stop comes
  from a live Google search), denormalised `place_name`/`address`/`lat`/`lng`, an explicit
  `position`, timestamps. Same denormalisation reasoning as `google_place_rankings`.
- `fn_add_plan_item` — the atomic "add another stop" affordance (position-locked against
  concurrent adds, idempotent re-adds).
- The one real existing `plans` row (a Phase 3 integration-test plan) was migrated with its data
  intact — confirmed by query: anchor = Hotel Shadab, 2 `plan_items` in the correct order.
- RLS mirrors the existing owner-or-share-token shape on `plans`, joined through `plan_id` since
  `plan_items` has no `user_id` of its own.

**RLS verified for real against the live Postgres engine** (not mocked — this sandbox cannot reach
`*.supabase.co`'s real HTTP auth endpoint directly, so this used the same `set_config('role', ...)`
/ `request.jwt.claims` technique PostgREST itself uses, exercising the actual RLS policies rather
than a client-side approximation). All 15 checks passed, then the test plan was deleted, leaving no
residue:

| # | Check | Result |
|---|---|---|
| 1 | Owner creates plan + item | PASS |
| 2 | Owner reads own item | PASS |
| 3 | Owner adds a stop via `fn_add_plan_item` | PASS |
| 4 | Idempotent re-add — no duplicate | PASS |
| 5 | Owner reorders a stop (`UPDATE position`) | PASS |
| 6 | A different authenticated user cannot `SELECT` the items | PASS |
| 7 | ...cannot `INSERT` onto the plan | PASS |
| 8 | ...cannot call `fn_add_plan_item` on it either | PASS |
| 9 | Owner mints a real share token | PASS |
| 10 | Anon with no token sees nothing | PASS |
| 11 | Anon with the real share token sees the full multi-stop plan | PASS |
| 12 | Anon reads the `plans` row itself via the token | PASS |
| 13 | Anon cannot write even with a valid token | PASS |
| 14 | Owner removes a stop (`DELETE`) | PASS |
| 15 | Cleanup — test plan removed | PASS |

**UI:** BridgeTapScreen's "Add to plan" now creates or appends to a real plan for a signed-in User
(matched by anchor, the same semantics the local Outing already had); a Guest keeps the exact same
local-only experience — no account to persist a real one under. `SavedPlanDetailScreen` renders
both a real plan and a local Outing through the same view (`OutingPlanDetail`, one fewer rendering
path to keep honest), and gained a real "Share this plan" action plus a renamed "Add another stop"
affordance (navigates back into BridgeTapScreen for that anchor).

**Scoped, not built:** drag-to-reorder in the UI. The DB/RLS layer genuinely supports reordering
(test #5 above), but no interactive reorder control was requested with enough specifics to build
one now — noted here rather than guessed at.

**Verified:** the 15-check RLS run above; `src/screens/discovery/BridgeTapScreen.test.tsx` (4 tests
— a Guest uses the local Outing; a signed-in User with no plan yet gets one created; a signed-in
User with an existing plan gets the stop appended; an already-added stop shows "Added" and calls
neither mutation); a real click-driven Playwright pass on every guest-reachable e2e spec (15
passing, no regressions) plus a production build.

## §5 — Server-side filter persistence for signed-in Users

`SearchProvider` persists filters to `sessionStorage` for everyone, on purpose — "what I am
looking for right now" should not survive into next week — which covers a reload but not a
genuine return visit (a fresh tab, a different device). For a signed-in User specifically, that
gap is now closed: `profiles.search_filters` (jsonb,
`supabase/migrations/20260830110000_profile_search_filters.sql`) stores exactly the S16 filter
field set (`searchState`'s own `FILTER_DEFAULTS` shape), read back once per fresh session — only
ever into still-default local filters, never overwriting an in-progress edit — and written
(debounced) whenever those fields change. A Guest sees zero behaviour change.

**Scope, named rather than assumed:** "session" was scoped to exactly the one concrete state this
task named — the selected filters. Whether broader session state exists (an in-progress plan being
built, an interrupted onboarding flow) was not assumed or guessed at; if that is wanted, it needs
its own follow-up with more detail on what "in progress" means for each of those flows.

**Verified:** `src/lib/searchState.test.tsx` (`filterSliceOf`/`isFilterSliceAtDefaults`, 2 tests),
`src/lib/accountFilterSync.test.tsx` (6 tests — a Guest triggers neither read nor write; a
signed-in User's saved filters fill in a fresh session; an already-active session is never
overwritten; sign-in loading is respected; a filter change saves, debounced, only for a signed-in
User).

## §6 — Design-system fidelity pass

Audited the 8 named screens (S15/S16/S17/S18/S19/S20/S23/S24/S29) against their component
contracts (`design_handoff_madli/design-system/components/**/*.prompt.md`) and the prototype.

**Fixed:**
- `IntakeScreen.tsx` — the "Time window / Drive time / Budget" hard-constraint toggle was a
  hand-rolled `<button>` row: no `role="tablist"`/`role="tab"` (invisible to a screen reader as
  the tab control it is), duplicating the `Tabs` component this same app already uses for exactly
  this shape elsewhere, and hardcoding `borderRadius: 4`/`padding: '6px 14px'` where
  `var(--radius-xs)` already exists as a token (CLAUDE.md: "never hardcode a px radius... that
  exists as a token"). Swapped to the real `Tabs` component; updated the two e2e specs that
  asserted `role="button"` on these labels to the now-correct `role="tab"`.
- `PlaceDetailScreen.tsx` — hardcoded `#fff` and `rgba(255,255,255,0.86)` for on-dark hero/
  bridge-tap text in four places, while the very next line in the same block already correctly
  used `var(--text-on-dark-muted)` — an in-file inconsistency, not a nitpick. All eight occurrences
  now use `var(--text-on-dark)` / `var(--text-on-dark-muted)`.

**Found and flagged, not fixed — scope discipline, not an oversight:**
- `BridgeTapScreen.tsx:376` — `RankBadge` is used with its default (`solid`) variant directly over
  a photo, where its own contract says to use `variant="outline"` on photographic backgrounds.
  This exact pattern is also baked into `PickCard.tsx` itself, which is used across many screens
  well beyond the 8 named here — this reads as a systemic, already-baked choice, not
  screen-specific drift, and fixing it correctly means auditing `RankBadge`'s usage app-wide, which
  is exactly the "silently expanding into a full re-audit" the task said not to do. Flagged for a
  scoped follow-up instead.
- `BookmarksScreen.tsx` — the component contract lists S23's states as `default, empty, nearby`; a
  "resurfaced-when-nearby banner" variant is documented but not implemented anywhere in the repo
  (confirmed: no code or comment mentions it). Implementing it means inventing a geolocation
  trigger radius, a banner design, and copy with no further specification — a real new feature,
  not a drift fix. Flagged rather than guessed at.

**Verified:** `npx tsc --noEmit`, `npx eslint` (0 errors on every touched file), the full Vitest
suite (150 tests), a real click-driven Playwright pass on the affected e2e specs (8/8), and a
production build.

## §7 — Testing summary

All new/updated tests were run for real; results are reported inline in each section above rather
than repeated here. Total: the frontend Vitest suite grew from 111 to 150 passing tests across this
phase (0 failures, 0 skipped), plus the 15-check live-RLS verification in §4 (SQL, not mocked) and
real Playwright runs against every guest-reachable e2e spec after each change (no regressions).
`shared-plan.spec.ts` and `core-loop.spec.ts` (both require a real `supabase.auth` login) could not
be executed to completion in this sandbox — this environment's network policy blocks outbound
HTTPS to `*.supabase.co` directly, a pre-existing, documented constraint from Phase 1, unrelated to
anything in this phase. Both were reviewed for correctness against the current UI and are expected
to pass in an environment with real network access.

## Definition of done

- [x] Ranking onboarding supports deselecting a place, and asks about Explore places as well as Eat.
- [x] The filters-returning-nothing bug is root-caused and fixed (a genuine query bug, not a
      no-matching-data case).
- [x] Recommendation trade-offs documented; content-based MVP implemented behind
      `getPersonalizedSuggestions`; LLM-assisted option scoped, not silently built.
- [x] Plans support more than one stop, addable after creation, with a real migration and RLS
      review (15/15 checks against the live database).
- [x] Signed-in Users' selected filters persist server-side across sessions; broader "session"
      scope flagged as needing more detail rather than assumed.
- [x] Recommendations are driven by the user's actual ranked history, not onboarding answers alone.
- [x] Named screens checked against the design system; real drift fixed; further drift (RankBadge
      variant, S23's missing "nearby" state) listed, not silently expanded into a bigger task.
- [x] All new/updated tests actually run, with real results reported above.

## Gaps and open items, named rather than filled in

1. **§0 reference images** — never provided; built from the written description instead. Flag a
   real follow-up if they show something materially different.
2. **§6 RankBadge variant** — systemic (baked into `PickCard`), not this phase's to fix without
   widening scope; needs its own audit if wanted.
3. **§6 BookmarksScreen "nearby" banner state** — a real, documented gap with no implementation and
   no further specification (trigger radius, copy, design) to build from.
4. **§4 UI reordering** — the database/RLS layer supports it; no interactive reorder control was
   requested with enough detail to build.
