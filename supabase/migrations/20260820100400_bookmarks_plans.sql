-- Phase 1 §5.3: bookmarks and plans.

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  eat_place_id uuid not null references public.places (id),
  explore_place_id uuid not null references public.places (id),
  name text,
  -- Rule 3 (§3, §7): shared links open fully, no account, no cap, never expire.
  -- Nullable + unique so a plan is only publicly reachable once a token exists.
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (eat_place_id <> explore_place_id)
);

create index plans_user_idx on public.plans (user_id);
create index plans_share_token_idx on public.plans (share_token) where share_token is not null;

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create or replace function public.fn_validate_plan_place_types()
returns trigger
language plpgsql
as $$
declare
  v_eat_type text;
  v_explore_type text;
begin
  select type into v_eat_type from public.places where id = new.eat_place_id;
  select type into v_explore_type from public.places where id = new.explore_place_id;
  if v_eat_type <> 'eat' then
    raise exception 'plans.eat_place_id % must reference a place with type=eat (got %)', new.eat_place_id, v_eat_type;
  end if;
  if v_explore_type <> 'explore' then
    raise exception 'plans.explore_place_id % must reference a place with type=explore (got %)', new.explore_place_id, v_explore_type;
  end if;
  return new;
end;
$$;

create trigger plans_validate_place_types
  before insert or update on public.plans
  for each row execute function public.fn_validate_plan_place_types();

-- Callable by the owning user to mint (or rotate) a share token on demand,
-- since a plan is only shareable once a token has been generated (rule 3).
create or replace function public.fn_create_plan_share_token(p_plan_id uuid)
returns text
language plpgsql
security invoker
as $$
declare
  v_token text;
begin
  if not exists (select 1 from public.plans where id = p_plan_id and user_id = auth.uid()) then
    raise exception 'plan % not found for current user' , p_plan_id;
  end if;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  update public.plans set share_token = v_token where id = p_plan_id;

  return v_token;
end;
$$;

grant execute on function public.fn_create_plan_share_token(uuid) to authenticated;
