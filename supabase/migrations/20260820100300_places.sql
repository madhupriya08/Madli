-- Phase 1 §5.2, §5.5: places + eat/explore child tables.
--
-- Child-table split (per §5.2's recommendation) keeps required-field validation
-- honest per type instead of a wide table of nullable columns.
--
-- Column protection design decision (§5.5, "owner edits never affect ranking"):
-- we use approach (b), a trigger, not approach (a), a table split by writer.
-- Reason: `gem` is an eat-only field (lives in place_eat_details) but is also a
-- ranking-relevant field the Owner must never touch (it is explicitly named
-- alongside category/reason/gapTone/gapPoints/locals/visitors in §5.5). A clean
-- "ranking-fields table vs owner-fields table" split doesn't work once a single
-- eat-only table has to hold both an owner-editable field (dishes) and an
-- admin-only field (gem) side by side. A trigger that protects specific columns
-- regardless of which table they live in handles that case correctly, so we
-- apply the same protective trigger to `places` and `place_eat_details`.

create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null check (type in ('eat', 'explore')),
  vibe text,
  category_id uuid not null references public.categories (id),
  neighborhood text not null,
  -- Nullable: real place neighbourhoods (e.g. "Ghansi Bazaar", "Filmnagar") are
  -- finer-grained than the 8 coverage-tracked areas in `areas`, and several
  -- seeded places don't match any tracked area at all. area_id links the two
  -- when they do match; neighborhood is always the display value of record.
  area_id uuid references public.areas (id),
  price_level text,

  -- --- ranking-relevant fields: admin-write-only, enforced by trigger below ---
  reason text not null check (char_length(reason) > 0),
  tags text[] not null default '{}',
  gap_tone text check (gap_tone in ('clear', 'close', 'thin')),
  gap_points int,
  locals int not null default 0 check (locals >= 0),
  visitors int not null default 0 check (visitors >= 0),
  drive text,
  -- Gem-scoring support (§8 open question #2, "outside fame"). The formula
  -- gem_score = outside_fame_rank - local_rank is confirmed by the admin gem
  -- queue numbers in the prototype (S47), but what *feeds* outside_fame_rank —
  -- manual admin entry vs. an external data source — is not specified. We
  -- store it as an admin-managed field; see public.gem_candidates view.
  outside_fame_rank int,
  is_active boolean not null default true,
  -- --- end ranking-relevant fields ---

  -- --- owner-editable fields (S39: hours, phone, description-type fields, contact info) ---
  history text,
  phone text,
  address text,
  hours text,
  -- --- end owner-editable fields ---

  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_slug_idx on public.places (slug);
create index places_category_idx on public.places (category_id);
create index places_type_idx on public.places (type);
create index places_area_idx on public.places (area_id);
create index places_locals_idx on public.places (locals);

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create table public.place_eat_details (
  place_id uuid primary key references public.places (id) on delete cascade,
  wait_time text,
  serving_hours text,
  dishes int check (dishes >= 0),
  -- ranking-relevant despite living on the eat-only table (see header comment).
  gem boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger place_eat_details_set_updated_at
  before update on public.place_eat_details
  for each row execute function public.set_updated_at();

create table public.place_explore_details (
  place_id uuid primary key references public.places (id) on delete cascade,
  crowd_level text,
  best text,
  updated_at timestamptz not null default now()
);

create trigger place_explore_details_set_updated_at
  before update on public.place_explore_details
  for each row execute function public.set_updated_at();

-- A place's child-detail row must match its declared type — enforced here
-- because a plain FK can't express "type-conditional" required relationships.
create or replace function public.fn_validate_place_detail_type()
returns trigger
language plpgsql
as $$
declare
  v_type text;
begin
  select type into v_type from public.places where id = new.place_id;
  if v_type is null then
    raise exception 'places row % does not exist', new.place_id;
  end if;
  if tg_table_name = 'place_eat_details' and v_type <> 'eat' then
    raise exception 'place % is type=% but place_eat_details requires type=eat', new.place_id, v_type;
  end if;
  if tg_table_name = 'place_explore_details' and v_type <> 'explore' then
    raise exception 'place % is type=% but place_explore_details requires type=explore', new.place_id, v_type;
  end if;
  return new;
end;
$$;

create trigger place_eat_details_validate_type
  before insert or update on public.place_eat_details
  for each row execute function public.fn_validate_place_detail_type();

create trigger place_explore_details_validate_type
  before insert or update on public.place_explore_details
  for each row execute function public.fn_validate_place_detail_type();

-- ---------------------------------------------------------------------------
-- §5.5 enforcement trigger: reject any non-admin UPDATE that changes a
-- ranking-relevant column, regardless of what the RLS UPDATE policy allowed
-- through (RLS controls row visibility/eligibility, not column-level intent).
-- ---------------------------------------------------------------------------

create or replace function public.fn_protect_ranking_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'places' then
    if new.category_id is distinct from old.category_id
      or new.reason is distinct from old.reason
      or new.tags is distinct from old.tags
      or new.gap_tone is distinct from old.gap_tone
      or new.gap_points is distinct from old.gap_points
      or new.locals is distinct from old.locals
      or new.visitors is distinct from old.visitors
      or new.drive is distinct from old.drive
      or new.outside_fame_rank is distinct from old.outside_fame_rank
      or new.is_active is distinct from old.is_active
      or new.slug is distinct from old.slug
      or new.name is distinct from old.name
      or new.type is distinct from old.type
      or new.neighborhood is distinct from old.neighborhood
      or new.area_id is distinct from old.area_id
      or new.price_level is distinct from old.price_level
    then
      raise exception 'ranking-relevant column change rejected: only admin may change places ranking fields (attempted by %)', auth.uid()
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'place_eat_details' then
    if new.gem is distinct from old.gem then
      raise exception 'ranking-relevant column change rejected: only admin may change gem (attempted by %)', auth.uid()
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger places_protect_ranking_fields
  before update on public.places
  for each row execute function public.fn_protect_ranking_fields();

create trigger place_eat_details_protect_ranking_fields
  before update on public.place_eat_details
  for each row execute function public.fn_protect_ranking_fields();

-- ---------------------------------------------------------------------------
-- §5.8: ranking-threshold filter as a view, not a magic number duplicated
-- across queries. Threshold is read from app_config so it stays configurable.
-- ---------------------------------------------------------------------------

create view public.published_picks as
select p.*
from public.places p
where p.is_active
  and p.locals >= (
    select coalesce((value ->> 'threshold')::int, 50)
    from public.app_config
    where key = 'ranking_threshold_locals'
  );

comment on view public.published_picks is '§5.8: places eligible to be shown as a "pick". Threshold is configurable via app_config.ranking_threshold_locals, not hardcoded.';
