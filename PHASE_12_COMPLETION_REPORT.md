# Madli — Phase 12 Completion Report

Ten fixes from live testing of the deployed build: filters panel, reset, distance, pick quality,
search-as-filter, saving a filter set, recent searches, a duplicated place-detail section, the
ranking flow, and notifications.

Code comments for this round are tagged `P12 §n`, matching the numbering below (`P10`/`P11` tags in
the codebase belong to earlier rounds and are untouched).

---

## §1 — The filters panel was a phone-width column on a desktop screen

`FiltersScreen`'s dialog was 420px wide with nine chip groups and nine switches inside it, so every
group wrapped onto three lines and the whole panel had to be scrolled twice to read once.

- Desktop modal is 900px, `maxHeight: 92vh`, with the groups in a real two-column grid. The hard
  constraint and the switch block span both columns (they read as one row of related answers).
- Mobile is untouched: `variant="sheet"` ignores `width` and stays a full-bleed one-column sheet,
  which is right at that size.

## §2 — Reset now resets the intake answers too

Since Phase 6 §4, this panel shows *and edits* the S15 intake answers (who / occasion / hard
constraint) alongside the S16 filters — but "Reset" called `resetFilters()`, which by definition
clears only the S16 half. Half the chips on screen stayed highlighted.

New `resetFiltersAndIntake()` in `searchState.tsx` clears both, and the button says **Reset all**.
Door, area text and resolved coordinates deliberately survive: those are *where you are*, not *what
you asked for*.

`FILTER_DEFAULTS` / `FilterSlice` are unchanged in meaning — they still define what an account
*remembers* between sessions, and the per-outing intake answers are not that. The new intake
defaults live in their own `INTAKE_DEFAULTS`.

## §3 — Distance is optional, and can be deselected

- Filters: each distance preset toggles. Tapping the chosen one clears it, exactly like every other
  single-select chip group on the panel (`oneOf`). "Any distance" stays an explicit clear and stays
  unhighlighted, so an untouched group never reads as a choice already made. The group is now
  labelled **Distance (optional)**.
- Intake: the hard-constraint chips already toggled off; that was undiscoverable, so the step says
  so — "Optional — tap a chip again to clear it, or skip this step entirely."

## §4 — Picks are the best places nearby, not the nearest three on one street

Two separate causes, both fixed:

- **Discovery** weighted distance at `0.12`/km against a review score that tops out near 18 —
  inside a typical 3km radius that is worth about a third of a rating point, enough for the merely
  closest place to keep beating the one people actually rate. Halved to `0.06`.
- **Both discovery and bridge-tap** then took the top three off a pure score (or, on bridge-tap, a
  pure distance) sort, which on a busy street is three doors of the same street. New
  `spreadOutPicks` walks the scored list, takes the best candidate from each distinct street and
  location cluster (150m ≈ one block) first, then appends whatever it passed over. **It is a
  reordering, never a filter** — a thin pool still fills the list and "Show me two more" still has
  something to show. It runs after personalisation too, since the affinity re-order can otherwise
  put one street back on top.
- **Bridge-tap** additionally drops anything within 200m of where the outing currently is (that is
  the same stop, not the next one) and orders by review score with distance as a real but secondary
  cost (`0.5`/km over its 12km radius ≈ up to 6 points against ~18). Its headline and lead line
  changed from "the three closest" to "three places worth …" — the copy was describing the old sort.

## §5 — A typed search is a filter, and lands on results

New `SearchState.queryText`, carried into the Places text query (first, as the most specific thing
the person said), keyed into `useDiscovery`'s query, and shown as a removable chip on results.

On the Search tab: **Show matching places** applies the text and opens the results screen; a typed
word that *is* one of the cuisine filters ("south indian", "bakery") is additionally offered as
that real structured filter, which narrows properly where free text only nudges relevance. The
existing behaviour is kept intact — matching a place by name still opens that place's own page
(Phase 6 §2), and the no-matches empty state now offers the results screen rather than dead-ending.

Opening a door from Home clears `queryText`: a fresh door pick is a fresh intent, not a
continuation of "biryani" from twenty minutes ago.

## §6 — "Save this set" does something

It was a bare `<button>` with no `onClick`. It writes the current filter set to the account
(`saveFilters`) and confirms in a popup naming how many filters were saved; a failure says so
plainly instead of claiming success. Still User-only — a Guest has no account to save to.

## §7 — The real last five searches

- The Search tab's "Recent" block was the hardcoded line "Jubilee Hills · Biryani and kebab". It
  now lists the person's real last five, each restoring that whole filter set and opening its own
  door's results.
- The results screen showed only *this door's* recents. The store holds five in total, so that
  routinely showed one or two. Both doors now; picking one from the other door switches to it
  rather than applying Explore filters to an Eat list.
- `listRecentSearches` caps at five on read as well as on write, so the "last 5" line cannot be
  made a lie by an older stored blob.
- A recent search's label leads with its query text, so three different cravings in one area no
  longer collapse into one identical chip.

## §8 — "Why this one" was printed twice on a place detail page

On a Google-sourced place, `pickReason()` returns the editorial summary when there is one — and the
"Google reviews" card below printed that same sentence again. It is now shown there only when it is
not already the reason.

## §9 — Ranking asks, then compares, then places

**The question.** Both ranking entry points now use the same card as the design's own
Rank-this-place prompt: "Rank this place" / "How was *X*?" / Loved it · It was fine · Didn't like it.

**The comparison.** `RankGooglePlaceForm` (the "I've been here" button, the post-visit nudge, and —
new — re-ranking from My ranked list) follows the tier question with "Which do you prefer?" against
the person's existing list *in the same category*, then a second, skippable comparison once there
are three or more. Category is Google `types` overlap, narrowed to the same tier, falling back to
the whole door when nothing shares a category (`pickGoogleComparisonTargets`). The catalogue path
already had this mechanic (S26) and is unchanged.

**The placement.** New migration `20260903100000_rank_google_place_compared.sql` extends
`fn_rank_google_place` with the two comparison pairs, mirroring `fn_log_ranked_visit`:

1. Tier still wins — loved above fine above disliked. A "fine" verdict cannot outrank a loved place
   on one head-to-head.
2. Inside the tier block, the comparisons decide the position, clamped into that block.
3. No comparison → the end of the tier block, exactly as before.

The client retries against the old signature if that migration is not applied yet (PostgREST
reports the missing overload as `PGRST202`): losing the refinement is a far smaller cost than losing
the ranking.

**On Home after login.** A signed-in person sees their own ranked places for the locality they are
in — matched by the area a place was ranked under *or* real distance (≤8km) from the current search
centre, since either test alone gets it wrong. Top three by their real position, disliked entries
excluded exactly as on S31, linking through to each place and to the whole list.

`RankedGooglePlace` now carries `location` (already stored, just never selected) — that is what
makes the distance half of the locality test possible.

## §10 — Product news removed from notifications

Gone. The two that remain are both about a place the person actually engaged with.

---

## Verification

- `npx tsc -b --noEmit` — clean.
- `npx eslint .` — 0 errors (33 pre-existing warnings, unchanged).
- `npm run test:frontend` — 35 files, 279 tests, all passing (16 of them new this round).
- `npm run build` — succeeds.
- `npm test` (the Supabase integration suite) still requires live credentials in `.env.local`; it
  is unrunnable in this environment and untouched by this round.
