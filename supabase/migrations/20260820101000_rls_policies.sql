-- Phase 1 §7: Row Level Security, implemented and (see vitest suite) tested
-- against real authenticated/anonymous requests, not just read as SQL.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create or replace function public.fn_protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
    or new.admin_tier is distinct from old.admin_tier
    or new.can_override_ranking is distinct from old.can_override_ranking
    or new.can_access_location_history is distinct from old.can_access_location_history
    or new.ranking_weight is distinct from old.ranking_weight
    or new.is_suspended is distinct from old.is_suspended
  then
    raise exception 'only admin may change role/admin_tier/dangerous grants/ranking_weight/is_suspended' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_admin_fields
  before update on public.profiles
  for each row execute function public.fn_protect_profile_admin_fields();

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT policy: rows are created only by handle_new_user() (SECURITY
-- DEFINER trigger on auth.users). No DELETE policy: removal only cascades
-- from an auth.users deletion via fn_delete_own_account, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- areas / categories: public read, admin write.
-- ---------------------------------------------------------------------------

alter table public.areas enable row level security;

create policy areas_select_public on public.areas for select to anon, authenticated using (true);
create policy areas_admin_write on public.areas for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.categories enable row level security;

create policy categories_select_public on public.categories for select to anon, authenticated using (true);
create policy categories_admin_write on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- app_config: public read (non-sensitive product flags), admin write.
-- ---------------------------------------------------------------------------

alter table public.app_config enable row level security;

create policy app_config_select_public on public.app_config for select to anon, authenticated using (true);
create policy app_config_admin_write on public.app_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- places / place_eat_details / place_explore_details
-- ---------------------------------------------------------------------------

alter table public.places enable row level security;

create policy places_select_public on public.places for select to anon, authenticated using (true);

create policy places_insert_admin on public.places for insert to authenticated
  with check (public.is_admin());

create policy places_update_admin_or_owner on public.places for update to authenticated
  using (public.is_admin() or public.owns_verified_claim(id))
  with check (public.is_admin() or public.owns_verified_claim(id));

create policy places_delete_admin on public.places for delete to authenticated
  using (public.is_admin());

alter table public.place_eat_details enable row level security;

create policy place_eat_details_select_public on public.place_eat_details for select to anon, authenticated using (true);
create policy place_eat_details_insert_admin on public.place_eat_details for insert to authenticated with check (public.is_admin());
create policy place_eat_details_update_admin_or_owner on public.place_eat_details for update to authenticated
  using (public.is_admin() or public.owns_verified_claim(place_id))
  with check (public.is_admin() or public.owns_verified_claim(place_id));
create policy place_eat_details_delete_admin on public.place_eat_details for delete to authenticated using (public.is_admin());

alter table public.place_explore_details enable row level security;

create policy place_explore_details_select_public on public.place_explore_details for select to anon, authenticated using (true);
create policy place_explore_details_insert_admin on public.place_explore_details for insert to authenticated with check (public.is_admin());
create policy place_explore_details_update_admin_or_owner on public.place_explore_details for update to authenticated
  using (public.is_admin() or public.owns_verified_claim(place_id))
  with check (public.is_admin() or public.owns_verified_claim(place_id));
create policy place_explore_details_delete_admin on public.place_explore_details for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- bookmarks: strictly owner-only, never anon, never another user, no admin
-- override (not required anywhere in the spec — keep least-privilege).
-- ---------------------------------------------------------------------------

alter table public.bookmarks enable row level security;

create policy bookmarks_owner_all on public.bookmarks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- plans: owning user has full access. anon/authenticated can SELECT a single
-- plan via share_token, matched against a request header (not a blanket
-- SELECT) — PostgREST exposes request headers via the `request.headers` GUC.
-- Client must send `x-share-token: <token>` to unlock the matching row.
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;

create policy plans_owner_all on public.plans for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy plans_select_by_share_token on public.plans for select to anon, authenticated
  using (
    share_token is not null
    and share_token = (current_setting('request.headers', true)::json ->> 'x-share-token')
  );

-- ---------------------------------------------------------------------------
-- ranked_entries: strictly owner-only.
-- ---------------------------------------------------------------------------

alter table public.ranked_entries enable row level security;

create policy ranked_entries_owner_all on public.ranked_entries for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- business_claims
-- ---------------------------------------------------------------------------

alter table public.business_claims enable row level security;

create policy business_claims_select_own_or_admin on public.business_claims for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy business_claims_insert_own on public.business_claims for insert to authenticated
  with check (user_id = auth.uid());

create policy business_claims_update_owner_while_pending on public.business_claims for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid());

create policy business_claims_update_admin on public.business_claims for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy business_claims_delete_admin on public.business_claims for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- location_history: owner-only SELECT/INSERT. Admin has NO SELECT policy —
-- the only admin path is fn_admin_read_location_history (SECURITY DEFINER).
-- ---------------------------------------------------------------------------

alter table public.location_history enable row level security;

create policy location_history_owner_select on public.location_history for select to authenticated
  using (user_id = auth.uid());

create policy location_history_owner_insert on public.location_history for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- location_history_access_log: admin SELECT only. No INSERT/UPDATE/DELETE
-- policy for anyone — writes happen only inside fn_admin_read_location_history.
-- ---------------------------------------------------------------------------

alter table public.location_history_access_log enable row level security;

create policy location_history_access_log_admin_select on public.location_history_access_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_audit_log: admin SELECT only. No INSERT/UPDATE/DELETE policy for
-- anyone — writes only via fn_admin_override_ranking / fn_admin_adjust_contributor_weight.
-- ---------------------------------------------------------------------------

alter table public.admin_audit_log enable row level security;

create policy admin_audit_log_admin_select on public.admin_audit_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_login_audit_log: admin SELECT only. No INSERT/UPDATE/DELETE policy —
-- writes only via fn_log_admin_login_attempt (granted to anon + authenticated).
-- ---------------------------------------------------------------------------

alter table public.admin_login_audit_log enable row level security;

create policy admin_login_audit_log_admin_select on public.admin_login_audit_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------

alter table public.reports enable row level security;

create policy reports_select_own_or_admin on public.reports for select to authenticated
  using (reported_by = auth.uid() or public.is_admin());

create policy reports_insert_own on public.reports for insert to authenticated
  with check (reported_by = auth.uid() and is_auto_flagged = false);

create policy reports_insert_admin on public.reports for insert to authenticated
  with check (public.is_admin());

create policy reports_update_admin on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- place_rank_snapshots: admin SELECT only. No client INSERT/UPDATE/DELETE —
-- writes only via fn_admin_capture_rank_snapshot.
-- ---------------------------------------------------------------------------

alter table public.place_rank_snapshots enable row level security;

create policy place_rank_snapshots_admin_select on public.place_rank_snapshots for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Views: force security_invoker so they respect the querying user's RLS on
-- underlying tables rather than the view owner's (postgres) elevated access.
-- ---------------------------------------------------------------------------

alter view public.published_picks set (security_invoker = true);
alter view public.ranked_entries_visible set (security_invoker = true);
alter view public.gem_candidates set (security_invoker = true);

-- gem_candidates surfaces places.outside_fame_rank curation data (S47, an
-- Admin-only screen) across all categories at once — lock the view itself
-- down and expose it only through an admin-gated function, consistent with
-- how location_history is gated.
revoke all on public.gem_candidates from anon, authenticated;

create or replace function public.fn_admin_list_gem_candidates()
returns setof public.gem_candidates
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query select * from public.gem_candidates;
end;
$$;

revoke all on function public.fn_admin_list_gem_candidates() from public;
grant execute on function public.fn_admin_list_gem_candidates() to authenticated;
