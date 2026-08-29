-- fn_area_door_counts: real place + ranking counts for Home's two doors,
-- scoped to whichever area the person is in.
--
-- Home used to show no counts at all — the two doors were a label and a
-- line of static copy, nothing that reflected the actual catalogue depth
-- behind either door. `places` and `ranked_entries` both already carry what
-- is needed (`places.area_id`/`type`/`is_active`, `ranked_entries.place_id`),
-- but `ranked_entries` RLS is strictly owner-only
-- (`ranked_entries_owner_all`, 20260820101000), so a client-side count
-- across everyone's rows is impossible without a definer-rights function —
-- the same shape as `fn_google_place_ranking_counts` (20260826120000):
-- public aggregate, private rows.
--
-- "Ranked" here means every logged entry, disliked included — Rule 5 keeps
-- a disliked visit counted even though it is filtered out of the
-- user-facing ranked list (`ranked_entries_visible`), and "how much has this
-- area actually been rated" is a participation-depth number, not a
-- what-to-show list.

create or replace function public.fn_area_door_counts(p_area_id uuid)
returns table (door text, place_count int, ranked_count int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.door,
    count(distinct p.id) filter (where p.id is not null)::int,
    count(r.id)::int
  from (values ('eat'), ('explore')) as d(door)
  left join public.places p
    on p.area_id = p_area_id and p.type = d.door and p.is_active
  left join public.ranked_entries r
    on r.place_id = p.id
  group by d.door;
$$;

comment on function public.fn_area_door_counts(uuid) is 'Real place + ranking counts per door for an area, scoped by Home. Definer-rights: ranked_entries is owner-only RLS, this exposes only an aggregate.';

-- Guests reach Home too — the whole point of this function is what Home
-- shows before anyone has signed in.
grant execute on function public.fn_area_door_counts(uuid) to anon, authenticated;
