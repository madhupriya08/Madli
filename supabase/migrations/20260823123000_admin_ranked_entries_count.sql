-- Phase 4 §6/§9: found while closing the functional-audit exhaustiveness gap
-- — AnalyticsDashboardScreen (S42) was still reading Phase 2's mock store
-- directly (`mockDb.rankedEntries.length`, `mockDb.businessClaims`,
-- `mockDb.reports`), a real, previously-unnoticed conversion gap distinct
-- from §5's admin-accounts listing. Two of its three stale metrics
-- (claims pending, reports open) are already readable by an admin via
-- existing RLS (business_claims_select_own_or_admin,
-- reports_select_own_or_admin both already allow admin to see every row,
-- not just their own) — those are fixed purely client-side. "Ranked visits
-- logged" is genuinely blocked: ranked_entries' only policy
-- (ranked_entries_owner_all) is strictly owner-scoped with no admin
-- override, so an admin session cannot read this count via a plain select
-- at all. This adds one narrow, read-only, admin-gated count function for
-- it — same hardened pattern as fn_admin_list_accounts (§5): search_path
-- locked, revoked from public/anon explicitly.
--
-- Verified live (PHASE_4_QA_REPORT.md §6): admin session gets the real
-- count; a signed-in non-admin gets a real 42501.

create or replace function public.fn_admin_count_ranked_entries()
returns bigint
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to read this count' using errcode = '42501';
  end if;

  return (select count(*) from public.ranked_entries);
end;
$$;

revoke all on function public.fn_admin_count_ranked_entries() from public, anon;
grant execute on function public.fn_admin_count_ranked_entries() to authenticated;
