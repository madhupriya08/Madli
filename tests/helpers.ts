import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
export const TEST_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD!;

export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
export const TEST_OWNER_EMAIL = process.env.TEST_OWNER_EMAIL!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_PASSWORD) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / TEST_ACCOUNT_PASSWORD in .env.local');
}

// Fixed seed IDs, matching supabase/seed.sql exactly.
export const PLACE = {
  hotelShadab: '00000000-0000-0000-0000-0000000000f1',
  nimrah: '00000000-0000-0000-0000-0000000000f2',
  roastery: '00000000-0000-0000-0000-0000000000f3',
  chutneys: '00000000-0000-0000-0000-0000000000f4',
  cafeBahar: '00000000-0000-0000-0000-0000000000f5', // owner test account's verified claim
  subhanBakery: '00000000-0000-0000-0000-0000000000f6',
  rayalaseema: '00000000-0000-0000-0000-0000000000f7',
  simplySouth: '00000000-0000-0000-0000-0000000000f8',
  mehfil: '00000000-0000-0000-0000-0000000000f9', // below ranking threshold (locals=9)
  durgamCheruvu: '00000000-0000-0000-0000-0000000000e1',
  charminar: '00000000-0000-0000-0000-0000000000e5', // below threshold (locals=47)
} as const;

export const CATEGORY = {
  breakfastAndTiffin: '00000000-0000-0000-0000-0000000000c1',
  biryaniAndKebab: '00000000-0000-0000-0000-0000000000c2',
  cafes: '00000000-0000-0000-0000-0000000000c3',
} as const;

export const ADMIN_ID = '10000000-0000-0000-0000-000000000001';
export const USER_ID = '10000000-0000-0000-0000-000000000002';
export const OWNER_ID = '10000000-0000-0000-0000-000000000003';

/** An unauthenticated client — exercises the `anon` role and its RLS policies. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client that has performed a real password sign-in over HTTP (real JWT, real session). */
export async function signedInClient(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`sign-in failed for ${email}: ${error?.message}`);
  }
  return { client, session: data.session, user: data.user! };
}

export function adminClient() {
  return signedInClient(TEST_ADMIN_EMAIL, TEST_PASSWORD);
}
export function regularUserClient() {
  return signedInClient(TEST_USER_EMAIL, TEST_PASSWORD);
}
export function ownerClient() {
  return signedInClient(TEST_OWNER_EMAIL, TEST_PASSWORD);
}

/** A client that sends a raw header alongside requests — used for the plans share-token test. */
export function anonClientWithHeader(headerName: string, headerValue: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { [headerName]: headerValue } },
  });
}
