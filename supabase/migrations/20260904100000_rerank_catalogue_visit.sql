-- P13 §6: a catalogue place, once logged, could never be re-ranked — this
-- function raised "place % is already ranked for this user; use an update
-- path instead" and no such update path existed anywhere in the schema.
-- Every "Re-rank" affordance in the app therefore had to route around the
-- catalogue mechanic entirely, which is what MyRankedListScreen's "Re-rank
-- by comparing" button did: with no place to re-rank actually chosen, it
-- fell back to whichever catalogue fixture happened to load first
-- (`places.find(p => p.isActive)`) — a fixed, unrelated place, on every
-- click, for everyone. That fallback is removed in this same round
-- (src/screens/personal/LogVisitTriggerScreen.tsx) in favour of a real
-- per-row "Re-rank" action that passes the actual place being re-ranked —
-- which needs this function to accept it instead of refusing it.
--
-- Same treatment google_place_rankings' own fn_rank_google_place already
-- gives a re-submission (20260826120000_google_place_rankings.sql): remove
-- the existing row and close the gap first, so the insert below lands in
-- its new tier/position with a contiguous sequence and the comparison
-- targets offered are the list as it will actually look afterward, not the
-- stale list from before this re-rank started.
--
-- Same signature as before (no new parameters), so this is a straight
-- `create or replace`, not a drop-and-recreate.
create or replace function public.fn_log_ranked_visit(
  p_place_id uuid,
  p_tier text,
  p_compare_place_id_1 uuid default null,
  p_preferred_new_over_1 boolean default null,
  p_compare_place_id_2 uuid default null,
  p_preferred_new_over_2 boolean default null
)
returns table (entry_id uuid, landed_position int, total_in_category int)
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_id uuid;
  v_existing_count int;
  v_prior_position int;
  v_pos_1 int;
  v_pos_2 int;
  v_insert_position int;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'fn_log_ranked_visit requires an authenticated user' using errcode = '42501';
  end if;

  if p_tier not in ('loved', 'fine', 'disliked') then
    raise exception 'invalid tier %, expected loved|fine|disliked', p_tier;
  end if;

  select category_id into v_category_id
  from public.places
  where id = p_place_id and is_active;

  if v_category_id is null then
    raise exception 'place % not found or inactive', p_place_id;
  end if;

  -- Lock this user's rows in this category for the duration of the txn so
  -- concurrent logs against the same category can't interleave the shift.
  perform 1
  from public.ranked_entries
  where user_id = v_user_id and category_id = v_category_id
  for update;

  -- P13 §6: re-ranking, not just first-ever ranking — remove the existing
  -- row and close the gap before anything else runs, so `v_existing_count`
  -- below reflects the list as it stands with this place already taken out
  -- (comparison targets can never include the place comparing against
  -- itself), and re-answering "how was it" genuinely moves the place rather
  -- than being refused outright.
  select position into v_prior_position
  from public.ranked_entries
  where user_id = v_user_id and place_id = p_place_id;

  if v_prior_position is not null then
    delete from public.ranked_entries
    where user_id = v_user_id and place_id = p_place_id;

    update public.ranked_entries
    set position = position - 1
    where user_id = v_user_id and category_id = v_category_id and position > v_prior_position;
  end if;

  select count(*) into v_existing_count
  from public.ranked_entries
  where user_id = v_user_id and category_id = v_category_id;

  if v_existing_count = 0 then
    -- First-in-category path (also covers re-ranking the only entry that
    -- was ever logged in this category — nothing left to compare against).
    v_insert_position := 1;
  else
    if p_compare_place_id_1 is null or p_preferred_new_over_1 is null then
      raise exception 'a comparison is required when category already has entries (% existing)', v_existing_count;
    end if;

    select position into v_pos_1
    from public.ranked_entries
    where user_id = v_user_id and category_id = v_category_id and place_id = p_compare_place_id_1;

    if v_pos_1 is null then
      raise exception 'comparison place % is not in this user''s category list', p_compare_place_id_1;
    end if;

    -- Single comparison: land immediately adjacent to the compared entry.
    v_insert_position := case when p_preferred_new_over_1 then v_pos_1 else v_pos_1 + 1 end;

    if p_compare_place_id_2 is not null and p_preferred_new_over_2 is not null then
      select position into v_pos_2
      from public.ranked_entries
      where user_id = v_user_id and category_id = v_category_id and place_id = p_compare_place_id_2;

      if v_pos_2 is null then
        raise exception 'comparison place % is not in this user''s category list', p_compare_place_id_2;
      end if;

      -- Refine using the second comparison only when it's internally
      -- consistent with the first (bounds the position between the two).
      declare
        v_bound_lo int := least(v_pos_1, v_pos_2);
        v_bound_hi int := greatest(v_pos_1, v_pos_2);
        v_second_position int := case when p_preferred_new_over_2 then v_pos_2 else v_pos_2 + 1 end;
      begin
        if v_second_position between v_bound_lo and v_bound_hi + 1
           and v_insert_position between v_bound_lo and v_bound_hi + 1 then
          v_insert_position := least(v_insert_position, v_second_position);
        end if;
        -- else: conflicting answers — keep the first comparison's result.
      end;
    end if;
  end if;

  update public.ranked_entries
  set position = position + 1
  where user_id = v_user_id and category_id = v_category_id and position >= v_insert_position;

  insert into public.ranked_entries (user_id, place_id, category_id, tier, position)
  values (v_user_id, p_place_id, v_category_id, p_tier, v_insert_position)
  returning id into v_entry_id;

  return query select v_entry_id, v_insert_position, v_existing_count + 1;
end;
$$;
