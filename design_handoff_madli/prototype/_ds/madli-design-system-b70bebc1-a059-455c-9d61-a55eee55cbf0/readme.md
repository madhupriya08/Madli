# Madli Design System

Madli is a locally-ranked food and travel app. It hands you **three picks with a reason** instead of a list, so you can decide in two minutes and trust the answer. The tagline in the logo is the product spec: *3 picks. 1 reason. 2 minutes.*

Everything in this system serves one promise — **the ranking is honest about what it knows and what it does not.** Ranking gaps are printed, sample sizes are exact, and the reason next to a pick is never crowded out.

## Sources I was given

Brand materials only — no codebase, no Figma file, no product screenshots.

| Source | Where it now lives |
|---|---|
| `uploads/Madli logo.png` | `assets/logo-madli-full.png`, plus cropped `logo-mark`, `logo-wordmark`, `logo-tagline` (each also as `-transparent.png`) |
| Colour palette board (`uploads/ChatGPT Image Aug 4, 2026, 11_50_13 PM.png`) | `assets/brand/color-palette-reference.png` → `tokens/colors.css` |
| Font pairing note (`uploads/Screenshot 2026-08-04 235229.png`) | `assets/brand/font-pairing-reference.png` |
| `uploads/Primary Font - Cooper BT/` | `assets/fonts/CooperBT-BlackHeadline.{woff2,woff,ttf}` + `License-CooperBT.txt` |
| `uploads/Inter/` | `assets/fonts/Inter-Variable.ttf`, `Inter-Italic-Variable.ttf` + `License-Inter.txt` |
| Written product description | This readme's content and visual sections |

Because there was no product source, the **UI kits are reference builds from the brand and the written description, not recreations of an existing app.** Where a surface was never described (a map view), it is left visibly blank rather than invented.

---

## Index

| Path | What it is |
|---|---|
| `styles.css` | The only file consumers link. `@import`s everything below. |
| `tokens/colors.css` | Palette, ramps, semantic aliases, ranking/trust colours, photo scrims |
| `tokens/typography.css` | Families, scale, tracking, composed type roles |
| `tokens/spacing.css` | 4px grid, layout widths, `--reason-max` |
| `tokens/shape.css` | Radii, borders, shadows, focus rings, blur |
| `tokens/motion.css` | Durations, easing, skeleton + fade-up keyframes |
| `tokens/fonts.css` | `@font-face` for Cooper BT and Inter |
| `tokens/base.css` | Element resets, link colours |
| `assets/` | Logo variants, fonts, brand reference boards |
| `guidelines/*.card.html` | 22 foundation specimen cards (Brand, Colors, Type, Spacing) |
| `components/` | 28 React primitives in five groups (below) |
| `ui_kits/madli-app/` | Phone app, five screens, click-through |
| `ui_kits/madli-site/` | Marketing home page at 1280 |
| `SKILL.md` | Agent-skill entry point |

### Components

**core** — `Button`, `IconButton`, `Icon`, `Badge`, `Tag`, `Card`, `PhotoFrame`, `Logo`
**forms** — `Input`, `SearchField`, `Select`, `Checkbox`, `Radio`, `Switch`
**trust** — `PickCard`, `RankBadge`, `RankGap`, `SampleSize`, `ReasonNote`
**navigation** — `TopBar`, `TabBar`, `Tabs`
**feedback** — `Skeleton`, `PickSkeleton`, `Dialog`, `Toast`, `Tooltip`, `EmptyState`

Each has a sibling `.d.ts` (props) and `.prompt.md` (what/when + example).

#### Intentional additions
No component library was supplied, so the standard set was authored from scratch. Five components are Madli-specific rather than generic, because the brand's whole pitch depends on them:

- `PickCard` — the atomic unit: one ranked pick with its reason attached.
- `ReasonNote` — the "why", capped at `--reason-max` so it always has room.
- `RankGap` — states the distance to the next pick, including near-ties.
- `SampleSize` — the exact evidence line under a pick.
- `RankBadge` — the numerals 1–3, and only 1–3.

`Icon` is a wrapper around a substituted glyph set (see Iconography) rather than a brand asset.

---

## Content fundamentals

**Voice: a friend who knows the neighbourhood.** Direct, specific, a little insider-y. Never salesy, never hedging, never apologetic twice.

**Person.** Address the reader as *you*. Refer to the product as *we* only when describing a decision Madli made ("We stop at three on purpose", "We do not sell rank"). Never "I", never a mascot voice.

**Casing.** Sentence case everywhere — headings, buttons, labels. The only uppercase is the eyebrow style (`--type-eyebrow`, 0.16em tracking) used for section kickers and the "Why this one" label.

**Emoji: none.** Not in UI, not in copy, not in decks. The palette board and logo contain no emoji and the tone does not support them.

**Numbers are always real.** "412 locals · 88 visitors · last 90 days" — never "thousands of reviews", never "highly rated", never a star average without the count behind it.

**Sentence shape.** One idea per sentence, concrete noun first. Reasons are one sentence, occasionally two, and always contain a specific detail — a price, a time, a street, a proportion.

Good, and what makes it good:

> Locals rank it first for a sit-down lunch: the stews change daily and nothing is over 200₺.
> — *a use case, then two checkable facts.*

> Nine tables, no sign, and 84% of the people rating it live within a kilometre.
> — *the evidence IS the pitch.*

> Nearly tied with #2 — either works.
> — *the gap stated flatly; the user is trusted to handle ambiguity.*

> Only 61 ratings — treat as a hint.
> — *admits the limit without apologising for it.*

> That is the list. We stop at three on purpose.
> — *a product decision stated once, not defended.*

Off-brand, and why:

> ✗ "Discover hidden gems loved by locals!" — exclamation, marketing verb, no fact.
> ✗ "Finding the best spots for you…" — loading copy that performs effort; the promise is speed.
> ✗ "Trusted by thousands of food lovers" — a claim with no number.
> ✗ "Oops! We couldn't find anything 😔" — apology plus emoji plus no exit.

**Empty and error states** say what is missing, then what to do: *"No ranking here yet. We need about 50 local ratings before we will call anything a pick."* One sentence of cause, one exit.

**Loading copy: none.** Skeletons carry the wait. Any sentence in a loading state is a sentence that makes two minutes feel longer.

---

## Visual foundations

**The two-half idea.** The mark is a circle split down the middle: a teal spoon half and a coral bitten-fruit half, with a dashed flight path and a plane arcing over it. Food and travel, one object. That split — one calm side, one warm side — is the system's only motif. It is not repeated as decoration; it is expressed through the palette split (teal does the work, coral marks the one thing worth acting on).

**Colour.** Deep Teal `#0F766E` is the working colour: bars, primary buttons, rank #1, focus rings. The logo's darker teal ink `#11444F` is reserved for display type and inverted sections. Coral `#FF6B6B` is scarce on purpose — **one coral element per view**, either the single call to action or a "local gem" marker. Sky Blue `#38BDF8` supports (rank #2, info) and never becomes an action. Emerald confirms, amber cautions, red is only for real failure. Neutrals are the cool slate ramp — no warm greys.

**Two backgrounds, and only two.** Cream `#FAF4EF` (from the logo artboard) is brand paper: the marketing site, decks, print. Off-white `#F8FAFC` is the product. Never mix them in one surface; a page picks one.

**Type.** Cooper BT Black Headline for display, Inter Regular/SemiBold for everything else — never the reverse, and never a third family. Display type is set **upright** via `--display-upright: oblique -12deg`, which counter-slants the supplied italic cut to match the wordmark. Tracking is tightened to -0.02em at display sizes. The true italic is available as `--type-display-italic` for pull quotes and city names. Body copy is 15px, reasons run at 15–17px, and the evidence footnote is 11px — small, but never below that.

**Spacing and layout.** Strict 4px grid. Section rhythm is 48px on mobile, 112px on desktop. Content caps at 1160px, prose at 66ch, and the reason column at 46ch — that last one is a hard rule: `--reason-max` exists so the "why" always sets in two or three lines instead of being squeezed into a caption. Gutters are 20px on the phone, 40px on desktop. Nothing is fixed to the viewport except the top bar and the bottom tab bar, both translucent.

**Backgrounds and imagery.** Real photography, full-bleed at the top of a detail screen and 16:10 inside cards. No illustration, no pattern, no texture, no gradient background anywhere — the only gradients in the system are the text-protection scrims. Photography should read **warm and daylit**: food and street scenes with visible grain-free natural light, not styled studio shots, not desaturated editorial, not heavy filters. No photography was supplied, so every image slot renders a `PhotoFrame` placeholder on cream that names what belongs there.

**Text over images** always sits on `--scrim-bottom` (a teal-tinted vertical gradient, `#0B2F36` at 86% → transparent) for stacked text, or `--scrim-flat` (42% teal) for centred hero text. Never a black scrim — black reads cheap against the cream. Badges over photography use the `onImage` tone: a translucent teal capsule, not a plain white box.

**Corners.** 4/6/10/14/20/28px. Cards are 14, photo cards and sheets are 20, bottom sheets 28. Pills (999px) are reserved for badges, avatars, and the one pill-shaped field — `SearchField`. Filter chips are 6px so they never read as badges.

**Cards.** White, 1px `#E2E8F0` hairline border, 14px radius, `--shadow-sm`. On hover the shadow steps to `--shadow-md` and the border darkens to slate-300; nothing lifts or scales. Shadows are cool grey (`rgba(15,23,42,…)`), low, and never black. There are no accent-left-border cards, no coloured card fills, no glassmorphism.

**Elevation ladder.** `xs` for buttons, `sm` for cards, `md` for hover and popovers, `lg` for dialogs, and a single upward `--shadow-sheet` for bottom sheets.

**Hover / press / focus.** Hover darkens fills one step (teal-500 → teal-600) and lightens ghost buttons to slate-100 — never opacity fades, which look broken over photography. Press settles `translateY(1px)` and drops the shadow; nothing scales or bounces. Focus is a 3px teal ring at 22% (`--shadow-focus`) plus the browser outline; coral controls get the coral ring.

**Motion.** 90ms for colour and press, 140ms for hover and toggles, 200ms for content entering, 260ms for sheets, 320ms for full-screen. One curve — `cubic-bezier(.2,0,.2,1)` — with `--ease-out` only for things entering. **No bounce, no spring, no stagger, no parallax.** Skeletons breathe between 100% and 55% opacity over 1200ms rather than running a sheen; a moving highlight implies work in progress, and Madli's promise is that there isn't much. Everything respects `prefers-reduced-motion`.

**Transparency and blur.** Exactly two uses: the sticky top bar and the bottom tab bar, both `rgba(255,255,255,0.82)` with `saturate(150%) blur(12px)`. Dialog scrims are 42% teal. Nothing else is translucent — no frosted cards, no blurred panels.

**Inverted sections.** One dark teal (`--teal-800`) block per page, maximum, used for the trust/method statement. On it, body text is white at 72% and dividers are white at 16%.

---

## Iconography

**Substituted set — flag for review.** No icon font, sprite, or SVG set was supplied. The system standardises on **Lucide** (2px stroke, rounded caps, geometric), which sits closest to Inter's even geometry without competing with Cooper's weight.

- Glyphs load per-icon from CDN: `https://unpkg.com/lucide-static@0.475.0/icons/<name>.svg`.
- The `Icon` component applies each SVG as a **CSS mask** with `background: currentColor`, so icons inherit text colour and can be tinted with tokens. No inline SVG is hand-drawn anywhere in this system.
- Sizes in use: 14 inline, 17–18 in buttons and fields, 21 in the tab bar, 26 in empty states. Nothing below 14.
- Icons are **never** the sole label for a primary action, and never decorate a heading.
- Icons used across the kits: `search`, `map-pin`, `map`, `navigation`, `footprints`, `clock`, `bookmark`, `share-2`, `sliders-horizontal`, `chevron-down`, `chevron-right`, `arrow-left`, `arrow-right`, `check`, `x`, `info`, `alert-circle`, `alert-triangle`, `sparkles`, `user`, `utensils`, `refresh-cw`, `folder-plus`, `scale`, `list-ordered`, `map-pin-off`.
- **Emoji are never used as icons.** Neither are unicode glyphs, except the middot (`·`) as a separator in meta lines and `₺`/`₺₺` for price level.

**The logo is the only brand illustration.** Use `assets/logo-*.png` as supplied — the mark at 24px minimum, with clear space equal to the height of the "M". Do not recolour it, redraw it, or rebuild the wordmark in live type.

---

## Known gaps

1. **Cooper BT upright cut is missing.** Only *Cooper BT W03 Blk It Headline* (Black **Italic**) was supplied. Display type is counter-slanted 12° to approximate the upright wordmark; it is a close match but not the real roman cut. Please upload the upright Cooper Black if you have it.
2. **Inter ships as a variable TTF** — no woff2, so UI text downloads heavier than it should. A woff2 build would help.
3. **No photography.** Every image is a placeholder.
4. **Icons are substituted** (Lucide), not a Madli set.
5. **No product source** — the UI kits are reference builds, not recreations.
