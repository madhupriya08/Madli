# Madli — Production Readiness Summary

Addressed to whoever on the human team makes the launch decision. This is not another engineering
report — full evidence for every claim below lives in `PHASE_4_QA_REPORT.md` and the three prior
phases' own reports; this document only states, plainly and in three honest categories, what that
evidence actually supports. There is no Phase 5 — this is the end of the defined build phase
sequence. Anything below marked "blocking" needs a person to decide before a real public launch;
nothing here should be rounded up into a single "ready to launch" line.

---

## Engineering-complete and verified

Confirmed working end-to-end with real evidence — real logins, real database round trips, real
rejections — across all four phases, re-confirmed live again in Phase 4 where it touches this
phase's own changes:

- **The core ranking loop**: search → picks → place detail → bookmark → log a visit → real
  pairwise comparison → real position on the ranked list. Backed by a real Postgres function
  (`fn_log_ranked_visit`) doing the actual ranking math server-side, not duplicated in the client.
- **The business claim lifecycle**: submit → admin marks called → admin approves → the account's
  real `owns_verified_claim()` flips true for that specific user and place → an allowed field
  edit persists → a protected (ranking-relevant) field edit is rejected by a real database trigger,
  regardless of what the UI happens to expose.
- **Admin ranking override and location-history access**, both with real logging: an override
  writes to a real, immutable audit log; a location-history read is logged *before* the data is
  returned, in one atomic database call — verified live, not just read from the migration SQL.
- **Shared plans**: a real, permanent share token, sent as a real `x-share-token` request header,
  opens a plan fully for a completely anonymous visitor with no account and no cap — verified with
  a fresh, cookie-less browser context reading a real minted token.
- **Email/password authentication**: signup, login, logout, password reset — all real
  `supabase.auth` calls, real sessions, a real `400 invalid_credentials` for a wrong password (not
  a generic error that would let an attacker distinguish a wrong password from an unknown email).
- **Row-level security across every one of the 17 tables**, including this phase's two additions —
  each independently confirmed to reject a real non-admin and a real anonymous request, not
  inferred from reading the policy SQL.
- **The owner-edit protection trigger**: an owner can edit their listing's practical details but a
  real attempt to change a ranking-relevant field (locals, visitors, rank, gap) is rejected
  server-side with a specific error, verified live again this phase with zero regression from
  Phase 4's own database changes.
- **The ranking-threshold gate**: places below `app_config.ranking_threshold_locals` are excluded
  from what the app shows, driven by a real, configurable value, not a hardcoded number — verified
  live this phase (0 rows below threshold in the real view).
- **All 52 screens render**, real render, real accessibility scan, in the app's actual production
  code paths — not previously true of this project; new this phase (`PHASE_4_QA_REPORT.md` §9).
- **Modal focus management** (focus trap, Escape-to-close, focus restoration) across all 9 screens
  using the shared `Dialog` component — did not exist before this phase; built, verified live via a
  real keyboard-only Playwright test.

---

## Known, disclosed limitations acceptable for an MVP launch

Things that work as designed but aren't fully resolved product decisions — none of these block a
first launch on their own, but each is a real, deliberate simplification a team should know it's
carrying, not discover later by accident:

- **The admin `tier → grant` mapping is explicit-per-account, not tier-implied.** `admin_tier`
  (superadmin/catalogue/moderation) and the two dangerous capability grants
  (`can_override_ranking`, `can_access_location_history`) are independent columns — a
  "moderation"-tier admin isn't automatically denied every dangerous grant by the tier alone; each
  grant is set per account. Intentional (Phase 1's own design), but means onboarding a new admin
  requires deliberately setting both fields correctly, not just picking a tier.
- **`outside_fame_rank` is presumably manually entered.** Its actual data-entry source (a manual
  catalogue field, a scheduled scrape, a third-party API) was never confirmed against a real
  ingestion pipeline in any phase — it exists as a plain column with no automated population path
  found.
- **The ranking-weight curve (`ranking_weight` on `profiles`) uses a flat default (1.0), not a
  designed formula.** The column and the admin adjustment function
  (`fn_admin_adjust_contributor_weight`) are real and wired end-to-end; the actual weighting logic
  that should *set* this value based on contributor trustworthiness was never designed in any
  phase — it's a lever with no hand on it yet.
- **The report-type taxonomy** (`duplicate_listing`, `timings_wrong`, `permanently_closed`,
  `inappropriate_content`, `wrong_contact_info`, `other`) is sourced from the original prototype's
  mock data, not independently re-confirmed against the fuller design README prose. Functionally
  real and enforced by a real CHECK constraint; just never re-derived from first principles.
- **Two color-contrast findings in the design system's own tokens, left unfixed** (see
  `PHASE_4_QA_REPORT.md` §9 for exact numbers): the faintest text tier (`--text-faint`, used for
  photo captions and similar low-emphasis copy) and the primary accent CTA button's coral
  background, both fall short of WCAG AA for small text. Fixing either changes a highly visible,
  deliberate visual choice (a text-hierarchy tier's whole point is being faint; the accent color is
  explicitly the brand's signature "one CTA per view" color) — a real design call, not something a
  QA pass should make unilaterally. **This one is closer to blocking than the others above** if the
  team has any accessibility-compliance commitment (e.g. serving a market with legal WCAG
  requirements) — flagged here, decided below.
- **S44 (catalogue add/edit) and S45 (catalogue bulk import) have no scripted E2E coverage.**
  Admin-only, lowest real-user risk of the whole admin surface, and both got the same automated
  default-state render+accessibility check every other screen got — just no button-click-through
  Playwright test exists for their specific write flows.
- **This sandbox cannot reach the live Supabase project directly** (a real, current,
  environment-specific network policy, not an application problem) — meaning the functional E2E
  suite's real pass/fail signal against a live network has still never been observed end-to-end in
  *this* environment, only inferred from the real SQL/HTTP-round-trip verification done via a
  Postgres-side workaround. **Running `npx playwright test` once in a normal, network-enabled CI
  environment before considering this "done done" is a five-minute, high-value confirmation step**
  — every spec targets already-verified real backend behavior, so the expectation is a clean pass,
  not a suite that needs rewriting.

---

## Blocking items requiring a human decision before a real public launch

- **Phone OTP needs an SMS provider chosen and configured.** Code-complete
  (`src/lib/auth.ts`'s `signUp`/`verifyOtp` call the real `supabase.auth` phone methods); genuinely
  non-functional until a provider (Twilio, MessageBird, Vonage, etc.) is picked and wired up in
  Supabase Auth settings. Open since Phase 1, unchanged.
- **Google OAuth needs an OAuth client created and configured.** Same status —
  `signInWithGoogle()` is wired to the real call, no client exists yet. Open since Phase 1,
  unchanged.
- **The two disclosed color-contrast findings above**, if the launch has any WCAG AA compliance
  commitment: someone with real design authority over the brand's coral accent and text hierarchy
  needs to make the call (accept the current shades for an MVP, or approve the specific darker
  values `PHASE_4_QA_REPORT.md` §9 computes).
- **Get a real `npx playwright test` signal from a network-enabled environment** before fully
  trusting the functional E2E suite (see above) — a real risk-reducer, not a hard blocker, since
  every one of its assertions targets already-independently-verified backend behavior.
- **`auth_leaked_password_protection` is disabled** on the Supabase project (a genuine, if minor,
  security advisory) — a one-click fix in Supabase Auth settings; no Dashboard access existed in
  any session to date to toggle it.

Nothing above is softened into a single verdict. The engineering work in the first section is real
and verified; the second section is a set of conscious simplifications a launching team should
carry knowingly; the third section is where a person, not this process, needs to decide.
