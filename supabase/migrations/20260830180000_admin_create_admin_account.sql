-- Phase 7 §7: "add a feature to add another admin" on S50 (Roles, accounts,
-- audit log). Adding a brand-new admin — not promoting an existing signed-up
-- user — so this is a two-step operation from the client (see
-- src/data/admin.ts's createAdminAccount): an isolated, non-session-mutating
-- supabase.auth.signUp() creates the auth.users/profiles row (via the
-- existing handle_new_user() trigger, same as any other signup), then this
-- function promotes that fresh profile to admin.
--
-- Restricted to superadmin, not just any admin — creating an admin account is
-- more sensitive than the two named "dangerous capabilities" (ranking
-- override, location history), which is exactly why Phase 1's schema comment
-- describes those as adjustable "per-account by a Superadmin" in the first
-- place. is_admin_tier() already existed for this (defined for RLS use,
-- unused by any function until now).

alter table public.admin_audit_log drop constraint admin_audit_log_event_type_check;
alter table public.admin_audit_log add constraint admin_audit_log_event_type_check
  check (event_type in (
    'ranking_override', 'weight_adjustment', 'claim_resolution',
    'catalogue_change', 'bulk_import', 'user_suspension',
    'report_resolution', 'admin_account_created', 'other'
  ));

create or replace function public.fn_admin_create_admin_account(
  p_user_id uuid,
  p_admin_tier text,
  p_can_override_ranking boolean,
  p_can_access_location_history boolean,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_log_id uuid;
begin
  if not public.is_admin_tier('superadmin') then
    raise exception 'only a superadmin may create another admin account' using errcode = '42501';
  end if;
  if p_admin_tier not in ('superadmin', 'catalogue', 'moderation') then
    raise exception 'invalid admin_tier %', p_admin_tier;
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'a written reason is required to create an admin account' using errcode = '22004';
  end if;

  update public.profiles
  set role = 'admin',
      admin_tier = p_admin_tier,
      can_override_ranking = p_can_override_ranking,
      can_access_location_history = p_can_access_location_history
  where id = p_user_id;

  if not found then
    raise exception 'user % not found', p_user_id;
  end if;

  insert into public.admin_audit_log (admin_id, event_type, target_type, target_id, reason, detail)
  values (auth.uid(), 'admin_account_created', 'user', p_user_id, p_reason,
          jsonb_build_object('admin_tier', p_admin_tier,
                              'can_override_ranking', p_can_override_ranking,
                              'can_access_location_history', p_can_access_location_history))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.fn_admin_create_admin_account(uuid, text, boolean, boolean, text) from public, anon;
grant execute on function public.fn_admin_create_admin_account(uuid, text, boolean, boolean, text) to authenticated;
