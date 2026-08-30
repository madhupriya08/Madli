-- Phase 5 §1: undo a ranking-onboarding "mark as visited" answer.
--
-- fn_rank_google_place already deletes-and-shifts when re-ranking a place to
-- a *different* tier (see its "re-ranking a place already in the list"
-- branch), but there was no way to remove a ranking outright — the
-- onboarding screen's Tag buttons had no deselect path, so a mis-tap
-- permanently polluted the ranked list. This is that same delete-and-shift
-- logic, exposed as its own callable, for tapping the already-selected tier
-- again.

create or replace function public.fn_unrank_google_place(p_google_place_id text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_door text;
  v_existing_position int;
begin
  if v_user_id is null then
    raise exception 'fn_unrank_google_place requires an authenticated user' using errcode = '42501';
  end if;

  select door, position into v_door, v_existing_position
  from public.google_place_rankings
  where user_id = v_user_id and google_place_id = p_google_place_id;

  if v_existing_position is null then
    -- Nothing to undo — a double-tap or a stale UI state, not an error.
    return;
  end if;

  perform 1
  from public.google_place_rankings
  where user_id = v_user_id and door = v_door
  for update;

  delete from public.google_place_rankings
  where user_id = v_user_id and google_place_id = p_google_place_id;

  update public.google_place_rankings
  set position = position - 1
  where user_id = v_user_id and door = v_door and position > v_existing_position;
end;
$$;

-- Same anon-default-grant trap as every other function here
-- (20260820101100_security_hardening.sql, 20260826120000_google_place_rankings.sql)
-- — the explicit revoke is not optional.
revoke execute on function public.fn_unrank_google_place(text) from public, anon;
grant execute on function public.fn_unrank_google_place(text) to authenticated;
