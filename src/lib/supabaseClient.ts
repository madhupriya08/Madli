// Phase 3: the one real Supabase client for the whole frontend. Every
// data-layer seam Phase 2 marked for real Supabase wiring (src/data/,
// src/lib/liveConfig.ts) imports this instead of constructing its own client.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (see .env.example) — ' +
      'never fall back to a hardcoded value here.',
  );
}

export const supabase = createClient<Database>(url, anonKey);

/**
 * A per-request client override for the plans share-link flow (S22/S24):
 * the real RLS policy matches the `x-share-token` request header, not a
 * query filter — see src/data/plans.ts. Never reuse the module-level
 * `supabase` client for a share-token read; it would carry the caller's own
 * auth header instead.
 */
export function supabaseWithShareToken(token: string) {
  return createClient<Database>(url, anonKey, {
    global: { headers: { 'x-share-token': token } },
  });
}

/**
 * Phase 7 §7: a fresh, throwaway client for calling `auth.signUp()` on
 * someone else's behalf (S50's "create another admin") without touching the
 * calling admin's own session — `persistSession`/`autoRefreshToken` off means
 * this never writes to the shared localStorage key the module-level
 * `supabase` client owns, so the admin stays signed in as themselves.
 */
export function createDetachedAuthClient() {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
