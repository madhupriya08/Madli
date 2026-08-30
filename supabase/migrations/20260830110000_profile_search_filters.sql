-- Phase 5 §5: server-side filter persistence for signed-in Users.
--
-- SearchProvider (src/lib/searchState.tsx) persists to sessionStorage on
-- purpose — "what I am looking for right now" should not survive into next
-- week, and that stays true for a Guest. But for a signed-in User, "in
-- progress state should survive a reload or a return visit" is a real,
-- separate ask: sessionStorage clears the moment the tab/browser session
-- ends, so reopening the app later (a different tab, a different device)
-- starts from nothing. This column is exactly the S16 filter set
-- (searchState's own FILTER_DEFAULTS shape) snapshotted per account, read
-- back once on a fresh session and only ever overwriting still-default
-- local state — never an in-progress edit.
--
-- profiles_update_own (20260820101000_rls_policies.sql) already lets an
-- authenticated user update their own row with no column restriction beyond
-- the admin-fields trigger, which does not touch this column — no RLS or
-- trigger change needed.

alter table public.profiles
  add column if not exists search_filters jsonb;

comment on column public.profiles.search_filters is 'Last-saved S16 filter selection (searchState''s FILTER_DEFAULTS shape), signed-in Users only. Read back once per fresh session to fill in still-default local filters; never overwrites an in-progress edit.';
