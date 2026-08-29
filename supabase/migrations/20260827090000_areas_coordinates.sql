-- Coordinates on `areas`, for S8's "resolve a GPS reading to the nearest
-- seeded neighbourhood."
--
-- `loadLiveConfig()` (src/lib/liveConfig.ts) overwrites the client's in-memory
-- `areas` array from this table on every boot, before the app ever renders —
-- so a client-only fixture change is not enough; without these columns the
-- live app would run S8's nearest-area lookup against rows that always carry
-- lat/lng: null, silently disabling the GPS path in every real environment
-- while it kept working in any test that never calls loadLiveConfig.
--
-- Not null, unlike places.lat/lng (20260825120000): all eight rows here are
-- seeded fixtures with a known real neighbourhood, so there is no partial or
-- not-yet-matched state to allow for the way an admin-entered place has one.

alter table public.areas
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Same bounds check as places.lat/lng, same reason: a swapped pair silently
-- drops a Hyderabad neighbourhood in the ocean, and it's cheap to catch here
-- instead of by eye later.
alter table public.areas
  drop constraint if exists areas_lat_range;
alter table public.areas
  add constraint areas_lat_range check (lat is null or (lat >= -90 and lat <= 90));

alter table public.areas
  drop constraint if exists areas_lng_range;
alter table public.areas
  add constraint areas_lng_range check (lng is null or (lng >= -180 and lng <= 180));

comment on column public.areas.lat is
  'WGS84 latitude — an approximate neighbourhood centroid for nearest-area bucketing (S8), not a surveyed geocode.';
comment on column public.areas.lng is
  'WGS84 longitude — same caveat as lat.';

-- Backfill the eight seeded rows with the same approximate centroids as
-- src/fixtures/areas.ts, matched by name (these rows predate this migration
-- and their ids are already fixed in supabase/seed.sql).
update public.areas set lat = 17.4325, lng = 78.4074 where name = 'Jubilee Hills';
update public.areas set lat = 17.4156, lng = 78.4347 where name = 'Banjara Hills';
update public.areas set lat = 17.3616, lng = 78.4747 where name = 'Old City';
update public.areas set lat = 17.4483, lng = 78.3915 where name = 'Madhapur';
update public.areas set lat = 17.4399, lng = 78.4983 where name = 'Secunderabad';
update public.areas set lat = 17.4615, lng = 78.3809 where name = 'Kondapur';
update public.areas set lat = 17.3937, lng = 78.4691 where name = 'Nampally';
update public.areas set lat = 17.5000, lng = 78.5060 where name = 'Alwal';

-- Now required going forward: every area this app knows about needs a
-- centroid for S8 to route a GPS reading to it at all.
alter table public.areas
  alter column lat set not null,
  alter column lng set not null;
