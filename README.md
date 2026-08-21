# Madli — Frontend (Phase 2)

Locally-ranked food and travel app for Hyderabad. This is the Phase 2 frontend: all 52 screens,
built against a typed mock data layer, independently demoable without a real Supabase connection.

Phase 1 (Supabase backend) lives in `supabase/` and `tests/` — untouched by this phase. See
`PHASE_1_COMPLETION_REPORT.md`, `PHASE_1_CHECKLIST.md`, and `PHASE_2_HANDOFF.md` for what it built.
See `PHASE_2_COMPLETION_REPORT.md`, `PHASE_2_CHECKLIST.md`, and `PHASE_3_HANDOFF.md` for this phase.

## Running it

```
npm install
npm run dev        # http://localhost:5173, dev harness enabled
```

The dev server always opens onto the **dev harness** (`src/dev/DevHarness.tsx`) — a left rail with
a persona switcher (Guest/User/Owner/Admin, plus admin tier and grants), a breakpoint switcher
(mobile 390 / desktop 1280), and an "All screens" tray listing all 52 screens by group. Click any
screen to jump straight to it under the current persona/breakpoint. The harness is stripped from
production builds (`import.meta.env.PROD` early-return in `DevHarness.tsx`) — it never ships.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with the dev harness |
| `npm run build` | `tsc -b` (type-check) then `vite build` — production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b --noEmit`, strict mode |
| `npm run lint` / `lint:fix` | ESLint (typescript-eslint + react-hooks + react-refresh) |
| `npm run format` | Prettier over `src/**/*.{ts,tsx,css}` |
| `npm run test:frontend` | Run the Vitest + React Testing Library suite (this phase's tests) |
| `npm run test:frontend:watch` | Same, in watch mode |
| `npm test` / `npm run test:watch` | Phase 1's **backend** Vitest suite (`tests/`, `vitest.config.ts`) — unrelated to this phase, requires `.env.local` with real Supabase credentials |

Frontend tests live under `src/**/*.test.{ts,tsx}` and run via `vitest.frontend.config.ts` (jsdom,
`@testing-library/jest-dom`). They are a separate config/suite from Phase 1's `tests/` — don't
confuse `npm test` (backend, real Supabase) with `npm run test:frontend` (this phase, all mock).

## Where the data-layer mock seam lives

- `src/fixtures/` — static reference data (`places.ts`, `categories.ts`, `areas.ts`, `appConfig.ts`,
  `admin.ts`) lifted verbatim from Phase 1's real seed data (`supabase/seed.sql`), plus
  `mockDb.ts`, the mutable in-memory store (ranked entries, bookmarks, plans, claims, reports,
  audit log) that stands in for Postgres tables.
- `src/data/*.ts` — one function per backend operation (`rankedEntries.ts`, `places.ts`, `plans.ts`,
  `businessClaims.ts`, `admin.ts`), each matching Phase 3's real contract (name, params, return
  shape) exactly, and each marked with a `// TODO(phase-3): ...` comment at the line that needs to
  become the real `supabase.rpc(...)` / `.from(...)` call. Grep for `TODO(phase-3)` to find every
  seam — see `PHASE_3_HANDOFF.md` for the full list and what each one becomes.
- `src/data/hooks.ts` — TanStack Query wrappers (queries for reads, mutations for writes) over the
  functions above. Screens only ever import from `hooks.ts`, never call the `data/*.ts` functions
  or touch `fixtures/mockDb.ts` directly — swapping a mock function's body for a real Supabase call
  in Phase 3 requires no change to any screen or hook signature.

## Dev harness usage

- **Persona**: switches `usePersona()` (`src/dev/PersonaContext.tsx`), which every screen reads
  instead of a real auth session. Fixed mock user ids match Phase 1's real dev test account UUIDs
  (`MOCK_USER_ID`/`MOCK_OWNER_ID`/`MOCK_ADMIN_ID`) so fixture data lines up the same way Phase 3's
  real accounts will.
- **Admin tier / grants**: only shown when persona is Admin — toggles `admin_tier` and the two
  independent boolean grants (`can_override_ranking`, `can_access_location_history`).
- **Breakpoint**: mobile (390px) / desktop (1280px). The 9 screens with real layout divergence
  (S15, S17, S18, S19, S20, S21, S31, S42, S43) render genuinely different markup at each, not just
  reflowed CSS.
- **All screens tray**: every registered screen (`src/screens/registry.ts`), grouped and
  filterable. Clicking one substitutes any `:param` in its path with a real fixture slug so dynamic
  routes (place detail, claim forms, etc.) resolve to actual fixture data instead of 404ing.
