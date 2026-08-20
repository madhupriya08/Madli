-- Phase 1 §5.4: ranked_entries + the pairwise binary-insert ranking function.

create table public.ranked_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  tier text not null check (tier in ('loved', 'fine', 'disliked')),
  -- Explicit ordering column, scoped per (user_id, category) per §5.4's literal
  -- spec. DEFERRABLE so the shift-then-insert inside fn_log_ranked_visit can't
  -- transiently violate uniqueness mid-transaction.
  position int not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id),
  unique (user_id, category_id, position) deferrable initially deferred
);

create index ranked_entries_user_category_idx on public.ranked_entries (user_id, category_id);

create trigger ranked_entries_set_updated_at
  before update on public.ranked_entries
  for each row execute function public.set_updated_at();

-- Rule 5 (§3, §7): disliked entries stay logged (keep contributing to ranking)
-- but drop out of the user-visible list. This view is the "filter in the read
-- query" side of that rule.
create view public.ranked_entries_visible as
select *
from public.ranked_entries
where tier <> 'disliked';

comment on view public.ranked_entries_visible is 'Rule 5: disliked entries stay logged for ranking but are filtered out of the user-facing ranked list here.';

-- ---------------------------------------------------------------------------
-- fn_log_ranked_visit: the pairwise binary-insert mechanic (§5.4, §9, §14).
--
-- Design decisions, documented because the material available to us specifies
-- the mechanic's *contract* (atomic insert against existing entries, returns
-- landed position) but not every UX-selection detail:
--
--  * `tier` is an explicit required input. The handoff's entities section
--    defines RankedEntry.tier independently of `position`, and §5.4 states
--    the position column is scoped per (user_id, category) — not per-tier —
--    so tier and position are stored as independent attributes here. Which
--    existing entry the frontend offers for comparison (e.g. current #1, or a
--    median) is a Phase 2/3 UX decision and intentionally out of scope for
--    this function; it only accepts whichever candidate(s) the caller chose
--    to compare against, as (place_id, "did you prefer the new place") pairs.
--  * "First in category" (no existing entries for this user+category) is a
--    distinct, valid path per §5.4 — handled below with no comparison inputs
--    required.
--  * secondComparison (app_config.second_comparison, default "skippable") is
--    honored by making the second comparison pair optional: p_compare_2 may
--    be null even when the category already has entries.
--  * If two comparisons are supplied and they are internally consistent (the
--    new entry is preferred over the higher-position/worse comparator but not
--    over the lower-position/better one), the entry lands between them. If
--    they conflict, we fall back to the first comparison's result rather than
--    erroring, so an inconsistent double-tap still produces a valid total
--    order instead of a crash.
-- ---------------------------------------------------------------------------

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

  if exists (select 1 from public.ranked_entries where user_id = v_user_id and place_id = p_place_id) then
    raise exception 'place % is already ranked for this user; use an update path instead', p_place_id;
  end if;

  -- Lock this user's rows in this category for the duration of the txn so
  -- concurrent logs against the same category can't interleave the shift.
  perform 1
  from public.ranked_entries
  where user_id = v_user_id and category_id = v_category_id
  for update;

  select count(*) into v_existing_count
  from public.ranked_entries
  where user_id = v_user_id and category_id = v_category_id;

  if v_existing_count = 0 then
    -- First-in-category path: no comparison possible or required.
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

grant execute on function public.fn_log_ranked_visit(uuid, text, uuid, boolean, uuid, boolean) to authenticated;
