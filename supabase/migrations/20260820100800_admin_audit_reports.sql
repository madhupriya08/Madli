-- Phase 1 §5.9, §5.10: reports/moderation + the general admin audit log
-- (folds in ranking overrides and weight adjustments per §5.10's suggestion).
--
-- report_type enum resolves §8 open question #5 ("report taxonomy") using the
-- concrete values in the prototype's admin reports queue (REPORT_ROWS): wrong
-- timings, permanently closed, duplicate listing, abusive content, wrong
-- contact info. This is the full list found in the material available to us;
-- flagged in the completion report as sourced-but-not-exhaustively-confirmed
-- against the full README's S49 prose (which does not itself enumerate beyond
-- "duplicate listing").

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  report_type text not null check (report_type in (
    'duplicate_listing', 'timings_wrong', 'permanently_closed',
    'inappropriate_content', 'wrong_contact_info', 'other'
  )),
  detail text,
  -- null = system/auto-flag (prototype shows "auto-flag" as a valid reporter).
  reported_by uuid references public.profiles (id),
  is_auto_flagged boolean not null default false,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_outcome text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);
create index reports_place_idx on public.reports (place_id);

create or replace function public.fn_protect_report_resolution_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.resolution_outcome is distinct from old.resolution_outcome
    or new.resolved_by is distinct from old.resolved_by
    or new.resolved_at is distinct from old.resolved_at
  then
    raise exception 'only admin may resolve reports' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reports_protect_resolution
  before update on public.reports
  for each row execute function public.fn_protect_report_resolution_fields();

-- ---------------------------------------------------------------------------
-- admin_audit_log: general append-only audit trail. event_type values drawn
-- from the prototype's AUDIT_ROWS sample (location-history read, claim
-- approval, bulk import, ranking override, user suspension, catalogue change).
-- No UPDATE/DELETE policy exists for anyone, including admin (§7, §12).
-- ---------------------------------------------------------------------------

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  event_type text not null check (event_type in (
    'ranking_override', 'weight_adjustment', 'claim_resolution',
    'catalogue_change', 'bulk_import', 'user_suspension',
    'report_resolution', 'other'
  )),
  target_type text,
  target_id uuid,
  reason text not null check (char_length(reason) > 0),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_admin_idx on public.admin_audit_log (admin_id);
create index admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

-- ---------------------------------------------------------------------------
-- fn_admin_override_ranking: guarded manual override (S46). Written reason is
-- mandatory; the audit entry is permanent (table has no UPDATE/DELETE policy
-- for anyone). SECURITY DEFINER because admin_audit_log has no direct client
-- INSERT policy at all (§7: "INSERT only via the relevant Postgres function").
-- ---------------------------------------------------------------------------

create or replace function public.fn_admin_override_ranking(
  p_place_id uuid,
  p_gap_tone text,
  p_gap_points int,
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
  if not public.can_override_ranking() then
    raise exception 'not authorized to override ranking' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'a written reason is required for a ranking override' using errcode = '22004';
  end if;
  if p_gap_tone not in ('clear', 'close', 'thin') then
    raise exception 'invalid gap_tone %', p_gap_tone;
  end if;

  update public.places
  set gap_tone = p_gap_tone, gap_points = p_gap_points
  where id = p_place_id;

  if not found then
    raise exception 'place % not found', p_place_id;
  end if;

  insert into public.admin_audit_log (admin_id, event_type, target_type, target_id, reason, detail)
  values (auth.uid(), 'ranking_override', 'place', p_place_id, p_reason,
          jsonb_build_object('gap_tone', p_gap_tone, 'gap_points', p_gap_points))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.fn_admin_override_ranking(uuid, text, int, text) from public;
grant execute on function public.fn_admin_override_ranking(uuid, text, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- fn_admin_adjust_contributor_weight: storage + override capability for
-- §5.8's per-user ranking weight (S46: "adjusting a person's weight to zero").
-- The weighting curve itself is not invented here — see profiles.ranking_weight
-- comment and the Phase 1 completion report's open items.
-- ---------------------------------------------------------------------------

create or replace function public.fn_admin_adjust_contributor_weight(
  p_target_user_id uuid,
  p_new_weight numeric,
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
  if not public.is_admin() then
    raise exception 'not authorized to adjust contributor weight' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) = 0 then
    raise exception 'a written reason is required to adjust a contributor''s weight' using errcode = '22004';
  end if;
  if p_new_weight < 0 then
    raise exception 'weight cannot be negative';
  end if;

  update public.profiles set ranking_weight = p_new_weight where id = p_target_user_id;

  if not found then
    raise exception 'user % not found', p_target_user_id;
  end if;

  insert into public.admin_audit_log (admin_id, event_type, target_type, target_id, reason, detail)
  values (auth.uid(), 'weight_adjustment', 'user', p_target_user_id, p_reason,
          jsonb_build_object('new_weight', p_new_weight))
  returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.fn_admin_adjust_contributor_weight(uuid, numeric, text) from public;
grant execute on function public.fn_admin_adjust_contributor_weight(uuid, numeric, text) to authenticated;
