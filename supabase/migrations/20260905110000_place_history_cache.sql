-- P14: caches the AI-generated history/trivia blurb the place-history Edge
-- Function produces for a Google-sourced place when Google itself has no
-- editorial summary. One row per place, written once and reused on every
-- later view -- the point is never calling the model twice for the same
-- place, not just latency.
--
-- Written only by the Edge Function (via the service-role key, which
-- bypasses RLS entirely -- see .env.example's own note on when that key is
-- appropriate). No insert/update/delete policy exists for anon or
-- authenticated: the blurb is generated content, not something a client
-- should ever be able to write directly.

create table public.place_history_cache (
  google_place_id text primary key,
  history text not null,
  model text not null,
  created_at timestamptz not null default now()
);

comment on table public.place_history_cache is
  'AI-generated history/trivia blurb per Google place, written once by the place-history Edge Function and read by anyone after that. Clearly labeled as AI-generated in the UI -- this is a scaled fallback for when Google has no editorial summary, not verified fact.';

alter table public.place_history_cache enable row level security;

create policy "anyone reads a cached history blurb"
  on public.place_history_cache for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy for anon or authenticated, same
-- deny-by-default pattern as every other RLS-enabled table in this schema:
-- with RLS on and no matching policy, every write is rejected regardless of
-- the role's table-level grants. Only the service role (used by the Edge
-- Function, which bypasses RLS outright) can write here.
