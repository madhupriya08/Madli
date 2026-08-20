-- Phase 1 §5.1: profiles + role model.
--
-- Design decision: "Owner" is NOT a third value of profiles.role. It is derived —
-- a profile is "in owner mode" for a place when a verified business_claims row
-- exists for (user_id, place_id). See 20260820100600_business_claims.sql.
--
-- Design decision (resolves §8 open question #4, "admin permission granularity"):
-- the design handoff's admin catalogue mock (ADMIN_ROWS in the prototype) names
-- three concrete admin tiers — Superadmin, Catalogue, Moderation — so multiple
-- admin tiers are real, not speculative. We model that as profiles.admin_tier.
-- S50 additionally states two *dangerous* capabilities are granted per role
-- (ranking override, location-history access) — modeled as explicit boolean
-- grants rather than inferred from tier name, because the exact tier→capability
-- default mapping is not specified anywhere in the material available to us.
-- Superadmin is seeded with both grants; Catalogue/Moderation seed with neither,
-- adjustable per-account by a Superadmin. This is flagged as an open item in the
-- Phase 1 completion report.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  admin_tier text check (admin_tier in ('superadmin', 'catalogue', 'moderation')),

  -- the two "dangerous capabilities" named in S50; meaningful only for admins.
  can_override_ranking boolean not null default false,
  can_access_location_history boolean not null default false,

  display_name text,
  home_area_id uuid, -- FK added after `areas` exists (see areas migration)
  phone text,

  notification_prefs jsonb not null default '{}'::jsonb,
  privacy_prefs jsonb not null default '{}'::jsonb,

  -- §5.8: storage for per-contributor ranking weight. The weighting curve/formula
  -- (S46, S32 "progress toward 25") is not specified in the material available to
  -- us — we store the value and let admin zero it out, but do not invent the
  -- formula that would normally compute or decay it. Flagged as an open item.
  ranking_weight numeric not null default 1.0,

  is_suspended boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_tier_only_for_admins check (
    (role = 'admin') or (admin_tier is null)
  ),
  constraint dangerous_grants_only_for_admins check (
    (role = 'admin') or (can_override_ranking = false and can_access_location_history = false)
  )
);

comment on table public.profiles is 'Extends auth.users. role=admin is a real elevated tier; "Owner" is derived from a verified business_claims row, not stored here.';

create index profiles_role_idx on public.profiles (role);

-- updated_at maintenance, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row when a new auth.users row is created, so every
-- authenticated identity has exactly one profiles row from signup onward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions. SECURITY DEFINER + fixed search_path is the standard
-- Supabase pattern for helpers referenced from other tables' RLS policies —
-- it avoids the recursive-RLS-evaluation problem of a SECURITY INVOKER helper
-- querying a table that is itself RLS-protected by a policy calling the helper.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_admin_tier(p_tier text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and admin_tier = p_tier
  );
$$;

create or replace function public.can_override_ranking()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and can_override_ranking = true
  );
$$;

create or replace function public.can_access_location_history()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and can_access_location_history = true
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_admin_tier(text) to authenticated, anon;
grant execute on function public.can_override_ranking() to authenticated, anon;
grant execute on function public.can_access_location_history() to authenticated, anon;
