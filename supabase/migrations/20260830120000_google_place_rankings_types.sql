-- Phase 5 §3: content-based recommendations need something to compare
-- candidates against, and google_place_rankings had nowhere to keep it —
-- lat/lng/place_name are denormalised already (the same "Google place, no
-- catalogue FK" reasoning as 20260826120000_google_place_rankings.sql), but
-- Google's own place `types` (e.g. restaurant, cafe, museum, park) were
-- never stored. Without them, "score candidates by tag/category overlap
-- with what this person has ranked" has no tags to overlap with at all.

alter table public.google_place_rankings
  add column if not exists types text[] not null default '{}';

comment on column public.google_place_rankings.types is 'Google place types (e.g. restaurant, museum, park) at the time this was ranked — denormalised the same way place_name/lat/lng are, so content-based recommendations have real category data to compare against.';

-- A new trailing parameter changes the function's argument-type signature,
-- which `create or replace` cannot patch in place (Postgres identifies a
-- function by its full argument-type list, so this would otherwise create a
-- second overload alongside the old 7-arg one instead of replacing it).
drop function if exists public.fn_rank_google_place(text, text, text, text, double precision, double precision, text);

create function public.fn_rank_google_place(
  p_google_place_id text,
  p_place_name text,
  p_door text,
  p_tier text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_area_text text default null,
  p_types text[] default '{}'
)
returns table (entry_id uuid, landed_position int, total_in_door int)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_rater_type text;
  v_rank_of_tier int;
  v_existing_position int;
  v_insert_position int;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'fn_rank_google_place requires an authenticated user' using errcode = '42501';
  end if;

  if p_door not in ('eat', 'explore') then
    raise exception 'invalid door %, expected eat|explore', p_door;
  end if;

  if p_tier not in ('loved', 'fine', 'disliked') then
    raise exception 'invalid tier %, expected loved|fine|disliked', p_tier;
  end if;

  if coalesce(trim(p_google_place_id), '') = '' then
    raise exception 'google_place_id is required';
  end if;

  select resident_status into v_rater_type
  from public.profiles
  where id = v_user_id;

  if v_rater_type is null then
    raise exception 'set profiles.resident_status before ranking (local or visitor)'
      using errcode = '23514';
  end if;

  perform 1
  from public.google_place_rankings
  where user_id = v_user_id and door = p_door
  for update;

  select position into v_existing_position
  from public.google_place_rankings
  where user_id = v_user_id and google_place_id = p_google_place_id;

  if v_existing_position is not null then
    delete from public.google_place_rankings
    where user_id = v_user_id and google_place_id = p_google_place_id;

    update public.google_place_rankings
    set position = position - 1
    where user_id = v_user_id and door = p_door and position > v_existing_position;
  end if;

  v_rank_of_tier := case p_tier when 'loved' then 1 when 'fine' then 2 else 3 end;

  select coalesce(max(position), 0) + 1 into v_insert_position
  from public.google_place_rankings
  where user_id = v_user_id
    and door = p_door
    and case tier when 'loved' then 1 when 'fine' then 2 else 3 end <= v_rank_of_tier;

  update public.google_place_rankings
  set position = position + 1
  where user_id = v_user_id and door = p_door and position >= v_insert_position;

  insert into public.google_place_rankings (
    user_id, google_place_id, place_name, area_text, lat, lng, door, tier, rater_type, position, types
  )
  values (
    v_user_id, p_google_place_id, p_place_name, p_area_text, p_lat, p_lng,
    p_door, p_tier, v_rater_type, v_insert_position, coalesce(p_types, '{}')
  )
  returning id into v_entry_id;

  return query
  select v_entry_id, v_insert_position, count(*)::int
  from public.google_place_rankings
  where user_id = v_user_id and door = p_door;
end;
$$;

revoke execute on function public.fn_rank_google_place(text, text, text, text, double precision, double precision, text, text[]) from public, anon;
grant execute on function public.fn_rank_google_place(text, text, text, text, double precision, double precision, text, text[]) to authenticated;
