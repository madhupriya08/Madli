-- Phase 8 §3: "give an option to edit the plan — basically delete the
-- places from plan". plan_items already has plan_items_owner_all ("for all",
-- so DELETE included) — a plain client-side delete would already work RLS-
-- wise, but leaving the last stop's removal to two separate client round
-- trips (delete the item, then separately delete the now-empty plan) risks
-- leaving an empty, zero-stop plan behind if the second call never runs.
-- This does both atomically, in one call, same shape as fn_add_plan_item —
-- including its explicit ownership check up front: RLS alone would also
-- block a non-owner's call, but silently (0 rows affected, no error), which
-- would make this function's own return value misleading for anyone calling
-- it directly rather than through the UI. Verified live: a non-owner's call
-- now gets a real 42501 and touches nothing.

create or replace function public.fn_remove_plan_item(
  p_plan_id uuid,
  p_google_place_id text
)
returns boolean -- true if removing this stop also deleted the whole plan (it was the last one)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_remaining int;
begin
  if not exists (select 1 from public.plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan % not found for current user', p_plan_id using errcode = '42501';
  end if;

  delete from public.plan_items
  where plan_id = p_plan_id and google_place_id = p_google_place_id;

  select count(*) into v_remaining from public.plan_items where plan_id = p_plan_id;

  if v_remaining = 0 then
    delete from public.plans where id = p_plan_id;
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.fn_remove_plan_item(uuid, text) from public, anon;
grant execute on function public.fn_remove_plan_item(uuid, text) to authenticated;
