# Madli app — UI kit

Recreation of the Madli phone app: 390 × 844, five screens, click-through.

Open `index.html`. Flow: **Start** (city + craving) → **Get 3 picks** → **Picks** (three cards, tab between Eat / Do / Stay) → tap a card → **Pick detail** → *How this was ranked* opens a bottom sheet. The bottom tab bar reaches **Saved** and **You**; **Map** is intentionally blank (see below).

## Files
| File | What it is |
|---|---|
| `index.html` | Phone frame, script loading, mount |
| `data.js` | `window.MADLI_DATA` — three picks per scope, with reasons, gaps, sample sizes and method text |
| `StartScreen.jsx` | Entry: one search field, four cravings, one action |
| `PicksScreen.jsx` | The main view — exactly three `PickCard`s, skeletons while re-ranking |
| `PickDetailScreen.jsx` | Photo hero, reason, "where it sits" evidence block, ranking sheet |
| `SecondaryScreens.jsx` | `SavedScreen`, `ProfileScreen`, `MapScreen` |
| `App.jsx` | Routing, scope changes, save toast |

## Notes on fidelity
- No product screenshots or code were supplied for the app, only the brand (logo, palette, font pairing) and the written product description. Screens follow that description and the design-system foundations; they are **not** a recreation of an existing build.
- **Map** is left as an explicit blank with a note rather than invented — no map surface was described.
- All photography is `PhotoFrame` placeholders. Drop real images in via the `src` prop.
- Loading uses `PickSkeleton` at 600–900ms so the layout never shifts. No spinners.
