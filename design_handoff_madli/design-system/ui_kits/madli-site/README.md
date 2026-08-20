# Madli site — UI kit

Marketing home page at 1280 wide, composed from the same primitives as the app.

Open `index.html`. Sections top to bottom: sticky header, cream hero with the lockup, "How the ranking works" (three steps), "What you actually get" (three live `PickCard`s with a scope switch), the dark teal trust block, cities grid, cream footer.

## Files
| File | What it is |
|---|---|
| `index.html` | Page shell and mount |
| `SiteSections.jsx` | `SiteHeader`, `Hero`, `HowSection` |
| `SitePage.jsx` | `SamplePicks`, `TrustSection`, `CitiesSection`, `SiteFooter` |

Pick data is shared with the app kit (`../madli-app/data.js`).

## Notes on fidelity
- No marketing site was supplied. This is built from the brand assets and the product description; treat it as a reference for how the foundations behave at desktop width, not as a recreation.
- Cream (`--bg-page-warm`) is the site's paper; the app uses off-white (`--bg-page`). The dark teal block is the only inverted section — one per page.
- Photography is `PhotoFrame` placeholders throughout.
