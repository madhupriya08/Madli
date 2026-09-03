-- P14: Home's two door cards used to show "N places / M rankings logged"
-- under Eat/Explore via fn_area_door_counts, scoped to a seeded areas.id.
-- With the seed catalogue retired, `areas` is empty and that id never
-- resolves any more -- the line just silently stopped rendering, which is
-- most of why Home now reads as empty (matches everyone: the doors lost a
-- real, non-fabricated line of substance, not because it was fabricated in
-- the first place).
--
-- Live replacement, scoped the same way HomeScreen's own "your list here"
-- section already matches (src/screens/onboarding/HomeScreen.tsx's
-- rankingsHere filter): same area_text, OR within a radius of the current
-- centre. No PostGIS/earthdistance extension in this schema, so a plain
-- haversine formula in SQL -- same distance HomeScreen already computes
-- client-side via haversineMeters, just server-side so it can aggregate
-- across everyone's rows (google_place_rankings RLS is owner-only, same
-- reasoning as every other fn_google_place_ranking_counts-shaped function).

create or replace function public.fn_area_door_counts_live(
  p_area_text text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 8000
)
returns table (door text, place_count int, ranked_count int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with matches as (
    select r.door, r.google_place_id
    from public.google_place_rankings r
    where
      (p_area_text is not null and trim(lower(r.area_text)) = trim(lower(p_area_text)))
      or (
        r.lat is not null and r.lng is not null and p_lat is not null and p_lng is not null
        and 2 * 6371000 * asin(least(1, sqrt(
          sin(radians((r.lat - p_lat) / 2)) ^ 2 +
          cos(radians(p_lat)) * cos(radians(r.lat)) *
          sin(radians((r.lng - p_lng) / 2)) ^ 2
        ))) <= p_radius_meters
      )
  )
  select
    d.door,
    count(distinct m.google_place_id)::int,
    count(m.google_place_id)::int
  from (values ('eat'), ('explore')) as d(door)
  left join matches m on m.door = d.door
  group by d.door;
$$;

comment on function public.fn_area_door_counts_live is
  'Real place + ranking counts per door, scoped by area_text match or an 8km radius -- the live-data replacement for fn_area_door_counts, which required a seeded areas.id that no longer exists.';

-- Guests reach Home too -- the whole point of this function is what Home
-- shows before anyone has signed in.
grant execute on function public.fn_area_door_counts_live(text, double precision, double precision, double precision) to anon, authenticated;
