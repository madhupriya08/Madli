-- Phase 7 §2/§3: real numbers for AnalyticsDashboardScreen (S42).
--
-- Two kinds of gap, fixed differently:
--
-- 1. "Active users (30d)", "Plans saved", "Shares sent" have real data
--    sitting in tables an admin session cannot read directly — `plans` RLS
--    is owner-only (no admin override, same reasoning as ranked_entries: see
--    fn_admin_count_ranked_entries's own migration), and per-user
--    last_sign_in_at lives in auth.users, never exposed to the anon/
--    authenticated roles at all. Two small SECURITY DEFINER functions below,
--    same established pattern as every other fn_admin_* function.
--
-- 2. "Guest -> signup rate", "Avg. search-to-pick time", "Picks shown",
--    "Two-more rate", "Comparison-1/2 abandonment" have NO data anywhere in
--    this database at all. The existing track() calls (src/lib/analytics.ts)
--    only ever reach PostHog -- a separate, external, off-by-default system
--    this admin dashboard has no credentials to query, and most of the
--    events those tiles would need (a click on "Show me two more", a
--    comparison starting/completing) were never even fired to PostHog either.
--    A new, first-party, append-only events table plus one aggregate RPC.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users (id) on delete set null,
  -- A random id the client mints once per tab/session (sessionStorage), so a
  -- Guest's funnel (no account, no user_id) can still be correlated across
  -- screens within one visit -- see src/lib/analytics.ts's getSessionId().
  session_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is
  'First-party funnel events for the admin Analytics dashboard (S42) only -- separate from the PostHog product-analytics track() calls in src/lib/analytics.ts, which are off by default and never reach this database. Append-only: no update/delete policy exists for anyone, admin included.';

create index analytics_events_type_created_idx on public.analytics_events (event_type, created_at);
create index analytics_events_session_idx on public.analytics_events (session_id, event_type, created_at);

alter table public.analytics_events enable row level security;

-- Anyone -- Guest or signed-in -- can log an event, but only ever about
-- their own identity: a signed-in insert must carry their own uid, an
-- anonymous one must leave user_id null. Neither can write as someone else.
create policy "anyone logs an analytics event about their own session"
  on public.analytics_events for insert
  to anon, authenticated
  with check (user_id is not distinct from auth.uid());

create policy "admin reads the raw analytics event log"
  on public.analytics_events for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------

create or replace function public.fn_admin_count_active_users(p_days int default 30)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to count active users' using errcode = '42501';
  end if;

  return (
    select count(*)
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'user'
      and u.last_sign_in_at >= now() - (p_days || ' days')::interval
  );
end;
$$;

comment on function public.fn_admin_count_active_users is
  'Real Users (role=user) only -- excludes the handful of admin test accounts, which would otherwise skew a small total. Signed in at least once in the last p_days days, via auth.users.last_sign_in_at (never exposed to the client directly).';

create or replace function public.fn_admin_plan_stats()
returns table (total_plans bigint, shared_plans bigint)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to read plan stats' using errcode = '42501';
  end if;

  return query
    select count(*), count(*) filter (where share_token is not null)
    from public.plans;
end;
$$;

comment on function public.fn_admin_plan_stats is
  'plans RLS is owner-only (plans_owner_all), so an admin session cannot COUNT(*) it directly -- same reasoning as fn_admin_count_ranked_entries. shared_plans (share_token is not null) is "Shares sent": minting a share link is the one real, durable signal a share happened, without needing a new event for it.';

create or replace function public.fn_admin_funnel_stats(p_days int default 30)
returns table (
  sessions_started bigint,
  signups_completed bigint,
  results_shown_events bigint,
  total_picks_shown bigint,
  show_two_more_clicks bigint,
  comparison1_started bigint,
  comparison1_completed bigint,
  comparison2_started bigint,
  comparison2_completed bigint,
  avg_search_to_pick_seconds numeric
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  since timestamptz := now() - (p_days || ' days')::interval;
begin
  if not public.is_admin() then
    raise exception 'not authorized to read analytics events' using errcode = '42501';
  end if;

  return query
  select
    (select count(distinct session_id) from public.analytics_events
       where event_type = 'session_started' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'signup_completed' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'results_shown' and created_at >= since),
    (select coalesce(sum((metadata->>'ranked_count')::int), 0) from public.analytics_events
       where event_type = 'results_shown' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'show_two_more_clicked' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'comparison_started' and metadata->>'comparison_number' = '1' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'comparison_completed' and metadata->>'comparison_number' = '1' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'comparison_started' and metadata->>'comparison_number' = '2' and created_at >= since),
    (select count(*) from public.analytics_events
       where event_type = 'comparison_completed' and metadata->>'comparison_number' = '2' and created_at >= since),
    (select avg(extract(epoch from (po.created_at - rs.created_at)))
       from public.analytics_events po
       cross join lateral (
         select rs.created_at
         from public.analytics_events rs
         where rs.session_id = po.session_id
           and rs.event_type = 'results_shown'
           and rs.created_at <= po.created_at
         order by rs.created_at desc
         limit 1
       ) rs
       where po.event_type = 'pick_opened' and po.created_at >= since);
end;
$$;

comment on function public.fn_admin_funnel_stats is
  'One round trip for every event-derived Analytics tile. avg_search_to_pick_seconds pairs each pick_opened with the most recent preceding results_shown in the same session_id -- a real per-visit correlation, not a global average of unrelated events. Rates (guest->signup, two-more, comparison abandonment) are deliberately returned as raw counts, not pre-divided percentages, matching how Claims pending/Reports open already work -- the client computes the percentage and decides how to render a "no data yet" state.';
