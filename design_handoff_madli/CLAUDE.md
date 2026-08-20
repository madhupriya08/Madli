# CLAUDE.md — read this first

You are implementing **Madli**, a locally-ranked food and travel app, from a completed design handoff.
Everything you need is in this folder. Do not ask the user for a brief; it is written down here.

## Order of reading

1. `README.md` — the full spec: fidelity, design tokens, all 52 screens with states, roles,
   responsive behaviour, design intent, data model, and open product questions.
2. `design-system/readme.md` — the Madli design system guide (voice, colour rules, type rules,
   motion rules, what is forbidden).
3. `design-system/components/**/*.prompt.md` + `*.d.ts` — the 28 component contracts.
   `*.jsx` next to them is the reference implementation.
4. `prototype/Madli Prototype.dc.html` — the interactive prototype. Open it in a browser
   (double-click; it runs offline, no build step, no server needed) to see every screen.
   Use the left rail: persona switcher, breakpoint switcher, state switcher, "All screens" tray.

## Ground rules

- The HTML in `prototype/` is a **design reference**, not production code. Recreate it in the
  target codebase's framework and patterns. If no codebase exists, use **React + TypeScript +
  Vite**, plain CSS Modules or vanilla CSS consuming the token files verbatim — no Tailwind,
  no component library, no CSS-in-JS. The design system is already CSS custom properties.
- **Copy `design-system/tokens/*.css` and `design-system/styles.css` into the app unchanged.**
  Never hardcode a hex, a px radius, a shadow or a duration that exists as a token.
- Port the 28 components in `design-system/components/` first, as real components in the target
  framework, then build screens out of them. Do not restyle raw HTML to look like them.
- Fonts ship in `design-system/assets/fonts/`. Serve them locally; do not swap to Google Fonts.
- Icons are Lucide, applied as CSS masks (see `components/core/Icon.jsx`). Do not hand-draw SVG.
- Copy in the prototype is final. Do not rewrite it. Voice rules are in `design-system/readme.md`.
- The seeded content (Hyderabad places, ratings counts, reasons) is realistic placeholder data.
  Move it behind an API layer; keep it as fixtures/seed data so screens stay demoable.
- **No photography exists.** Every image slot uses `PhotoFrame`, a labelled placeholder.
  Keep it until real photography is supplied.

## Suggested build order

1. Token layer + font loading + `Icon` + `Logo`.
2. Core, forms, feedback, navigation components (24 of them).
3. Trust components — `PickCard`, `RankBadge`, `RankGap`, `SampleSize`, `ReasonNote`.
   These carry the product's whole promise; get them exactly right.
4. Discovery core loop: S52, S15, S16, S17, S18, S19, S21, S22.
5. Auth + onboarding: S6–S14, S29.
6. Ranking loop: S25, S26, S27, S28, S31 — the two-tap budget is a hard constraint.
7. Personal state: S23, S24, S30, S32–S36.
8. Marketing: S1–S5.
9. Owner: S37–S40.
10. Admin: S41–S51.

## Six open product questions

They are wired as tweakable props in the prototype (see README § Open questions). Build the
**default** listed for each, but keep the alternative reachable behind a config flag or feature
flag — these are unsettled and will be A/B'd.
