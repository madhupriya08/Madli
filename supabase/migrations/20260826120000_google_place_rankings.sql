-- Rankings for places that came from Google, split by local and visitor.
--
-- Why a new table rather than `ranked_entries`: that table's `place_id` is a
-- FK to the Madli catalogue (17 seeded places), and discovery no longer reads
-- the catalogue at all — every candidate on the results screen is a Google
-- Place. So there was literally nothing on screen a person could rank. This
-- is keyed on `google_place_id` (text) instead, which is what discovery
-- actually has.
--
-- `ranked_entries` and fn_log_ranked_visit are untouched and still power the
-- catalogue ranking loop (S25–S27). This sits alongside them.
--
-- Local vs visitor is ASKED, never inferred. `profiles.home_area_id` is not
-- populated anywhere in the app, so deriving residency from it would be
-- inventing the number — and the design's rule is that numbers shown to
-- people are real ("412 locals · 88 visitors", never an estimate). The person
-- states it once; each ranking row snapshots the answer that was true when
-- they rated, so someone who moves does not silently rewrite their history.

-- ---------------------------------------------------------------------------
-- profiles: where the person says they are, and whether they live there.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists home_area_text text,
  add column if not exists resident_status text
    check (resident_status in ('local', 'visitor'));

comment on column public.profiles.resident_status is 'Self-declared: do you live in your home area, or are you visiting. Snapshotted onto each ranking row; never inferred from coordinates.';

-- ---------------------------------------------------------------------------
-- The rankings themselves.
-- ---------------------------------------------------------------------------

create table public.google_place_rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- Google's own id. Not a FK anywhere — the whole point is that these places
  -- are not in the catalogue.
  google_place_id text not null,

  -- Denormalised on purpose: without them a ranked list could only be
  -- rendered by re-querying Google for every row, which costs money per view
  -- and breaks entirely when the key is missing.
  place_name text not null,
  area_text text,
  lat double precision,
  lng double precision,

  door text not null check (door in ('eat', 'explore')),
  tier text not null check (tier in ('loved', 'fine', 'disliked')),

  -- Snapshot of profiles.resident_status at the moment of rating.
  rater_type text not null check (rater_type in ('local', 'visitor')),

  -- Explicit ordering, scoped per (user, door) — the same shape as
  -- ranked_entries.position, which is scoped per (user, category).
  position int not null check (position > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, google_place_id),
  unique (user_id, door, position) deferrable initially deferred,

  constraint google_place_rankings_coords_both_or_neither check (
    (lat is null) = (lng is null)
  ),
  constraint google_place_rankings_lat_range check (lat is null or lat between -90 and 90),
  constraint google_place_rankings_lng_range check (lng is null or lng between -180 and 180)
);

comment on table public.google_place_rankings is 'Personal rankings of Google Places, split local/visitor. Separate from ranked_entries because discovery is Google-only and those places have no catalogue row.';

create index google_place_rankings_place_idx on public.google_place_rankings (google_place_id);
create index google_place_rankings_user_door_idx on public.google_place_rankings (user_id, door);

create trigger google_place_rankings_set_updated_at
  before update on public.google_place_rankings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: your rankings are yours. Aggregate counts are served by the SECURITY
-- DEFINER function below, so nobody reads anyone else's individual rows.
-- ---------------------------------------------------------------------------

alter table public.google_place_rankings enable row level security;

create policy google_place_rankings_select_own on public.google_place_rankings
  for select to authenticated
  using (user_id = auth.uid());

create policy google_place_rankings_insert_own on public.google_place_rankings
  for insert to authenticated
  with check (user_id = auth.uid());

create policy google_place_rankings_update_own on public.google_place_rankings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy google_place_rankings_delete_own on public.google_place_rankings
  for delete to authenticated
  using (user_id = auth.uid());

-- Admins can read them for moderation, matching how every other user-authored
-- table in this schema behaves.
create policy google_place_rankings_admin_select on public.google_place_rankings
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- fn_rank_google_place: log one ranking and return where it landed.
--
-- Deliberately NOT the pairwise binary-insert mechanic of
-- fn_log_ranked_visit. That mechanic needs an existing ranked list in the
-- same category to compare against, and this runs at first-open when the
-- person has nothing ranked yet. Ordering here is by tier — loved above fine
-- above disliked, newest last within a tier — which is a real total order
-- derived from what the person actually said, not a comparison we invented on
-- their behalf. When they later rank catalogue places, S26's pairwise loop
-- still applies there.
-- ---------------------------------------------------------------------------

create or replace function public.fn_rank_google_place(
  p_google_place_id text,
  p_place_name text,
  p_door text,
  p_tier text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_area_text text default null
)
returns table (entry_id uuid, landed_position int, total_in_door int)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_rater_type text;
  v_rank_of_tier int;
  v_existing_position int;
  v_insert_position int;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'fn_rank_google_place requires an authenticated user' using errcode = '42501';
  end if;

  if p_door not in ('eat', 'explore') then
    raise exception 'invalid door %, expected eat|explore', p_door;
  end if;

  if p_tier not in ('loved', 'fine', 'disliked') then
    raise exception 'invalid tier %, expected loved|fine|disliked', p_tier;
  end if;

  if coalesce(trim(p_google_place_id), '') = '' then
    raise exception 'google_place_id is required';
  end if;

  -- Residency is whatever the person last told us. It is required: storing a
  -- ranking we cannot attribute to a local or a visitor would make the
  -- aggregate counts below unsplittable, which is the entire point of them.
  select resident_status into v_rater_type
  from public.profiles
  where id = v_user_id;

  if v_rater_type is null then
    raise exception 'set profiles.resident_status before ranking (local or visitor)'
      using errcode = '23514';
  end if;

  -- Lock this user's rows in this door so concurrent ranks cannot interleave
  -- the position shift below.
  perform 1
  from public.google_place_rankings
  where user_id = v_user_id and door = p_door
  for update;

  -- Re-ranking a place already in the list: remove the old row and close the
  -- gap first, so the insert below lands in its new tier with a contiguous
  -- sequence. An ON CONFLICT upsert cannot do this — the position shift has
  -- already happened by then, and the row that would have filled the hole is
  -- never inserted.
  select position into v_existing_position
  from public.google_place_rankings
  where user_id = v_user_id and google_place_id = p_google_place_id;

  if v_existing_position is not null then
    delete from public.google_place_rankings
    where user_id = v_user_id and google_place_id = p_google_place_id;

    update public.google_place_rankings
    set position = position - 1
    where user_id = v_user_id and door = p_door and position > v_existing_position;
  end if;

  v_rank_of_tier := case p_tier when 'loved' then 1 when 'fine' then 2 else 3 end;

  -- Land at the end of this tier's block: after everything in a better or
  -- equal tier, before everything in a worse one.
  select coalesce(max(position), 0) + 1 into v_insert_position
  from public.google_place_rankings
  where user_id = v_user_id
    and door = p_door
    and case tier when 'loved' then 1 when 'fine' then 2 else 3 end <= v_rank_of_tier;

  update public.google_place_rankings
  set position = position + 1
  where user_id = v_user_id and door = p_door and position >= v_insert_position;

  insert into public.google_place_rankings (
    user_id, google_place_id, place_name, area_text, lat, lng, door, tier, rater_type, position
  )
  values (
    v_user_id, p_google_place_id, p_place_name, p_area_text, p_lat, p_lng,
    p_door, p_tier, v_rater_type, v_insert_position
  )
  returning id into v_entry_id;

  return query
  select v_entry_id, v_insert_position, count(*)::int
  from public.google_place_rankings
  where user_id = v_user_id and door = p_door;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_google_place_ranking_counts: the "3 locals · 1 visitor" line.
--
-- SECURITY DEFINER so it can aggregate across everyone's rows without any
-- caller being able to read an individual one. Disliked entries are counted
-- separately rather than dropped: they are real ratings, and hiding them
-- would inflate the two visible numbers.
-- ---------------------------------------------------------------------------

create or replace function public.fn_google_place_ranking_counts(p_google_place_ids text[])
returns table (
  google_place_id text,
  locals int,
  visitors int,
  locals_disliked int,
  visitors_disliked int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.google_place_id,
    count(*) filter (where r.rater_type = 'local' and r.tier <> 'disliked')::int,
    count(*) filter (where r.rater_type = 'visitor' and r.tier <> 'disliked')::int,
    count(*) filter (where r.rater_type = 'local' and r.tier = 'disliked')::int,
    count(*) filter (where r.rater_type = 'visitor' and r.tier = 'disliked')::int
  from public.google_place_rankings r
  where r.google_place_id = any (p_google_place_ids)
  group by r.google_place_id;
$$;

comment on function public.fn_google_place_ranking_counts(text[]) is 'Aggregate local/visitor ranking counts for a set of Google Place IDs. Definer-rights so counts are public while individual rows stay private.';

-- The revoke is not optional and an absent grant is not enough: Supabase's
-- schema-level default privileges grant EXECUTE on every new public-schema
-- function to anon and authenticated automatically, which silently overrides
-- a plain `revoke all ... from public`. Same trap
-- 20260820101100_security_hardening.sql documents for the admin-gated
-- functions — verified live here, where anon held EXECUTE on this until the
-- explicit per-role revoke below.
--
-- fn_rank_google_place already raises 42501 when auth.uid() is null, so this
-- is defense in depth, not the sole control.
revoke execute on function public.fn_rank_google_place(text, text, text, text, double precision, double precision, text) from public, anon;
grant execute on function public.fn_rank_google_place(text, text, text, text, double precision, double precision, text) to authenticated;

-- Counts are shown on results, which guests reach — anon keeps EXECUTE here
-- deliberately. It returns only aggregates over an explicit id list, never a
-- row and never a user id.
grant execute on function public.fn_google_place_ranking_counts(text[]) to anon, authenticated;
