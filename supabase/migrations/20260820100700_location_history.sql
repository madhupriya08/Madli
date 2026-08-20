-- Phase 1 §5.7: location history + the admin access-logging gate.
--
-- action_type values (search|log_visit|directions) are taken directly from the
-- prototype's admin location-history rows ("why": Search / Logged a visit /
-- Directions), not invented.

create table public.location_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  area_name text,
  action_type text not null check (action_type in ('search', 'log_visit', 'directions')),
  place_id uuid references public.places (id),
  created_at timestamptz not null default now()
);

create index location_history_user_idx on public.location_history (user_id, created_at desc);

-- Dedicated table per §5.7's explicit instruction (kept separate from the
-- general admin_audit_log, which §5.10 also allows to absorb it — we follow
-- the more specific instruction literally since §5.7 names required columns
-- and behavior tied to this exact table).
create table public.location_history_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  target_user_id uuid not null references public.profiles (id),
  reason text not null check (char_length(reason) > 0),
  accessed_at timestamptz not null default now()
);

create index location_history_access_log_target_idx on public.location_history_access_log (target_user_id);

-- ---------------------------------------------------------------------------
-- fn_admin_read_location_history: the literal implementation of "the log entry
-- is created before the data loads." SECURITY DEFINER because admin has *no*
-- direct SELECT policy on location_history (see RLS migration) — this function
-- is the only path, and it enforces (1) non-null reason, (2) log row inserted,
-- (3) only then returns data, in that order, inside one transaction.
-- ---------------------------------------------------------------------------

create or replace function public.fn_admin_read_location_history(p_target_user_id uuid, p_reason text)
returns setof public.location_history
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_access_location_history() then
    raise exception 'not authorized to access location history' using errcode = '42501';
  end if;

  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'a reason is required to access location history' using errcode = '22004';
  end if;

  insert into public.location_history_access_log (admin_id, target_user_id, reason)
  values (auth.uid(), p_target_user_id, p_reason);

  return query
    select * from public.location_history
    where user_id = p_target_user_id
    order by created_at desc;
end;
$$;

revoke all on function public.fn_admin_read_location_history(uuid, text) from public;
grant execute on function public.fn_admin_read_location_history(uuid, text) to authenticated;
