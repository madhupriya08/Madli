# Handoff: Madli — full product design (52 screens)

## Overview

Madli is a locally-ranked food and travel app for Hyderabad. It hands you **three picks with a
reason** instead of a list, so you can decide in two minutes and trust the answer. The product
line is *3 picks. 1 reason. 2 minutes.*

The design's single organising promise: **the ranking is honest about what it knows and what it
does not.** Ranking gaps are printed, sample sizes are exact, and the reason next to a pick is
never crowded out. Every screen decision below serves that.

The design covers four roles — **Guest, User, Owner, Admin** — across 52 screens, all built and
wired in the prototype, at two breakpoints (mobile 390px, desktop 1280–1440px).

## User flow map

The four role journeys below are the fastest way to understand how the 52 screens connect —
read this before the screen-by-screen table. Arrows are real navigation; `[state]` marks a
branch. Full detail and edge cases are in the per-screen notes under **Screens**.

**Guest → User (first-time)**
`S6 splash → S7 home ("two doors") → [no location yet] S8 permission → [denied] S9 manual area
→ S15 intake → S16 filters → S17/S18 results → S19 place detail → S20 bridge tap → S21 map /
S22 share`
Anywhere in that loop, signing up branches to `S11 signup → S12 OTP → S29 ranking onboarding →
back into the loop, now as User`. Hitting the guest search cap or the second "None of these"
branches to the paywall intercept; saving a plan as a guest branches to `S28 save-your-list gate`.

**User — ranking loop (the two-tap budget)**
`S23 bookmarks → mark as visited → S25 trigger → S26 pairwise comparison → S27 landed position`.
`S30 post-visit nudge` (Yes) re-enters at S25. `S27 → S31 my ranked list` is the standing result.

**User — becoming an Owner**
`S32 profile → S33 settings → S34 claim a business → S37 claim request form → S38 claim status
[pending/verified/rejected] → S39 edit listing ⇄ S40 owner profile`.

**Admin (separate surface, S41 is the only shared door)**
`S41 admin login → S42 analytics dashboard`, then flat access (no forced order) to:
`S43 catalogue list ⇄ S44 add/edit`, `S45 bulk import`, `S46 ranking and trust` (feeds the S47
gem queue), `S48 claims queue` (resolves S37/S38 on the owner side), `S49 reports and
moderation`, `S50 roles/accounts/audit log`, `S51 location history access`.

**Marketing (unauthenticated, cream background, separate from the app shell)**
`S1 landing → S2 how it works → S3 gem of the town → S4 neighbourhood page → S5 legal`, with
S1/S2 both linking into the real `S7 home` app shell to start a search.

---

## About the design files

The files in `prototype/` are a **design reference created in HTML** — an interactive prototype
showing intended look and behaviour, not production code to copy directly. The task is to
**recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI,
native, whatever is in use) with its established patterns and libraries. If no environment exists
yet, choose one and implement there; see `CLAUDE.md` for the recommendation.

The exception is `design-system/` — the token CSS, fonts, logo assets and component contracts are
production-intended and should be carried across as-is.

### Opening the prototype

Open `prototype/Madli Prototype.dc.html` in any modern browser. No server, no build, no network.
Left rail controls:

- **Persona** — Guest / User / Owner / Admin. Screens change content and gating by persona.
- **Breakpoint** — Mobile (390px frame) / Desktop (1280 canvas).
- **State** — per-screen variants (loading, empty, error, denied, guest-capped, …).
- **All screens** — the full 52-screen tray, grouped, with each screen's states.
- **Specs / notes** — toggles the design-intent annotations quoted throughout this README.
- **Step back / prev / next** — retrace the flow, or walk the catalogue in order.

Session state is real: the guest search counter increments, rejected picks stay rejected, and
logging a visit runs an actual binary insert against the seeded ranked list.

## Fidelity

**High-fidelity.** Final colours, typography, spacing, radii, shadows, motion, copy and
interaction states. Recreate the UI precisely using the token values below.

Two deliberate exceptions, both to be replaced with real material:
- **Photography** — every image slot is a `PhotoFrame` placeholder naming what belongs there.
- **Maps** — map surfaces are labelled abstract panels with markers and a dashed route. No real
  geography is drawn. Replace with the real map SDK at implementation time; the surrounding
  layout, the per-leg travel times and the "Open in Google Maps" handoff are specified.

---

## Bundle contents

```
design_handoff_madli/
├── CLAUDE.md                     ← start here
├── README.md                     ← this file
├── prototype/
│   ├── Madli Prototype.dc.html   ← the interactive prototype (open in a browser)
│   ├── support.js                ← runtime the prototype needs; not production code
│   ├── _ds/…                     ← the design system as the prototype loads it
│   └── assets/                   ← logo + display font used by the prototype
└── design-system/
    ├── readme.md                 ← the design system guide (voice, colour, type, motion rules)
    ├── SKILL.md                  ← condensed agent-readable entry point
    ├── styles.css                ← the single file a consumer links; @imports all tokens
    ├── tokens/                   ← colors, typography, spacing, shape, motion, fonts, base
    ├── components/               ← 28 React primitives: .jsx + .d.ts + .prompt.md each
    ├── guidelines/               ← 22 foundation specimen cards (visual reference, HTML)
    ├── ui_kits/                  ← reference builds: phone app (5 screens), marketing site
    ├── assets/fonts/             ← Cooper BT Black Headline (woff2/woff/ttf), Inter variable
    ├── assets/logo-*.png         ← full lockup, mark, wordmark, tagline (+ transparent cuts)
    ├── _ds_bundle.js             ← prebuilt browser bundle of all components
    └── _ds_manifest.json         ← machine-readable component/token index
```

---

## Design tokens

All values are CSS custom properties. **Copy `tokens/` verbatim into the app.** Full source is in
`design-system/tokens/`; the critical values are reproduced here so this README stands alone.

### Colour

Deep Teal is the working colour: bars, primary buttons, rank #1, focus rings. Coral is scarce on
purpose — **one coral element per view**, either the single call to action or a "local gem"
marker. Sky Blue supports (rank #2, info) and never becomes an action.

| Token | Value | Use |
|---|---|---|
| `--teal-500` | `#0F766E` | **Primary.** Bars, primary buttons, rank #1, focus |
| `--teal-600` / `--teal-700` | `#0C5F59` / `#0A4A45` | Primary hover / active |
| `--teal-800` | `#11444F` | Brand ink; display type; the one inverted block per page |
| `--teal-900` | `#0B2F36` | Scrim base |
| `--sky-300` | `#38BDF8` | Secondary; rank #2; info. Never an action |
| `--coral-400` | `#FF6B6B` | **Accent.** One per view, max |
| `--coral-500` / `--coral-600` | `#F15847` / `#D9422F` | Accent hover / active |
| `--emerald-500` | `#10B981` | Success; `--gap-clear` |
| `--amber-500` | `#F59E0B` | Caution; `--gap-close` (near-tie) |
| `--red-500` | `#E11D48` | Real failure only |
| `--brand-cream` | `#FAF4EF` | Brand paper: marketing, decks, print |
| `--slate-50` | `#F8FAFC` | Product background |
| `--slate-200` | `#E2E8F0` | Hairline border |
| `--slate-500` | `#64748B` | Muted text, `--evidence-text` |
| `--slate-900` | `#0F172A` | Heading text |

Ramps `--teal-50…900`, `--sky-50…500`, `--coral-50…600`, `--emerald-*`, `--amber-*`, `--red-*`,
`--slate-25…900` are all in `tokens/colors.css`.

**Two backgrounds and only two.** Cream `#FAF4EF` is brand paper (marketing site, S1–S5). Off-white
`#F8FAFC` is the product. Never mix them in one surface; a page picks one.

Semantic aliases (use these, not the ramps): `--bg-page`, `--bg-page-warm`, `--surface-card`,
`--surface-sunken`, `--surface-inverse`, `--text-display`, `--text-heading`, `--text-body`,
`--text-muted`, `--text-faint`, `--text-on-dark` (+`-muted`), `--text-link` (+`-hover`),
`--border-hairline`, `--border-strong`, `--border-focus`, `--border-on-dark`,
`--action-primary` (+`-hover`/`-active`), `--action-accent` (+`-hover`/`-active`),
`--action-ghost-hover`, `--action-disabled-bg`/`-text`.

Trust colours: `--rank-1` `--rank-2` `--rank-3`, `--gap-clear` `--gap-close` `--gap-thin`,
`--evidence-text`.

Status pairs: `--status-{success,warn,error,info}-{bg,fg}`.

Photo scrims — **never black**, always teal-tinted:
`--scrim-bottom: linear-gradient(to top, rgba(11,47,54,.86) 0%, rgba(11,47,54,.5) 38%, rgba(11,47,54,0) 78%)`
for stacked text; `--scrim-flat: rgba(11,47,54,.42)` for centred hero text.

### Typography

**Cooper BT Black Headline** for display, **Inter** Regular/SemiBold for everything else — never
the reverse, never a third family.

Families: `--font-display: "Cooper BT", "Cooper Black", Georgia, serif` ·
`--font-ui: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`.

Scale: `--text-2xs` 11 · `xs` 12 · `sm` 13 · `base` 15 · `md` 17 · `lg` 20 · `xl` 24 · `2xl` 30 ·
`3xl` 38 · `4xl` 48 · `5xl` 62 · `6xl` 80 (px).

Line heights: `tight` 1 · `display` 1.04 · `snug` 1.25 · `normal` 1.45 · `relaxed` 1.6.
Tracking: `display` -0.02em · `normal` 0 · `wide` 0.04em · `eyebrow` 0.16em.
Weights: `book` 400 · `demi` 600 · `black` 900.

Composed roles (use these as `font:` shorthand):

| Role | Composition |
|---|---|
| `--type-display` | 900 62/1.04 Cooper |
| `--type-h1` / `--type-h2` / `--type-h3` | 900 48/1.04 · 38/1.08 · 30/1.12 Cooper |
| `--type-h4` | 600 20/1.25 Inter |
| `--type-body-lg` / `--type-body` / `--type-body-sm` | 400 17/1.6 · 15/1.45 · 13/1.45 Inter |
| `--type-label` | 600 13/1.25 Inter |
| `--type-eyebrow` | 600 12/1.25 Inter, uppercase + 0.16em tracking |
| `--type-caption` | 400 12/1.45 Inter |
| `--type-evidence` | 400 11/1.45 Inter — the sample-size footnote; never smaller |

`--display-upright` is a single switch token for the display slant. See § Known gaps.
`--type-display-italic` / `--type-h2-italic` are for pull quotes and city names.

**Casing: sentence case everywhere** — headings, buttons, labels. The only uppercase is the
eyebrow style.

### Spacing and layout

Strict 4px grid: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `7` 32 · `8` 40 ·
`9` 48 · `10` 64 · `11` 80 · `12` 112 · `13` 160 (px).

| Token | Value |
|---|---|
| `--gutter-mobile` / `--gutter-desktop` | 20px / 40px |
| `--content-max` | 1160px |
| `--prose-max` | 66ch |
| `--reason-max` | **46ch — hard rule.** The "why" always sets in 2–3 lines |
| `--app-frame-width` | 390px |
| `--tap-target-min` | 44px |
| `--section-y-mobile` / `-desktop` | 48px / 112px |

Nothing is fixed to the viewport except the top bar and the bottom tab bar, both translucent.

### Shape and elevation

Radii: `xs` 4 · `sm` 6 · `md` 10 · `lg` **14 (default card)** · `xl` **20 (photo cards, sheets)** ·
`2xl` **28 (bottom sheets)** · `pill` 999 · `circle` 50%.
Pills are reserved for badges, avatars and `SearchField`. **Filter chips are 6px** so they never
read as badges.

Shadows are cool grey, low, never black:
`--shadow-xs` `0 1px 2px rgba(15,23,42,.05)` (buttons) ·
`--shadow-sm` `0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)` (cards) ·
`--shadow-md` `0 4px 12px rgba(15,23,42,.07), 0 1px 3px rgba(15,23,42,.04)` (hover, popovers) ·
`--shadow-lg` `0 12px 32px rgba(15,23,42,.1), 0 2px 6px rgba(15,23,42,.04)` (dialogs) ·
`--shadow-sheet` `0 -8px 32px rgba(11,47,54,.14)` (bottom sheets, upward) ·
`--shadow-focus` `0 0 0 3px rgba(15,118,110,.22)` · `--shadow-focus-coral` `0 0 0 3px rgba(255,107,107,.28)`.

Blur is used in exactly two places — the sticky top bar and the bottom tab bar:
`background: rgba(255,255,255,0.82)` + `backdrop-filter: saturate(150%) blur(12px)`
(`--bar-scrim`, `--blur-bar`). Nothing else is translucent. No frosted cards, no glassmorphism.

**Cards:** white, 1px `#E2E8F0` hairline, 14px radius, `--shadow-sm`. Hover steps the shadow to
`--shadow-md` and darkens the border to slate-300. **Nothing lifts or scales.** No accent-left-border
cards, no coloured card fills.

### Motion

`--dur-instant` 90ms (colour, press) · `--dur-fast` 140ms (hover, toggles) · `--dur-base` 200ms
(content entering) · `--dur-sheet` 260ms · `--dur-slow` 320ms (full-screen).

One curve: `--ease-standard: cubic-bezier(.2,0,.2,1)`. `--ease-out: cubic-bezier(.16,1,.3,1)` for
things entering only.

**No bounce, no spring, no stagger, no parallax.** Hover darkens fills one step — never opacity
fades, which look broken over photography. Press settles `translateY(1px)` and drops the shadow.
Skeletons breathe 100%→55% opacity over 1200ms (`@keyframes madli-skeleton`) rather than running a
sheen; a moving highlight implies work in progress and Madli's promise is that there isn't much.
`@keyframes madli-fade-up` (6px + fade) is the content-entering animation.
All durations collapse to 0 under `prefers-reduced-motion`.

---

## Components

28 primitives in `design-system/components/`, each with a `.d.ts` (props) and `.prompt.md`
(what/when + example). Port all of them before building screens.

**core** — `Button`, `IconButton`, `Icon`, `Badge`, `Tag`, `Card`, `PhotoFrame`, `Logo`
**forms** — `Input`, `SearchField`, `Select`, `Checkbox`, `Radio`, `Switch`
**trust** — `PickCard`, `RankBadge`, `RankGap`, `SampleSize`, `ReasonNote`
**navigation** — `TopBar`, `TabBar`, `Tabs`
**feedback** — `Skeleton`, `PickSkeleton`, `Dialog`, `Toast`, `Tooltip`, `EmptyState`

The five trust components are Madli-specific and carry the whole pitch:

- **`PickCard`** — the atomic unit: one ranked pick with its reason attached. Used identically on
  S17, S18 and the marketing site. One component, one code path.
- **`ReasonNote`** — the "why", capped at `--reason-max` (46ch) so it always sets in 2–3 lines.
- **`RankGap`** — the distance to the next pick, including near-ties (`--gap-close`, amber).
- **`SampleSize`** — the exact evidence line: "412 locals · 88 visitors · last 90 days".
- **`RankBadge`** — the numerals 1–3, and only 1–3.

### Iconography

**Lucide**, 2px stroke, rounded caps. Glyphs load per-icon:
`https://unpkg.com/lucide-static@0.475.0/icons/<name>.svg`. The `Icon` component applies each SVG
as a **CSS mask** with `background: currentColor`, so icons inherit text colour and can be tinted
with tokens. No inline SVG is hand-drawn anywhere.

Sizes: 14 inline · 17–18 in buttons and fields · 21 in the tab bar · 26 in empty states. Never
below 14. Icons are **never** the sole label for a primary action, and never decorate a heading.

Icons in use: `search`, `map-pin`, `map`, `navigation`, `footprints`, `clock`, `bookmark`,
`share-2`, `sliders-horizontal`, `chevron-down`, `chevron-right`, `arrow-left`, `arrow-right`,
`check`, `x`, `info`, `alert-circle`, `alert-triangle`, `sparkles`, `user`, `utensils`,
`refresh-cw`, `folder-plus`, `scale`, `list-ordered`, `map-pin-off`.

**Emoji are never used** — not as icons, not in UI, not in copy. Nor are unicode glyphs, except the
middot `·` as a meta separator and `₹` for price.

---

## Copy and voice

The copy in the prototype is final. Do not rewrite it when porting.

**Voice: a friend who knows the neighbourhood.** Direct, specific, a little insider-y. Never
salesy, never hedging, never apologetic twice. Address the reader as *you*; use *we* only for a
decision Madli made ("We stop at three on purpose").

**Numbers are always real** — "412 locals · 88 visitors · last 90 days", never "thousands of
reviews", never a star average without the count behind it.

**Empty and error states** say what is missing, then what to do, in one sentence each:
*"No ranking here yet. We need about 50 local ratings before we will call anything a pick."*

**Loading copy: none.** Skeletons carry the wait. Any sentence in a loading state makes two
minutes feel longer.

---

## Screens

52 screens, all built. Columns: **states** available in the prototype's state switcher · **roles**
that reach the screen · **responsive** = what changes between desktop and mobile ("reflow" means
the same markup at a different width; anything else is real divergence).

### Website and marketing (cream background)

| ID | Screen | States | Roles | Responsive |
|---|---|---|---|---|
| S1 | Landing page | default | Guest | Marketing layout / single column |
| S2 | How it works | default | Guest | Reflow |
| S3 | Gem of the town | default, new gem | All | Grid / feed |
| S4 | Neighbourhood page | default, empty | Guest, User | Grid / list |
| S5 | Legal and static | default | All | Reflow |

- **S1** Cream is the marketing background; the product uses off-white. A page picks one and never
  mixes them. Three steps and one gem module. No testimonial wall, no logo strip, no counter that
  ticks up — none of it has a number behind it. The hero says the promise in six words; everything
  below is evidence for it.
- **S2** Placed before signup on purpose: the mechanic is the pitch, so explaining it is not a
  cost. The live `PickCard` row is the same component the app uses — what is described is what is
  shipped.
- **S3** View-only for every role, including Admin; curation happens on S47. Local rank against
  outside fame, side by side — the gap is the editorial thesis, not a decoration. New-gem state is
  for a User who opted into that notification.
- **S4** The SEO surface, and the honest one — coverage depth is printed per neighbourhood. The
  empty state uses the real threshold: about 50 local ratings (try Alwal).
- **S5** Plain prose at 66ch. States the model in three paragraphs and does not defend it.

### App shell and onboarding

| ID | Screen | States | Roles | Responsive |
|---|---|---|---|---|
| S6 | First open / splash | default | Guest | Mobile-primary; desktop shows the welcome equivalent |
| S7 | Home — two doors | default, personalized | Guest, User | Doors side by side / stacked full width |
| S8 | Location permission | default, denied | Guest, User | Reflow |
| S9 | Manual area entry | default, no results | Guest, User | Reflow |
| S10 | Out of coverage | default | Guest, User | Reflow |
| S11 | Signup | default, validation error | Guest → User | Reflow |
| S12 | OTP verification | default, wrong code, expired | Guest → User | Reflow |
| S13 | Login | default, invalid | User, Owner | Reflow |
| S14 | Forgot password | request sent, reset form, success | Guest → User | Reflow |

- **S6** Both options are weighted the same on purpose — continuing as guest must not feel
  penalised, so neither button is coral and neither is smaller. Desktop gets no splash; the same
  content renders as the top block of the landing page.
- **S7** Doors are a CSS grid with a 280px minimum, so desktop side-by-side and mobile stack are
  the same markup. Genuine divergence starts at S17. Personalized state differs only for User:
  recent searches appear and the door cards carry the last-used filter set. Tapping a door does
  **not** go straight to intake if location was never asked — the router sends first-time visitors
  to S8.
- **S8** Denied is not an error. It routes into S9 and every downstream screen stays fully
  functional with a typed area. Reason copy sits above the buttons, not in a tooltip.
- **S9** The area list filters live as you type against eight seeded neighbourhoods; **Alwal is
  deliberately below ranking threshold** so the thin-coverage path is reachable. Coverage depth is
  printed per area. Set-as-home is User only — guests have no persistence, so the toggle is absent
  rather than disabled.
- **S10** Not an error screen. A real number is given for why the city is not ready, plus two
  exits. Notify-me promises exactly one message; anything vaguer would be a subscription.
- **S11** The carry-over line names the place a guest logged if they arrive mid-log. Phone and
  email are a segmented toggle, not two forms; Google sits below both as a third path.
- **S12** Six boxes, resend timer, change-number link. Wrong-code and expired-code are different
  states with different actions. Verified users land in ranking onboarding (S29), not home.
- **S13** Consumer login. Admin never touches it — S41 is a separate surface. An Owner logging in
  lands on their owner profile, not the consumer home.
- **S14** Three states in one screen: request, reset form, success.

### Discovery core loop

| ID | Screen | States | Roles | Responsive |
|---|---|---|---|---|
| S52 | Search entry | default | Guest, User | Nav bar expands / dedicated tab |
| S15 | Intake | default | Guest, User | One panel, steps inline / full-screen steps |
| S16 | Filters and tags | default, saved sets | Guest, User | Side drawer / full-screen sheet |
| S17 | Results — food | default, loading, empty, guest capped | Guest, User | Three in a row / stacked |
| S18 | Results — visit places | default, loading, map view, empty | Guest, User | Three in a row / stacked |
| S19 | Place detail | guest, shared link, user, owner, admin | All four | Two column / stacked with carousel |
| S20 | Bridge tap | default, locked | User | Split map / stacked with map tab |
| S21 | Map and directions | default | Guest, User | Embedded map / full screen with sheet |
| S22 | Share sheet | default | All | Modal / sheet |

- **S52** What the bottom-nav Search tab opens; not part of the linear flow. The escape hatch at
  the bottom goes to guided intake, so the two entry paths are reversible in both directions. Guest
  state removes the recent list entirely and says why, instead of showing an empty container.
- **S15** Real divergence, not a reflow: desktop holds all steps in one panel because a 1280 canvas
  can show the whole ask at once; mobile walks one step at a time with a progress bar. "Skip and
  browse" is always visible, never behind a menu — anyone who skips lands on unfiltered results
  rather than a dead end. The constraint step is a toggle, not two fields: a person has either a
  time or a radius in mind, never both.
- **S16** Pets is deliberately **two separate switches** — allows pets and serves pet food are
  different questions. Area type only exists behind the Explore door; on the Eat door the group is
  absent, not disabled. Applied filters do not stay in this panel — they leave as editable chips on
  the results screen. "Save this set" is User only.
- **S17** The counter in the header is live and the rail shows the running count. "None of these"
  and "Show me two more" both write to a **session reject list**; rejected places do not come back
  this session. Loading is three `PickSkeleton`s in the exact shape of the cards, resolving in
  900ms, with no loading copy. The honest-ranking sample below the picks — the places just outside
  the cut — is what stops three picks reading as an arbitrary three. Guest can use "None of these"
  once; the second use is the intercept point.
- **S18** Same layout logic as S17 by design — one component, one code path. The Explore door adds
  a drive-time radius up to three hours, best time to visit, and the map toggle. **The guest search
  cap is shared across both doors**; switching door does not reset it. Map view is a labelled
  placeholder.
- **S19** Five role states on one screen. **Shared link is the important one:** arriving from a
  pasted link unlocks everything — no cap, no "What to order" lock — because shared links must open
  fully with no account and never expire. "Is this your business" only renders when the listing is
  unclaimed; on a claimed listing the Owner sees an edit affordance in the same slot. Real
  divergence: desktop is two columns with gallery and map on the left; mobile stacks and the
  gallery becomes a swipe strip.
- **S20** Guest sees the whole module as a teaser and the tap opens the signup prompt rather than
  the plan. "Save the pair as a plan" writes into Bookmarks under the Plans tab, which is where S24
  reopens it from.
- **S21** Abstract map placeholder: labelled panel, markers by type, dashed route with per-leg
  travel time. "Open in Google Maps" is a handoff, not an embed — it is the exit, so it sits below
  the in-app actions.
- **S22** The recipient preview is shown inline so you can see exactly what lands in WhatsApp
  before building the meta tags. "No account needed, never expires" is copy, not decoration — it is
  the promise that makes sharing the cheapest acquisition path in the product.

### Personal state

| ID | Screen | States | Roles | Responsive |
|---|---|---|---|---|
| S23 | Bookmarks and wishlist | default, empty, nearby | User | Grid with sidebar / chips |
| S24 | Saved plan detail | default, shared link | User | Map plus both stops, reflowed |
| S25 | Log a visit — trigger | default | Guest, User | Modal / sheet |
| S26 | Log a visit — comparison | normal, first in category | Guest, User | Side by side / stacked |
| S27 | Log a visit — landed | user, guest | Guest, User | Reflow |
| S28 | Save your list (guest gate) | default | Guest | Modal |
| S29 | Ranking onboarding | default | User | Reflow |
| S30 | Post-visit nudge | default | User | Reflow |
| S31 | My ranked list | default, empty | User | Columns by category / tabs |
| S32 | Profile | default | User | Reflow |
| S33 | Settings — main | default | User | Reflow |
| S34 | Settings — claim a business | default | User → Owner | Reflow |
| S35 | Notification settings | default | User | Reflow |
| S36 | Privacy settings | default, delete confirm | User | Reflow |

- **S23** Places and Plans are one list with a toggle, not two screens — a saved bridge-tap pair is
  just a bookmark with two stops. "Mark as visited" feeds straight into S25, so saving and ranking
  are one loop. The resurfaced-when-nearby banner is a variant of this screen, not a notification.
- **S25** **Two taps from here to a ranked place. That budget is the whole design constraint on
  S25–S27.** The category shown is not decoration — it decides which pairwise bucket the place
  lands in, and it is set on the catalogue record at S44.
- **S26** This is real: the choice runs a binary insert against the actual ranked list, and S27
  shows the true resulting position. "First in category" skips comparison completely and says why —
  showing an empty comparison would be the worst version of this screen.
- **S27** The payoff is the position, so the list is the screen and the optional fields sit under
  it. Guest sees the same screen; the gate fires on exit, after the work is done, not before.
- **S28** The consequence of dismissing is printed. Hiding it would convert slightly better and be
  dishonest. This is the highest-intent gate in the product — the person has already done the work.
- **S29** Runs straight after signup so personalisation has something to work with from the first
  search. Same comparison component as S26 — one mechanic learned once. Skip is allowed and the
  consequence is stated plainly rather than nagged.
- **S30** Re-engagement, not a review request. Three answers, and only Yes costs the person
  anything. Yes routes into S25, so the nudge and the mechanic are the same loop.
- **S31** Disliked places drop out of the visible list but stay logged — they keep contributing to
  ranking, they just do not clutter your list. The show-visited toggle only affects the
  "you haven't been here" slot elsewhere in the app. Real divergence: desktop is multi-column by
  category, mobile is one column with category tabs.
- **S32** Local status is tied to ranking depth, not to time served or a badge scheme. Progress
  toward 25 is shown because the weight curve is real — see S46 for the thresholds behind it.
- **S33** "Claim a business" is the primary owner-onboarding path and gets the one inverted block
  on the page. Sign out is a ghost button at the bottom.
- **S34** Two columns: what claiming does, and what it does not. The second is the important one.
  Verification being a phone call is stated up front so nobody hunts for a document upload.
- **S36** Delete is guarded by a typed confirmation and states exactly what is lost, including that
  rankings recalculate without you. Location history is listed here as a user right — S51 is the
  same data seen from the other side, and that read is logged.

### Owner surface

| ID | Screen | States | Roles | Responsive |
|---|---|---|---|---|
| S37 | Claim request form | default, validation error | User → Owner | One page / stepped |
| S38 | Claim status | pending, verified, rejected | Owner | Reflow |
| S39 | Owner — edit listing | default | Owner | Form / stacked form |
| S40 | Owner profile | default | Owner | Reflow |

- **S37** Three sub-steps in one flow: Maps link, contact number, business name and role. Desktop
  shows all three; mobile steps through them. The validation error is specific about how to get a
  Maps link rather than just saying invalid.
- **S38** Status pill uses the global pattern. **Pending is neutral, never amber — waiting is not a
  warning.** Pending copy names the number we will ring.
- **S39** The never-affects-ranking reminder is on the screen the Owner uses most, not buried in
  the claim explainer. Report-a-duplicate lives here because owners find duplicates faster than we
  do.
- **S40** Deliberately not a User profile: no ranked list, no local status. Stating that in the UI
  prevents the obvious support question.

### Admin surface

| ID | Screen | States | Roles | Responsive |
|---|---|---|---|---|
| S41 | Admin login | default, invalid credentials, access-denied | Admin | Deliberately plain, both |
| S42 | Analytics dashboard | default, loading | Admin | Dense desktop / top 5 metrics |
| S43 | Catalogue — list | default | Admin | Table / condensed list |
| S44 | Catalogue — add / edit | create, edit | Admin | Sections / stepped |
| S45 | Catalogue — bulk import | upload, preview/validate, success/error summary | Admin | Reflow |
| S46 | Ranking and trust | default, override confirm | Admin | Control room / condensed |
| S47 | Gem selection | default | Admin | Reflow |
| S48 | Business claims queue | default | Admin | Table + drawer |
| S49 | Reports and moderation | default | Admin | Table + drawer |
| S50 | Roles, accounts, audit log | default | Admin | Table / condensed |
| S51 | Location history access | access-gate, granted view | Admin | Reflow |

- **S41** Dark teal, no consumer nav, no logo lockup — switching into Admin should feel like
  leaving the app. Access-denied is separate from invalid-credentials: a real account without the
  role, and the attempt is logged.
- **S42** All 16 brief metrics are present. Mobile keeps the top five KPI tiles and drops the
  charts. Loading is skeleton charts — a blank dashboard reads as broken. The abandonment split
  between comparison 1 and 2 is the number that settles the S26 open question.
- **S43** Global admin table pattern: filter bar, dense rows, detail drawer on click. No full
  navigation for a row; row actions live in the drawer, so the table stays readable at 8 columns.
- **S44** Category is called out as the comparison bucket — getting it wrong puts a place in the
  wrong ranked list, the most expensive data error in the product. The one-liner field says what a
  good reason contains rather than just accepting text.
- **S45** Three explicit steps with a stepper. The error report is per-row with the reason, and
  downloadable. Failed rows never block the successful ones.
- **S46** The control room. Four panels: why a place ranks, who contributed, the weight curve, and
  the abuse queue. Manual override is guarded — a written reason is required and the entry is
  permanent in the audit log. Adjusting a person's weight to zero is a real capability, so it sits
  next to the evidence that justifies it.
- **S47** Gap score is local rank minus outside fame. Cafe Bahar scores highest but has only 61
  ratings — the queue shows both so the trade-off is visible. Ranking history per candidate stops a
  one-week spike becoming a gem.
- **S48** The other side of S37/S38. The Maps link and phone number are on the row itself because
  they are what the reviewer acts on. Mark-as-called is a separate action from approve, so the
  phone call is a recorded step rather than an assumption.
- **S49** Two queues in one table, separated by filter. Bulk resolve exists because duplicate
  reports arrive in clusters. Resolving notifies the reporter with the outcome, not a generic
  receipt.
- **S50** The audit log is marked read-only in the UI and stated as immutable. It sits below the
  account table because it is the proof, not the control. Permission rows spell out the two
  dangerous capabilities — ranking override and location history — per role.
- **S51** **The gate is the design.** A reason is required, it is written verbatim, and the log
  entry is created *before* the data loads. Once granted, a persistent coral banner states that
  this read is itself logged; it does not disappear on scroll. Coral is used here and nowhere else
  on the screen.

---

## Interactions and behaviour

### Core loop

`Home (S7) → [location: S8/S9] → intake (S15) → filters (S16) → results (S17/S18) → detail (S19)
→ bridge tap (S20) → map (S21) / share (S22)`

Ranking loop: `S25 trigger → S26 pairwise comparison → S27 landed position` — **two taps, hard
budget.** Guests run the same loop and hit the gate (S28) on exit, after the work is done.

### Rules that must survive implementation

1. **Three picks, never more.** "Show me two more" replaces picks; it does not extend the list.
2. **Session reject list.** "None of these" and "Show me two more" both push the shown places into
   a per-session reject list; rejected places do not reappear that session.
3. **Guest search cap** — shared across both doors, configurable (default: the 4th search trips the
   soft paywall). Guests get one free "None of these"; the second use is the intercept.
4. **Shared links open fully.** No account, no cap, no locked sections, and they never expire.
5. **Ranking is pairwise.** A logged visit is inserted into your ranked list for its category by
   binary insert against existing entries. Categories are the comparison buckets and are set on the
   catalogue record (S44).
6. **Disliked places stay logged.** They leave the visible list but keep contributing to ranking.
7. **Owner edits never affect ranking.** Stated in the UI on S39.
8. **Admin reads of location history are logged before the data loads** (S51), and the person's own
   copy of that right is shown at S36.
9. **Ranking threshold: about 50 local ratings** before anything is called a pick. Below that, say
   so — do not show a weak pick.

### States every screen needs

Loading (skeletons only, no copy), empty (cause + one exit), error (specific + actionable),
denied/permission, guest-capped, and role variants. The prototype's state switcher enumerates the
exact set per screen; the tables above list them.

### Hover / press / focus

Hover darkens fills one step (teal-500 → teal-600) and lightens ghost buttons to slate-100. Press
settles `translateY(1px)` and drops the shadow. Focus is a 3px teal ring at 22% (`--shadow-focus`)
**plus** the browser outline; coral controls get the coral ring. Nothing scales or bounces.

### Responsive

Two breakpoints: mobile (390px) and desktop (1280, content capped at 1160). Most screens reflow.
The screens with **real divergence** — different markup, not just a different width — are S15, S17,
S18, S19, S20, S21, S31, S42, S43. Build those as two layouts.

---

## State and data

### Client/session state in the prototype

`persona` (guest|user|owner|admin) · `breakpoint` · `screen` + `variant` · `hist` (back stack,
last 40) · `searches` (guest counter) · `query`, `areaQuery` · `loc` (resolved area or null) ·
`rejects` (session reject list) · `ranked` (the user's ranked list by category) · `homeArea`
(User only) · `trayOpen`, `modal`.

### Entities

- **Place** — `id`, `slug`, `name`, `type` (`eat`|`explore`), `vibe`, `category`, `neighborhood`,
  `priceLevel`, `reason` (the one-line why), `history`, `tags[]`, `phone`, `address`, `hours`.
- **Eat-only** — `waitTime`, `servingHours`, `dishes` (count), `gem` (bool).
- **Explore-only** — `crowdLevel`, `best` (best time to visit).
- **Ranking fields** — `gapTone` (`clear`|`close`|`thin`), `gapPoints`, `locals` (count),
  `visitors` (count), `drive` ("27 min · 12.6 km").
- **RankedEntry** — `{ name, tier: "loved" | "fine" | "disliked" }`, grouped by category.
- **Area/neighbourhood** — name + coverage depth (ratings count), used by S9 and S4.

Categories seeded: Breakfast and tiffin · Biryani and kebab · Cafes · Lakes and viewpoints ·
Historical · Nightlife · Concerts and events.

### Data fetching

Results (S17/S18) resolve in ~900ms behind three `PickSkeleton`s. Everything else is optimistic.
The seeded Hyderabad dataset (8 eat places, 8 explore places, 8 neighbourhoods) lives in the
prototype's logic class — lift it into fixtures so screens stay demoable behind a real API.

---

## Open questions — build the default, keep the alternative reachable

Six unsettled product decisions are wired as switchable props in the prototype. Implement the
**default**; keep the other options behind a config or feature flag.

| # | Flag | Options | Default | Affects |
|---|---|---|---|---|
| 1 | `homeMode` | Two doors · Search first | **Two doors** | S7 |
| 2 | `intakeLength` | 2 steps · 3 steps | **3 steps** | S15 |
| 3 | `secondComparison` | Always shown · Skippable · Removed | **Skippable** | S26 |
| 4 | `rankHonesty` | Rank only · Rank and gap · Rank, gap and contributors | **Rank and gap** | S19 |
| 5 | `guestPaywallAt` | 2–6 (which search trips the soft paywall) | **4** | S17, S18 |
| 6 | `bridgePrompt` | Direct question · Contextual line · Quiet link | **Contextual line** | S19, S20 |

The metric that settles #3 is the abandonment split between comparison one and comparison two,
which S42 reports.

---

## Assets

| Asset | Path | Notes |
|---|---|---|
| Logo, full lockup | `design-system/assets/logo-madli-full.png` | Mark + wordmark + tagline |
| Mark | `design-system/assets/logo-mark.png` (+`-transparent`) | 24px minimum |
| Wordmark | `design-system/assets/logo-wordmark.png` (+`-transparent`) | |
| Tagline | `design-system/assets/logo-tagline.png` (+`-transparent`) | "3 picks. 1 reason. 2 minutes." |
| Cooper BT Black Headline | `design-system/assets/fonts/CooperBT-BlackHeadline.{woff2,woff,ttf}` | Display |
| Inter variable | `design-system/assets/fonts/Inter-Variable.ttf`, `Inter-Italic-Variable.ttf` | UI |
| Font licences | `design-system/assets/fonts/License-*.txt` | Read before shipping |
| Brand reference boards | `design-system/assets/brand/` | Palette board, font-pairing note |

**The logo is the only brand illustration.** Use the PNGs as supplied, mark at 24px minimum, clear
space equal to the height of the "M". Do not recolour it, redraw it, or rebuild the wordmark in
live type.

**No photography exists.** Every image slot renders a `PhotoFrame` placeholder on cream that names
what belongs there. When real photography arrives it should read **warm and daylit** — food and
street scenes in natural light, not styled studio shots, not desaturated editorial, not heavy
filters. Full-bleed at the top of a detail screen, 16:10 inside cards. No illustration, no pattern,
no texture, no gradient backgrounds anywhere — the only gradients in the system are the text scrims.

---

## Known gaps to flag to the client

1. **Cooper BT upright cut is missing.** Only the Black *Italic* Headline cut was supplied. Display
   type is counter-slanted to approximate the upright wordmark via `--display-upright`. Set that
   one token to `normal` once a roman face is registered and every display role goes upright.
2. **Inter ships as a variable TTF** — no woff2, so UI text downloads heavier than it should.
3. **No photography.** Every image is a placeholder.
4. **Icons are substituted** (Lucide), not a bespoke Madli set.
5. **Maps are placeholders.** No geography is drawn anywhere.
6. **No production source existed** when the design system was built — the component library and UI
   kits are reference builds from the brand and written brief, not recreations of a shipped app.

---

## Files

| File | What it is |
|---|---|
| `prototype/Madli Prototype.dc.html` | All 52 screens, interactive, offline. The primary reference. |
| `prototype/support.js`, `prototype/_ds/` | Runtime + design system the prototype loads. Not production code. |
| `design-system/readme.md` | Design system guide — read alongside this README. |
| `design-system/tokens/*.css`, `styles.css` | **Carry into the app unchanged.** |
| `design-system/components/**` | 28 components: `.jsx` reference, `.d.ts` props, `.prompt.md` usage. |
| `design-system/guidelines/*.card.html` | 22 foundation specimen cards — open in a browser to see tokens rendered. |
| `design-system/ui_kits/madli-app`, `madli-site` | Reference builds: 5-screen phone app, 1280 marketing page. |
