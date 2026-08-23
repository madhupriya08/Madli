-- Phase 4 §5: RolesAccountsAuditScreen's admin-accounts listing was still
-- fixture data through Phase 3 — `profiles` has no email column, and
-- `auth.users` isn't client-queryable via the anon key, and no listing
-- view/RPC existed to call instead. This closes that gap with a SECURITY
-- DEFINER function, mirroring fn_admin_read_location_history's pattern
-- exactly: admin-gated, search_path locked. The revoke/grant below applies
-- the *hardened* pattern from 20260820101100_security_hardening.sql's own
-- lesson from the start (Supabase's default privilege grants silently
-- re-open EXECUTE to anon/authenticated on a newly created function unless
-- explicitly revoked from both `public` and `anon`) rather than needing a
-- follow-up hardening migration to catch it retroactively.
--
-- Verified live (PHASE_4_QA_REPORT.md): an admin session gets the real
-- account list with real emails/tiers/grants/last-active timestamps; a
-- signed-in non-admin gets a real 42501 app-level rejection; anon can't
-- even invoke the function (a real permission-denied at the grant level).

create or replace function public.fn_admin_list_accounts()
returns table (
  id uuid,
  email text,
  role text,
  admin_tier text,
  can_override_ranking boolean,
  can_access_location_history boolean,
  is_suspended boolean,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to list admin accounts' using errcode = '42501';
  end if;

  return query
    select p.id, u.email::text, p.role, p.admin_tier, p.can_override_ranking,
           p.can_access_location_history, p.is_suspended, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin'
    order by u.last_sign_in_at desc nulls last;
end;
$$;

revoke all on function public.fn_admin_list_accounts() from public, anon;
grant execute on function public.fn_admin_list_accounts() to authenticated;
