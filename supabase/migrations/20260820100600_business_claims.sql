-- Phase 1 §5.6: business claims. `status = 'pending'` is a real, neutral state
-- (the handoff is explicit: not a warning/error), never rendered specially here
-- since that's a frontend concern — this migration just avoids modeling it as
-- anything but a plain enum value.
--
-- `called_at`/`called_by` are separate from approval (S48: the phone call is a
-- recorded step, not folded into the approve action).

create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,

  contact_name text,
  contact_phone text not null,
  maps_link text not null,
  business_name text not null,
  claimed_role text not null,

  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),

  called_at timestamptz,
  called_by uuid references public.profiles (id),

  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_claims_status_idx on public.business_claims (status);
create index business_claims_user_idx on public.business_claims (user_id);
create index business_claims_place_idx on public.business_claims (place_id);

-- A user may only have one active (pending or verified) claim per place at a
-- time; a rejected claim can be resubmitted, which is why this is a partial
-- unique index rather than a plain unique constraint.
create unique index business_claims_active_unique
  on public.business_claims (user_id, place_id)
  where status in ('pending', 'verified');

create trigger business_claims_set_updated_at
  before update on public.business_claims
  for each row execute function public.set_updated_at();

-- §5.1: this is the sole source of truth for "owner mode" on a place.
create or replace function public.owns_verified_claim(p_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.business_claims
    where user_id = auth.uid() and place_id = p_place_id and status = 'verified'
  );
$$;

grant execute on function public.owns_verified_claim(uuid) to authenticated;

-- Only Admin may change status/resolution fields (§7). Enforced at the trigger
-- level too, in the same style as places' protection trigger, so a client
-- can't bypass the RLS UPDATE policy's intent by relying on column-level gaps.
create or replace function public.fn_protect_claim_resolution_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.called_at is distinct from old.called_at
    or new.called_by is distinct from old.called_by
    or new.resolved_at is distinct from old.resolved_at
    or new.resolved_by is distinct from old.resolved_by
    or new.rejection_reason is distinct from old.rejection_reason
  then
    raise exception 'only admin may change business_claims resolution fields' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger business_claims_protect_resolution
  before update on public.business_claims
  for each row execute function public.fn_protect_claim_resolution_fields();
