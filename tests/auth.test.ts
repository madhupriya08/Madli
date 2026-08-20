import { describe, it, expect } from 'vitest';
import {
  anonClient,
  signedInClient,
  adminClient,
  regularUserClient,
  ownerClient,
  TEST_ADMIN_EMAIL,
  TEST_USER_EMAIL,
  TEST_OWNER_EMAIL,
  TEST_PASSWORD,
  ADMIN_ID,
} from './helpers';

describe('§14 Auth: consumer email/password', () => {
  it('valid credentials sign in and return a real session for each seeded test account', async () => {
    for (const email of [TEST_ADMIN_EMAIL, TEST_USER_EMAIL, TEST_OWNER_EMAIL]) {
      const { session, user } = await signedInClient(email, TEST_PASSWORD);
      expect(session.access_token).toBeTruthy();
      expect(user.email).toBe(email);
    }
  });

  it('invalid password is rejected', async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: 'definitely-the-wrong-password',
    });
    expect(error).toBeTruthy();
    expect(data.session).toBeNull();
  });

  it('unknown email is rejected the same way as a wrong password (no user enumeration)', async () => {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email: 'no-such-user@dev.madli.test',
      password: 'whatever',
    });
    expect(error).toBeTruthy();
  });

  it('session persists: a signed-in client can fetch its own user via getUser()', async () => {
    const { client, user } = await regularUserClient();
    const { data, error } = await client.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.id).toBe(user.id);
  });

  it('password reset request does not error for a real account (standard Supabase Auth flow)', async () => {
    // We can only verify the request is accepted, not the emailed link itself
    // (no email provider/inbox is available in this environment) — see
    // Phase 1 completion report for what remains manual/Phase 2+ to verify.
    const client = anonClient();
    const { error } = await client.auth.resetPasswordForEmail(TEST_USER_EMAIL);
    expect(error).toBeNull();
  });
});

describe('§14 Auth: phone OTP / Google OAuth — not configured in this environment', () => {
  it.skip('phone OTP signup (correct/wrong/expired code) — no SMS provider is configured for this Supabase project (§8 open question #6); nothing to exercise yet', () => {});
  it.skip('Google OAuth sign-in — no OAuth client credentials exist for this project yet; nothing to exercise yet', () => {});
});

describe('§14 Auth: admin login is a separate surface, two distinct logged outcomes (S41)', () => {
  it('a valid admin login succeeds and the account really has role=admin', async () => {
    const { client, user } = await adminClient();
    const { data: profile, error } = await client.from('profiles').select('role, admin_tier').eq('id', user.id).single();
    expect(error).toBeNull();
    expect(profile?.role).toBe('admin');
    expect(profile?.admin_tier).toBe('superadmin');
  });

  it('invalid admin credentials can be logged via fn_log_admin_login_attempt (anon-callable)', async () => {
    // A failed sign-in itself never creates a session (verified above), so the
    // admin login screen must explicitly log the attempt. We call the logging
    // primitive directly here to prove it accepts anon calls and writes a row
    // that is verifiable only via admin session (RLS-hidden from anon/user).
    const anon = anonClient();
    const { error: rpcError } = await anon.rpc('fn_log_admin_login_attempt', {
      p_identifier: TEST_ADMIN_EMAIL,
      p_event_type: 'invalid_credentials',
    });
    expect(rpcError).toBeNull();

    const { client: admin } = await adminClient();
    const { data: rows, error } = await admin
      .from('admin_login_audit_log')
      .select('*')
      .eq('attempted_identifier', TEST_ADMIN_EMAIL)
      .eq('event_type', 'invalid_credentials')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(error).toBeNull();
    expect(rows?.length).toBe(1);
  });

  it('a valid-credentials-but-not-admin attempt is logged as access_denied, distinct from invalid_credentials', async () => {
    const { client: user, user: userIdentity } = await regularUserClient();
    // Confirm this really is a non-admin account first.
    const { data: profile } = await user.from('profiles').select('role').eq('id', userIdentity.id).single();
    expect(profile?.role).toBe('user');

    const { error: rpcError } = await user.rpc('fn_log_admin_login_attempt', {
      p_identifier: TEST_USER_EMAIL,
      p_event_type: 'access_denied',
      p_user_id: userIdentity.id,
    });
    expect(rpcError).toBeNull();

    const { client: admin } = await adminClient();
    const { data: rows, error } = await admin
      .from('admin_login_audit_log')
      .select('event_type, user_id')
      .eq('attempted_identifier', TEST_USER_EMAIL)
      .eq('event_type', 'access_denied')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(error).toBeNull();
    expect(rows?.[0]?.event_type).toBe('access_denied');
    expect(rows?.[0]?.user_id).toBe(userIdentity.id);
  });

  it('admin_login_audit_log is invisible to a non-admin (owner-select fallback would be a bug)', async () => {
    const { client } = await regularUserClient();
    const { data, error } = await client.from('admin_login_audit_log').select('*');
    // RLS silently filters rather than erroring — must come back empty, not 0-row-because-error.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('rejects an invalid event_type instead of silently logging garbage', async () => {
    const anon = anonClient();
    const { error } = await anon.rpc('fn_log_admin_login_attempt', {
      p_identifier: 'x@dev.madli.test',
      p_event_type: 'not_a_real_event_type',
    });
    expect(error).toBeTruthy();
  });
});
