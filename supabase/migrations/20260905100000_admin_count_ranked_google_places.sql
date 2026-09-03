-- P14: AnalyticsDashboardScreen's "Total places" tile read
-- `places.filter(isActive).length` -- the seed catalogue's own row count,
-- not a real product metric. The seed catalogue is being retired; the
-- honest replacement is "how many distinct real places has anyone actually
-- ranked", same reasoning and same admin-only-readable-table pattern as
-- fn_admin_count_ranked_entries (google_place_rankings RLS is owner-only,
-- so an admin session cannot COUNT(*) it directly either).

create or replace function public.fn_admin_count_ranked_google_places()
returns bigint
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to count ranked places' using errcode = '42501';
  end if;

  return (select count(distinct google_place_id) from public.google_place_rankings);
end;
$$;

comment on function public.fn_admin_count_ranked_google_places is
  'Distinct Google places with at least one ranking -- the real "how many places does this catalogue actually cover" number, replacing the seed-fixture row count once the demo catalogue is retired.';
