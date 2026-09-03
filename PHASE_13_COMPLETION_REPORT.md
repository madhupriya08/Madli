# Madli — Phase 13 Completion Report

Nine more fixes from live testing, plus a UI motion pass. Code comments for this round are tagged
`P13 §n`.

---

## §1 — "Any distance" looked disabled

It wasn't — clicking it always worked (covered by existing tests). The visual problem was real
though: unselected chips share one flat grey `surface-sunken` background, and "Any distance" is
the group's actual current answer whenever nothing else is picked, so a flat grey pill next to
every other filled-teal choice on the panel read as inert.

`Tag` gets a new `tone` prop — `'solid'` (unchanged, a real choice made) or `'outline'` (a soft
tinted highlight: `teal-50` background, `teal-700` text, no fill). "Any distance" uses `outline`
whenever it's the active answer, so it visibly reads as "this is picked, tap another to change it"
without looking like a hard requirement — the outcome Phase 12 §3 originally wanted. Also fixed
in passing: `Tag` and `Card` were mixing the `border` shorthand with a conditional `borderColor`
override in the same style object, which is exactly what triggers React's "don't mix shorthand and
non-shorthand properties" warning — split into `borderWidth`/`borderStyle`/`borderColor` in both.

## §2 — Bigger cards on the ranking-onboarding screen

The "places to eat/explore" rows on `RankingOnboardingScreen` were single-column, text-only strips
— half the visual weight of a real `PickCard` for the same kind of decision. They're a 2-up
(desktop) photo grid now, with the same visual weight as everywhere else in the app someone rates
a place.

## §3/§4 — A "Home" shortcut on the area page, and no redundant residency ask

- `PickAreaScreen` gets a one-tap **Home — \<area name\>** button, the same weight as "Use my
  current location," whenever the signed-in person has already marked a home area (via the
  existing per-row "Home" switch). Absent when nothing is marked home, and absent for Guests (who
  have no home area to jump to). A home outside the seeded eight only ever had its *label*
  persisted (`home_area_text`, no coordinates) — the button re-resolves real coordinates for it via
  the same live-search path picking it from the list already uses.
- Choosing your own marked home area — via this new button, from the list, or by GPS landing on it
  — already answers "do you live here." All three paths now skip `/local-or-visitor` and write
  `resident_status = 'local'` directly in the background (best-effort; a failure doesn't block
  navigation, since this is an inferred answer, not one the person stopped to confirm).

## §5 — Tapping a place or its photo on Bridge Tap opens its detail page

Only the separate "Details" button did that before. The photo and the name/reason block are their
own click targets now (each a `<button>` wrapping that section), landing on the same place detail
page "Details" already did; "Details" itself is unchanged.

## §6 — "Re-rank by comparing" was showing an unrelated, hardcoded place

The button called `navigate('/log-visit')` with **no place named** — `LogVisitTriggerScreen` had a
fallback (`places.find(p => p.isActive)`, the first active catalogue fixture) for exactly that
case, so every click opened the same arbitrary, unrelated place regardless of what was actually on
the list. Two problems, fixed together:

- **The fallback is gone.** `LogVisitTriggerScreen` now shows "Nothing to log" when reached with no
  `placeId` in navigation state — the same "a direct visit with no state is a dead link, not a
  demo" rule `PostVisitNudgeScreen` already states. Every real caller (Bookmarks' "mark as
  visited," a place's own "I've been here," the post-visit nudge) already passes a real placeId;
  nothing depended on the fallback except the broken button itself.
- **Re-ranking is a per-row action now**, for both kinds of ranked place. A Google-sourced row
  opens the same Rank-this-place card `RankGooglePlaceForm` already gives everywhere else (unchanged
  from Phase 12 §9). A catalogue row opens the real pairwise comparison flow (S25–S27) on that
  exact place — which needed a real capability that didn't exist: `fn_log_ranked_visit` used to
  outright refuse a place already ranked ("use an update path instead" — no such path existed).
  New migration `20260904100000_rerank_catalogue_visit.sql` gives it the same re-rank treatment
  `fn_rank_google_place` already had (Phase 12): remove the existing row, close the position gap,
  then re-insert via the normal comparison logic. `useComparisonTargets` takes a new
  `excludePlaceId` so a re-rank is never offered as a comparison against its own still-live entry.
  The empty-state's "Log a visit" action had the identical bug (same broken `/log-visit` call with
  no place); it now goes to Search, the one place a real place can always be found.

## §7 — Ranked places now group by more than just Eat/Explore

A Google-sourced ranking only ever rendered as one flat door column. New `subtypeFor`
(`src/data/rankedSubtypes.ts`) reads the place's own Google `types` — already stored per ranking —
and buckets it into a real category: Bakeries, Cafes, Bars & pubs, Quick bites, Breakfast spots
(Eat); Temples & worship, Museums & galleries, Parks & lakes, Concerts & shows, Nightlife (Explore);
falling back to Restaurants / Landmarks & sights. `MyRankedListScreen` now renders one column per
(door, subtype) combination that actually has something ranked in it — "Eat · Cafes" next to
"Eat · Bars & pubs" rather than one "Eat" column holding both. The catalogue side is untouched: it
already groups by its own real categories.

## §8 — "Why this one" duplicated on every place detail page

Found the actual cause: `ReasonNote` renders its own eyebrow label internally (default "Why this
one"), and `PlaceDetailScreen` wrapped it in a *second*, separate `eyebrow()` heading right above
it on both the catalogue and Google-sourced branches — "Why this is a gem" (or "Why this one")
stacked directly on top of ReasonNote's own "Why this one". Fixed by passing the label into
`ReasonNote` itself instead of duplicating it beside it. In the same pass, the bridge-teaser button
on this screen ("The three closest places...") still had Phase 12 §4's retired "closest" language
after `BridgeTapScreen`'s own headline was reworded to match its actual (quality-first, not
distance-first) sort — synced both to "Three places worth stopping at/eating at after this."

## §9 — A real motion layer, applied broadly rather than per-screen

New `public/design-system/tokens/interactions.css`, layered on top of `motion.css`'s existing
tokens/timings (not replacing its "fast and quiet" baseline for state changes — this adds the
other half: felt motion on hover, scroll, and entrance). Utility classes: `madli-hover-lift`,
`madli-hover-zoom`, `madli-press`, `madli-page-enter`, `madli-stagger`, `madli-shimmer`,
`madli-scale-in`, `madli-sheet-in` — every one skipped outright under `prefers-reduced-motion`.

Applied at the layers that reach the most screens at once, rather than one animation per screen:

- `AppShell`/`MarketingShell`/`AdminShell`'s own `<main>` gets `madli-page-enter` — every route
  gets a real entrance for free.
- `Card`, `PickCard`, and any interactive `PhotoFrame` get hover-lift/zoom; `Button`, `Tag`,
  `IconButton` get a real press/hover settle; `Tabs`' active pill settles into place; `Dialog`
  panels scale or slide in depending on modal/sheet; `Skeleton` gets a travelling shimmer sweep
  layered under its existing opacity breath.
- Result grids (discovery results, bridge-tap nearby stops, Home's two door cards, My ranked
  list's desktop columns) get `madli-stagger` so cards arrive in a light cascade instead of all at
  once.

---

## Verification

- `npx tsc -b --noEmit` — clean.
- `npx eslint .` — 0 errors (33 pre-existing warnings, unchanged).
- `npm run test:frontend` — 37 files, 306 tests, all passing (27 new this round).
- `npm run build` — succeeds; confirmed `interactions.css` reaches `dist/`.
- The new migration is SQL only — not runnable against a live database from this environment
  (`npm test`, the Supabase integration suite, needs real credentials this session doesn't have).
  It must be applied to the Supabase project for catalogue re-ranking to work; until then, a
  catalogue "Re-rank" click will surface the old Postgres refusal message via the existing toast
  rather than silently failing.
