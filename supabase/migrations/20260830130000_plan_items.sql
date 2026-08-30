-- Phase 5 §4: multi-stop plans.
--
-- Real finding, not assumed: this codebase already has TWO divergent "plan"
-- systems today. `plans` (this table, fixed eat_place_id/explore_place_id
-- pair + a real share token + RLS) is what Phase 1-3 built, but nothing in
-- the current UI creates one any more — discovery moved to 100% live
-- Google Places (src/data/useDiscovery.ts) with no catalogue read at all,
-- and the bridge-tap "Add to plan" flow (src/screens/discovery/
-- BridgeTapScreen.tsx) was rebuilt against that reality as a client-only
-- localStorage system (src/lib/outingPlans.ts) that ALREADY supports an
-- arbitrary number of stops — its own comment says so explicitly: "Local
-- until plans support Google place ids in the Madli catalogue FK." This
-- migration is that support. Once it lands, the real gap this closes is
-- not "add multi-stop support" (the UI already has it) but "make it
-- real": today's Outing plans cannot be shared and do not survive past
-- this browser's localStorage.
--
-- `plan_items` replaces the fixed pair with an arbitrary-length, ordered
-- list, keyed the same way google_place_rankings is (Google's own id,
-- denormalised name/address/lat/lng — not a catalogue FK) since every real
-- "stop" a person adds comes from a live Google search, never the seeded
-- catalogue. The plan's own anchor (the place someone started pairing
-- from) is different: 3 of this catalogue's 17 seeded places have no
-- google_place_id at all, so the anchor is keyed on `anchor_key` — whatever
-- the app already uses as that place's identity client-side
-- (`catalogue.googlePlaceId ?? catalogue.id`, see BridgeTapScreen), not
-- assumed to always be a real Google id.

-- ---------------------------------------------------------------------------
-- plans: replace the fixed pair with a denormalised anchor + a real
-- (user_id, anchor_key) identity, so "add to plan" from the same anchor
-- twice finds the existing plan instead of creating a duplicate — exactly
-- the semantics src/lib/outingPlans.ts already has for its local plans.
-- ---------------------------------------------------------------------------

alter table public.plans
  add column if not exists anchor_key text,
  add column if not exists anchor_name text,
  add column if not exists anchor_lat double precision,
  add column if not exists anchor_lng double precision;

-- Backfill the one real existing row (a Phase 3 integration-test plan) from
-- its eat_place_id's catalogue row, before the old columns are dropped.
update public.plans p
set anchor_key = coalesce(pl.google_place_id, pl.id::text),
    anchor_name = pl.name,
    anchor_lat = pl.lat,
    anchor_lng = pl.lng
from public.places pl
where pl.id = p.eat_place_id
  and p.anchor_key is null;

alter table public.plans
  alter column anchor_key set not null,
  alter column anchor_name set not null;

alter table public.plans
  add constraint plans_anchor_coords_both_or_neither check ((anchor_lat is null) = (anchor_lng is null)),
  add constraint plans_anchor_lat_range check (anchor_lat is null or anchor_lat between -90 and 90),
  add constraint plans_anchor_lng_range check (anchor_lng is null or anchor_lng between -180 and 180),
  add constraint plans_user_anchor_unique unique (user_id, anchor_key);

comment on column public.plans.anchor_key is 'Whatever identifies the anchor place client-side — a real Google place id when one exists, the catalogue place id as text otherwise (3 of 17 seeded places have no google_place_id). Not a FK: the anchor is not always in the catalogue.';

-- ---------------------------------------------------------------------------
-- plan_items: the arbitrary-length, ordered stop list.
-- ---------------------------------------------------------------------------

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,

  -- Every real stop comes from a live Google Places search
  -- (BridgeTapScreen's "nearby" results) — never the seeded catalogue.
  google_place_id text not null,
  place_name text not null,
  address text,
  lat double precision,
  lng double precision,

  position int not null check (position > 0),
  created_at timestamptz not null default now(),

  unique (plan_id, google_place_id),
  unique (plan_id, position) deferrable initially deferred,

  constraint plan_items_coords_both_or_neither check ((lat is null) = (lng is null)),
  constraint plan_items_lat_range check (lat is null or lat between -90 and 90),
  constraint plan_items_lng_range check (lng is null or lng between -180 and 180)
);

comment on table public.plan_items is 'Ordered stops on a plan. Replaces plans.eat_place_id/explore_place_id — an arbitrary number of stops, addable after the plan is created.';

create index plan_items_plan_idx on public.plan_items (plan_id, position);

-- Migrate the one real existing plans row's fixed pair into plan_items —
-- position 1 the eat place (the anchor), position 2 the explore place.
insert into public.plan_items (plan_id, google_place_id, place_name, address, lat, lng, position)
select p.id, coalesce(pl.google_place_id, pl.id::text), pl.name, pl.address, pl.lat, pl.lng, 1
from public.plans p
join public.places pl on pl.id = p.eat_place_id;

insert into public.plan_items (plan_id, google_place_id, place_name, address, lat, lng, position)
select p.id, coalesce(pl.google_place_id, pl.id::text), pl.name, pl.address, pl.lat, pl.lng, 2
from public.plans p
join public.places pl on pl.id = p.explore_place_id;

-- ---------------------------------------------------------------------------
-- Drop the old fixed-pair structure — its type-validation trigger, the
-- columns themselves (which also drops the `eat_place_id <> explore_place_id`
-- check that referenced them), now that every row's data lives in
-- plan_items instead.
-- ---------------------------------------------------------------------------

drop trigger if exists plans_validate_place_types on public.plans;
drop function if exists public.fn_validate_plan_place_types();

alter table public.plans
  drop column eat_place_id,
  drop column explore_place_id;

-- ---------------------------------------------------------------------------
-- RLS: same owner-or-share-token shape as `plans` itself
-- (20260820101000_rls_policies.sql), joined through plan_id since plan_items
-- has no user_id of its own.
-- ---------------------------------------------------------------------------

alter table public.plan_items enable row level security;

create policy plan_items_owner_all on public.plan_items for all to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_items.plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.plans p where p.id = plan_items.plan_id and p.user_id = auth.uid()));

create policy plan_items_select_by_share_token on public.plan_items for select to anon, authenticated
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_items.plan_id
        and p.share_token is not null
        and p.share_token = (current_setting('request.headers', true)::json ->> 'x-share-token')
    )
  );

-- ---------------------------------------------------------------------------
-- fn_add_plan_item: the "add another stop" affordance, atomic against
-- concurrent adds to the same plan (same position-locking shape as
-- fn_rank_google_place/fn_log_ranked_visit). Idempotent: adding a place
-- already on the plan returns its existing position rather than erroring
-- or creating a duplicate, matching BridgeTapScreen's existing "Already on
-- your plan" UX for the local Outing system.
-- ---------------------------------------------------------------------------

create or replace function public.fn_add_plan_item(
  p_plan_id uuid,
  p_google_place_id text,
  p_place_name text,
  p_address text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (item_id uuid, landed_position int)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_next_position int;
  v_item_id uuid;
begin
  if not exists (select 1 from public.plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan % not found for current user', p_plan_id using errcode = '42501';
  end if;

  perform 1 from public.plan_items where plan_id = p_plan_id for update;

  select id, position into v_item_id, v_next_position
  from public.plan_items
  where plan_id = p_plan_id and google_place_id = p_google_place_id;

  if v_item_id is not null then
    return query select v_item_id, v_next_position;
    return;
  end if;

  select coalesce(max(position), 0) + 1 into v_next_position
  from public.plan_items where plan_id = p_plan_id;

  insert into public.plan_items (plan_id, google_place_id, place_name, address, lat, lng, position)
  values (p_plan_id, p_google_place_id, p_place_name, p_address, p_lat, p_lng, v_next_position)
  returning id into v_item_id;

  return query select v_item_id, v_next_position;
end;
$$;

revoke execute on function public.fn_add_plan_item(uuid, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.fn_add_plan_item(uuid, text, text, text, double precision, double precision) to authenticated;
