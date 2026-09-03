-- P14: GemOfTheTownPage used to be `places.find(p => p.gem)!` -- a single
-- hardcoded row in the seed catalogue, with a non-null assertion that threw
-- outright once that row was gone. The real thesis ("locals rate it far
-- above its outside reputation") now runs on real data: the Google place
-- with the most "loved" rankings from people who told us they live nearby.
-- Same definer-rights/public-aggregate shape as fn_google_place_ranking_counts
-- (google_place_rankings RLS is owner-only, so a public read needs this).

create or replace function public.fn_gem_of_the_town()
returns table (google_place_id text, place_name text, door text, area_text text, loved_locals int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.google_place_id,
    -- Most recent place_name/area_text for this id, in case it drifted
    -- between rankings (a place can be renamed on Google over time).
    (array_agg(r.place_name order by r.created_at desc))[1],
    (array_agg(r.door order by r.created_at desc))[1],
    (array_agg(r.area_text order by r.created_at desc))[1],
    count(*) filter (where r.tier = 'loved')::int as loved_locals
  from public.google_place_rankings r
  where r.rater_type = 'local'
  group by r.google_place_id
  having count(*) filter (where r.tier = 'loved') > 0
  order by loved_locals desc, r.google_place_id
  limit 1;
$$;

comment on function public.fn_gem_of_the_town is
  'The Google place with the most "loved" rankings from people who said they live nearby. No result until at least one local has ranked something as loved -- the marketing page shows a real empty state rather than a fallback.';
