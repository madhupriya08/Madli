-- P12 §9: ranking a real (Google-sourced) place asks how it was, and then
-- asks how it compares to what the person already ranked in the same kind
-- of place — the new entry lands where those answers put it, instead of
-- always at the bottom of its tier block.
--
-- Why this and not fn_log_ranked_visit: that function is the catalogue's
-- pairwise mechanic and its place_id is a FK to public.places, which a
-- Google place has no row in (see 20260826120000_google_place_rankings.sql
-- for the whole reasoning). This is the same *mechanic* — "which of these
-- two did you prefer", binary insert against the existing list — applied to
-- the table that can actually hold a Google place.
--
-- Ordering rules, in priority order:
--
--  1. Tier still wins. Loved stays above fine stays above disliked, exactly
--     as before this migration. Someone who said "it was fine" cannot land
--     above a place they loved just because they preferred it in one
--     head-to-head — the tier is the stronger, more considered statement,
--     and the visible list groups by it.
--  2. Inside the tier block, the comparisons decide. Preferring the new
--     place over a comparison target puts it immediately above that target;
--     not preferring it puts it immediately below. The result is clamped
--     into the tier block so rule 1 always holds.
--  3. No comparison (nothing ranked yet in this door, or the caller chose to
--     skip) falls back to the previous behaviour: the end of the tier block.
--
--  A second comparison refines the first the same way fn_log_ranked_visit
--  does — used only when the two answers are internally consistent, ignored
--  rather than raising when they contradict each other, so an inconsistent
--  double-tap still produces a valid total order.
--
-- Which places get offered as comparison targets (same category, by Google
-- `types` overlap) is a client-side choice — see pickGoogleComparisonTargets
-- in src/data/googleRankings.ts. This function only accepts whichever
-- targets it was given, exactly like fn_log_ranked_visit.

-- A new trailing parameter changes the argument-type signature, which
-- `create or replace` cannot patch in place — same reason
-- 20260830120000_google_place_rankings_types.sql had to drop first.
drop function if exists public.fn_rank_google_place(
  text, text, text, text, double precision, double precision, text, text[]
);

create function public.fn_rank_google_place(
  p_google_place_id text,
  p_place_name text,
  p_door text,
  p_tier text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_area_text text default null,
  p_types text[] default '{}',
  p_compare_google_place_id_1 text default null,
  p_preferred_new_over_1 boolean default null,
  p_compare_google_place_id_2 text default null,
  p_preferred_new_over_2 boolean default null
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
  v_block_start int;
  v_block_end int;
  v_pos_1 int;
  v_pos_2 int;
  v_second_position int;
  v_bound_lo int;
  v_bound_hi int;
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

  -- Re-ranking a place already in the list: remove the old row and close the
  -- gap first, so the insert below lands in its new tier with a contiguous
  -- sequence.
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

  -- The tier's own block: everything strictly better sits above it, so the
  -- block starts right after them, and ends after the last row of this tier.
  select coalesce(count(*), 0) + 1 into v_block_start
  from public.google_place_rankings
  where user_id = v_user_id
    and door = p_door
    and case tier when 'loved' then 1 when 'fine' then 2 else 3 end < v_rank_of_tier;

  select coalesce(max(position), v_block_start - 1) + 1 into v_block_end
  from public.google_place_rankings
  where user_id = v_user_id
    and door = p_door
    and case tier when 'loved' then 1 when 'fine' then 2 else 3 end <= v_rank_of_tier;

  -- Rule 3: no comparison offered or answered — the end of the tier block,
  -- the behaviour before this migration.
  v_insert_position := v_block_end;

  if p_compare_google_place_id_1 is not null and p_preferred_new_over_1 is not null then
    select position into v_pos_1
    from public.google_place_rankings
    where user_id = v_user_id
      and door = p_door
      and google_place_id = p_compare_google_place_id_1;

    -- A target that is not (or no longer) in this list is not an error worth
    -- failing a real ranking over — the person answered a question about a
    -- place they had ranked, and losing that one answer is far better than
    -- losing the ranking itself. Falls through to the tier-block default.
    if v_pos_1 is not null then
      v_insert_position := case when p_preferred_new_over_1 then v_pos_1 else v_pos_1 + 1 end;

      if p_compare_google_place_id_2 is not null and p_preferred_new_over_2 is not null then
        select position into v_pos_2
        from public.google_place_rankings
        where user_id = v_user_id
          and door = p_door
          and google_place_id = p_compare_google_place_id_2;

        if v_pos_2 is not null then
          v_bound_lo := least(v_pos_1, v_pos_2);
          v_bound_hi := greatest(v_pos_1, v_pos_2);
          v_second_position :=
            case when p_preferred_new_over_2 then v_pos_2 else v_pos_2 + 1 end;

          if v_second_position between v_bound_lo and v_bound_hi + 1
             and v_insert_position between v_bound_lo and v_bound_hi + 1 then
            v_insert_position := least(v_insert_position, v_second_position);
          end if;
          -- else: contradictory answers — keep the first comparison's result.
        end if;
      end if;
    end if;
  end if;

  -- Rule 1: whatever the comparisons said, the tier block is the hard bound.
  v_insert_position := greatest(v_block_start, least(v_insert_position, v_block_end));

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

revoke execute on function public.fn_rank_google_place(
  text, text, text, text, double precision, double precision, text, text[], text, boolean, text, boolean
) from public, anon;

grant execute on function public.fn_rank_google_place(
  text, text, text, text, double precision, double precision, text, text[], text, boolean, text, boolean
) to authenticated;
