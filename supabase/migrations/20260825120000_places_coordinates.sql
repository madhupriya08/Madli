-- Coordinates and a Google Place ID on `places`.
--
-- Until now a place carried only `address` text, so nothing could be drawn on
-- a map, no distance could be computed, and a Google search result could not
-- be recognised as a place Madli already ranks. These three columns close
-- that: `google_place_id` is the join key between a Google candidate and a
-- Madli row, `lat`/`lng` are what the map and the route need.
--
-- All three are nullable on purpose. A Madli place is real whether or not it
-- has been matched to Google yet, and a half-filled row must not become an
-- error state — the app treats a missing coordinate as "not mappable yet",
-- never as bad data.

alter table public.places
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists google_place_id text;

-- One Madli place per Google place. Partial, so the many rows still awaiting
-- a match do not collide with each other on null.
create unique index if not exists places_google_place_id_key
  on public.places (google_place_id)
  where google_place_id is not null;

-- The discovery loop's hot path: given a handful of Place IDs back from a
-- Google search, find which of them Madli already knows.
create index if not exists places_google_place_id_lookup
  on public.places (google_place_id)
  where google_place_id is not null;

comment on column public.places.lat is
  'WGS84 latitude. Null until the place has been matched to a Google place or entered by an admin.';
comment on column public.places.lng is
  'WGS84 longitude. Null until the place has been matched to a Google place or entered by an admin.';
comment on column public.places.google_place_id is
  'Google Places "place_id". The join key used to decide whether a Google search result is a place Madli already ranks. Never used to derive rank — Madli ranking comes from locals/visitors and fn_log_ranked_visit alone.';

-- Bounds check rather than a bare double: a swapped lat/lng pair is the
-- classic coordinate bug and silently puts a Hyderabad restaurant in the
-- Southern Ocean. Cheap to enforce, impossible to spot by eye later.
alter table public.places
  drop constraint if exists places_lat_range;
alter table public.places
  add constraint places_lat_range check (lat is null or (lat >= -90 and lat <= 90));

alter table public.places
  drop constraint if exists places_lng_range;
alter table public.places
  add constraint places_lng_range check (lng is null or (lng >= -180 and lng <= 180));

-- Both or neither: a lone latitude cannot be plotted and only ever reaches
-- the map as a half-broken marker.
alter table public.places
  drop constraint if exists places_latlng_together;
alter table public.places
  add constraint places_latlng_together
  check ((lat is null) = (lng is null));

-- Attaching a Google identity to an existing Madli place is an admin action,
-- not something an anonymous visitor's search should be able to write. The
-- discovery loop matches Google results to Madli rows in memory and needs no
-- write path at all; this exists so the catalogue can be backfilled
-- deliberately, by someone accountable, and logged like every other admin
-- mutation.
--
-- Note what it cannot touch: locals, visitors, rank, gap. Google identity
-- never becomes Madli ranking data.
create or replace function public.fn_admin_attach_google_place(
  p_place_id uuid,
  p_google_place_id text,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  update public.places
     set google_place_id = p_google_place_id,
         lat = p_lat,
         lng = p_lng
   where id = p_place_id;

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;

  -- Column names and the event_type vocabulary are the ones admin_audit_log
  -- actually has ('catalogue_change' from its CHECK list); reason is NOT NULL.
  insert into public.admin_audit_log (admin_id, event_type, target_type, target_id, reason, detail)
  values (
    auth.uid(),
    'catalogue_change',
    'places',
    p_place_id,
    'Attached Google Place ID and coordinates',
    jsonb_build_object('google_place_id', p_google_place_id, 'lat', p_lat, 'lng', p_lng)
  );
end;
$$;

revoke all on function public.fn_admin_attach_google_place(uuid, text, double precision, double precision) from public, anon;
grant execute on function public.fn_admin_attach_google_place(uuid, text, double precision, double precision) to authenticated;
