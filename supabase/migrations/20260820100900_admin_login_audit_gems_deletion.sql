-- Phase 1: admin login audit (§5.1, §6, §14), gem-selection support (§5.8,
-- confirmed needed by S47), and guarded account deletion (§5.11).

-- ---------------------------------------------------------------------------
-- Admin login audit. S41 requires two *distinct* logged outcomes: invalid
-- credentials vs. valid-credentials-without-admin-role ("access denied").
-- Both happen before or independently of an authorization-bearing session
-- existing for the attempter, so this table's INSERT must be reachable by
-- anon. It is still write-only from the client's perspective (§7-style: no
-- SELECT for non-admins, no UPDATE/DELETE for anyone).
--
-- Known limitation (documented, not silently glossed over): true tamper-proof
-- capture of "invalid credentials" would use a Supabase Auth Password
-- Verification Hook (a Postgres function GoTrue calls on every attempt),
-- configured via project Auth settings. That project-level config is outside
-- what this migration (or the tools available in this session) can set — see
-- the Phase 1 completion report. This table + function is the callable
-- primitive; wiring the real admin login screen to call it on failure is
-- Phase 2/3 work.
-- ---------------------------------------------------------------------------

create table public.admin_login_audit_log (
  id uuid primary key default gen_random_uuid(),
  attempted_identifier text not null,
  event_type text not null check (event_type in ('invalid_credentials', 'access_denied')),
  user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index admin_login_audit_log_created_idx on public.admin_login_audit_log (created_at desc);

create or replace function public.fn_log_admin_login_attempt(p_identifier text, p_event_type text, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_event_type not in ('invalid_credentials', 'access_denied') then
    raise exception 'invalid event_type %', p_event_type;
  end if;
  insert into public.admin_login_audit_log (attempted_identifier, event_type, user_id)
  values (p_identifier, p_event_type, p_user_id);
end;
$$;

revoke all on function public.fn_log_admin_login_attempt(text, text, uuid) from public;
grant execute on function public.fn_log_admin_login_attempt(text, text, uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Gem-selection support (§5.8). Confirmed needed (not just inferred) by the
-- prototype's gem-candidates queue, which shows local-rank-vs-outside-fame
-- numbers whose arithmetic (outside_rank - local_rank = score) matches this
-- view exactly. `local_rank` here is a documented proxy — rank-by-locals-count
-- within category — standing in for the true multi-user aggregate ranking
-- algorithm, which is not specified anywhere in the material available to us
-- (§5.8 explicitly says not to invent it). Flagged as an open item.
-- ---------------------------------------------------------------------------

create table public.place_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  local_rank int not null,
  outside_fame_rank int,
  gem_score int,
  captured_at timestamptz not null default now()
);

create index place_rank_snapshots_place_idx on public.place_rank_snapshots (place_id, captured_at desc);

create view public.gem_candidates as
select
  p.id as place_id,
  p.name,
  p.category_id,
  p.locals,
  p.outside_fame_rank,
  rank() over (partition by p.category_id order by p.locals desc) as local_rank,
  (p.outside_fame_rank - rank() over (partition by p.category_id order by p.locals desc)::int) as gem_score
from public.places p
where p.is_active and p.outside_fame_rank is not null;

comment on view public.gem_candidates is 'gem_score = outside_fame_rank - local_rank, confirmed by the prototype''s gem queue numbers. local_rank is a documented proxy (rank by locals within category); the real aggregation algorithm is an open item, not invented here.';

create or replace function public.fn_admin_capture_rank_snapshot()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.place_rank_snapshots (place_id, category_id, local_rank, outside_fame_rank, gem_score)
  select place_id, category_id, local_rank, outside_fame_rank, gem_score
  from public.gem_candidates;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.fn_admin_capture_rank_snapshot() from public;
grant execute on function public.fn_admin_capture_rank_snapshot() to authenticated;

-- ---------------------------------------------------------------------------
-- §5.11: guarded account deletion. Deletes the auth.users row (cascading to
-- profiles and every user-owned table via ON DELETE CASCADE), so ranked
-- entries are genuinely removed rather than soft-flagged — "rankings
-- recalculate without you" per S36. Typed confirmation is a frontend concern;
-- p_confirm is the backend's guard against an accidental/blind call.
--
-- Known simplification (flagged, not silently assumed): this does not
-- recompute places.locals/visitors after deletion. Those are plain
-- admin-managed counts in this schema (see places migration comment), not a
-- live aggregate derived from ranked_entries — deriving them would mean
-- inventing part of the unspecified ranking-signal formula (§5.8). Real
-- recalculation of aggregate counts after a deletion is deferred alongside
-- that open item.
-- ---------------------------------------------------------------------------

create or replace function public.fn_delete_own_account(p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'fn_delete_own_account requires an authenticated user' using errcode = '42501';
  end if;
  if p_confirm is not true then
    raise exception 'account deletion requires explicit confirmation' using errcode = '22023';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.fn_delete_own_account(boolean) from public;
grant execute on function public.fn_delete_own_account(boolean) to authenticated;
