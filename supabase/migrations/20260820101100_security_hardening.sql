-- Phase 1 §12 security review follow-up: fix findings from get_advisors(security)
-- run immediately after the schema/RLS migrations.
--
-- 1) Several trigger/invoker functions were created without a locked
--    search_path (function_search_path_mutable). Lock them down.
-- 2) Supabase's schema-level default privileges grant EXECUTE on every new
--    public-schema function to `anon` and `authenticated` automatically, which
--    silently overrides a plain `revoke all ... from public`. The six
--    admin-gated functions need an explicit per-role revoke from `anon` (they
--    stay callable by `authenticated`, gated internally by is_admin()/
--    can_override_ranking()/can_access_location_history() checks — defense in
--    depth, not the sole control).

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.fn_validate_place_detail_type() set search_path = public, pg_temp;
alter function public.fn_protect_ranking_fields() set search_path = public, pg_temp;
alter function public.fn_validate_plan_place_types() set search_path = public, pg_temp;
alter function public.fn_create_plan_share_token(uuid) set search_path = public, extensions, pg_temp;
alter function public.fn_log_ranked_visit(uuid, text, uuid, boolean, uuid, boolean) set search_path = public, pg_temp;
alter function public.fn_protect_claim_resolution_fields() set search_path = public, pg_temp;
alter function public.fn_protect_report_resolution_fields() set search_path = public, pg_temp;
alter function public.fn_protect_profile_admin_fields() set search_path = public, pg_temp;

revoke execute on function public.fn_admin_read_location_history(uuid, text) from public, anon;
revoke execute on function public.fn_admin_override_ranking(uuid, text, int, text) from public, anon;
revoke execute on function public.fn_admin_adjust_contributor_weight(uuid, numeric, text) from public, anon;
revoke execute on function public.fn_admin_capture_rank_snapshot() from public, anon;
revoke execute on function public.fn_admin_list_gem_candidates() from public, anon;
revoke execute on function public.fn_delete_own_account(boolean) from public, anon;

grant execute on function public.fn_admin_read_location_history(uuid, text) to authenticated;
grant execute on function public.fn_admin_override_ranking(uuid, text, int, text) to authenticated;
grant execute on function public.fn_admin_adjust_contributor_weight(uuid, numeric, text) to authenticated;
grant execute on function public.fn_admin_capture_rank_snapshot() to authenticated;
grant execute on function public.fn_admin_list_gem_candidates() to authenticated;
grant execute on function public.fn_delete_own_account(boolean) to authenticated;

-- is_admin() / is_admin_tier() / can_override_ranking() / can_access_location_history()
-- / owns_verified_claim() / handle_new_user() remaining anon+authenticated-executable
-- is reviewed and intentional: they return only a boolean derived from the
-- caller's own auth.uid() (always false for anon, who has none), are used
-- inside RLS policies across many tables, and leak no data themselves.
-- handle_new_user() is the AFTER INSERT trigger on auth.users and is not
-- meant to be called directly, but calling it standalone is harmless (it only
-- upserts a profiles row for the caller's own new-user trigger context).
