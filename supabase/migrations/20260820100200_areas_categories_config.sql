-- Phase 1 §5.2, §3: areas (neighbourhoods with tracked coverage depth), the
-- admin-managed categories lookup (S44: categories are catalogue data, not a
-- fixed code list), and app_config for the six product config flags (§3, §8).

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Display copy from the handoff, e.g. "418 places · deep coverage". This is
  -- catalogue-depth marketing copy for S4/S9, not the ranking-threshold gate —
  -- the ~50-local-ratings pick threshold (§5.8) is enforced per-place, not here.
  coverage_depth_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_home_area_id_fkey
  foreign key (home_area_id) references public.areas (id) on delete set null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is 'Admin-managed pairwise-comparison buckets (S44). A place''s category decides which ranked list a logged visit lands in — getting it wrong is called out in the handoff as the most expensive catalogue data error.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_config: the six product config flags (README "Open questions") plus the
-- ranking-threshold constant (§5.8). Stored as data, not hardcoded, so they can
-- be flipped without a migration. Only guestPaywallAt, secondComparison, and
-- ranking_threshold_locals are backend-enforced in this phase; the rest are
-- recorded here so Phase 2/3 read one source of truth instead of re-deriving
-- defaults from the design doc.
-- ---------------------------------------------------------------------------

create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

insert into public.app_config (key, value, description) values
  ('ranking_threshold_locals', '{"threshold": 50}'::jsonb,
   'Minimum places.locals count before a place can appear in pick-eligible queries (§5.8). Enforced in public.published_picks.'),
  ('guest_paywall_at', '{"search_number": 4}'::jsonb,
   'Which search number trips the guest soft paywall. Default 4th search (README Open questions #5). Enforcement is application-layer once guest session tracking (§8 open question #1) is resolved — not a DB constraint.'),
  ('second_comparison', '{"mode": "skippable"}'::jsonb,
   'Whether the second pairwise ranking comparison is always shown, skippable, or removed (README Open questions #3). Default: skippable. Consumed by public.fn_log_ranked_visit, which treats the second comparison as optional input.'),
  ('home_mode', '{"mode": "two_doors"}'::jsonb,
   'S7 layout: two doors vs. search-first (README Open questions #1). Frontend-only; recorded here for a single source of truth.'),
  ('intake_length', '{"steps": 3}'::jsonb,
   'S15 intake step count: 2 vs 3 steps (README Open questions #2). Frontend-only.'),
  ('rank_honesty', '{"mode": "rank_and_gap"}'::jsonb,
   'S19 how much ranking detail is shown: rank only / rank+gap / rank+gap+contributors (README Open questions #4). Frontend-only.'),
  ('bridge_prompt', '{"mode": "contextual_line"}'::jsonb,
   'S19/S20 bridge-tap prompt style (README Open questions #6). Frontend-only.')
on conflict (key) do nothing;
