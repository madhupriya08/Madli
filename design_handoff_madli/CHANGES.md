# Design decisions in this handoff

This package was built directly from the Madli brand materials (logo, colour board, font
pairing note, fonts) plus a written product description — there was no prior app, codebase,
or Figma file to diff against, so this is v1 of the design, not a revision.

Key decisions made while producing it, all documented in full where noted:

- **Two icon-only components (`Icon`, `Logo`) plus 26 UI/trust/nav/feedback components** were
  authored from scratch — no component library was supplied. See `design-system/readme.md` →
  "Intentional additions" for why `PickCard`, `ReasonNote`, `RankGap`, `SampleSize`, `RankBadge`
  exist as Madli-specific components rather than generic ones.
- **Icon set substituted with Lucide** (2px stroke) since no icon font/sprite was supplied —
  every icon in every screen uses this set, applied as CSS masks so it inherits colour. Full
  glyph list in `design-system/readme.md` → "Iconography".
- **Display type counter-slanted 12°** (`--display-upright`) because only the italic cut of
  Cooper BT was supplied, not the upright — approximates the wordmark until a real roman cut
  is provided. See `design-system/readme.md` → "Known gaps" item 1.
- **No photography** — every image slot renders a `PhotoFrame` placeholder naming what belongs
  there, across all 52 screens, rather than stock or generated imagery.
- **Maps are labelled abstract panels** (markers + dashed route), not a real map SDK, pending
  real geography integration.
- **Six open product questions** (e.g. ranking tie-break display, guest search cap) are wired
  as tweakable props with a stated default in the prototype — see `README.md` → "Open
  questions" and `CLAUDE.md` → "Six open product questions" for the full list and defaults.

For the full rationale behind every colour, type, spacing, and motion choice, see
`design-system/readme.md` (the design system guide) — it is the source of truth this handoff
was built against.
