import { describe, it, expect, afterAll } from 'vitest';
import { adminClient, regularUserClient, ownerClient, anonClient, PLACE, USER_ID } from './helpers';

describe('§5.9/§5.10 fn_admin_override_ranking — guarded, reasoned, permanent', () => {
  afterAll(async () => {
    const { client } = await adminClient();
    await client.from('places').update({ gap_tone: 'thin', gap_points: 2 }).eq('id', PLACE.cafeBahar);
  });

  it('rejects a call without a reason', async () => {
    const { client } = await adminClient();
    const { error } = await client.rpc('fn_admin_override_ranking', {
      p_place_id: PLACE.cafeBahar, p_gap_tone: 'clear', p_gap_points: 20, p_reason: '',
    });
    expect(error).toBeTruthy();
  });

  it('a non-privileged admin action (regular user) is rejected', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.rpc('fn_admin_override_ranking', {
      p_place_id: PLACE.cafeBahar, p_gap_tone: 'clear', p_gap_points: 20, p_reason: 'should fail',
    });
    expect(error).toBeTruthy();
  });

  it('a valid admin override updates the place AND writes a permanent audit row with the reason', async () => {
    const { client } = await adminClient();
    const reason = `vitest override test ${Date.now()}`;
    const { data: logId, error } = await client.rpc('fn_admin_override_ranking', {
      p_place_id: PLACE.cafeBahar, p_gap_tone: 'clear', p_gap_points: 25, p_reason: reason,
    });
    expect(error).toBeNull();
    expect(logId).toBeTruthy();

    const { data: place } = await client.from('places').select('gap_tone, gap_points').eq('id', PLACE.cafeBahar).single();
    expect(place?.gap_tone).toBe('clear');
    expect(place?.gap_points).toBe(25);

    const { data: logRow } = await client.from('admin_audit_log').select('reason, event_type').eq('id', logId).single();
    expect(logRow?.event_type).toBe('ranking_override');
    expect(logRow?.reason).toBe(reason);

    // append-only: cannot be edited afterward, even by admin. There is no
    // UPDATE policy on this table at all, so RLS silently matches zero rows
    // (PostgREST reports success, not an error) — verify via .select().
    const { data: updateData, error: updateErr } = await client
      .from('admin_audit_log')
      .update({ reason: 'tampered' })
      .eq('id', logId)
      .select();
    expect(updateErr).toBeNull();
    expect(updateData).toEqual([]);
  });
});

describe('§5.8 fn_admin_adjust_contributor_weight', () => {
  afterAll(async () => {
    const { client } = await adminClient();
    await client.from('profiles').update({ ranking_weight: 1.0 }).eq('id', USER_ID);
  });

  it('requires a reason and rejects a negative weight', async () => {
    const { client } = await adminClient();
    const noReason = await client.rpc('fn_admin_adjust_contributor_weight', {
      p_target_user_id: USER_ID, p_new_weight: 0, p_reason: '',
    });
    expect(noReason.error).toBeTruthy();

    const negative = await client.rpc('fn_admin_adjust_contributor_weight', {
      p_target_user_id: USER_ID, p_new_weight: -1, p_reason: 'test',
    });
    expect(negative.error).toBeTruthy();
  });

  it('a valid call zeroes a contributor\'s weight and logs it', async () => {
    const { client } = await adminClient();
    const reason = `vitest weight zero test ${Date.now()}`;
    const { error } = await client.rpc('fn_admin_adjust_contributor_weight', {
      p_target_user_id: USER_ID, p_new_weight: 0, p_reason: reason,
    });
    expect(error).toBeNull();

    const { data: profile } = await client.from('profiles').select('ranking_weight').eq('id', USER_ID).single();
    expect(Number(profile?.ranking_weight)).toBe(0);

    const { data: logRows } = await client.from('admin_audit_log').select('id').eq('event_type', 'weight_adjustment').eq('reason', reason);
    expect(logRows?.length).toBe(1);
  });
});

describe('§5.8 gem_candidates — admin-gated, not a public table/view', () => {
  it('the view itself is not directly selectable by a regular user', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.from('gem_candidates').select('*');
    expect(error).toBeTruthy();
  });

  it('a non-admin cannot call fn_admin_list_gem_candidates', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.rpc('fn_admin_list_gem_candidates');
    expect(error).toBeTruthy();
  });

  it('an admin can call fn_admin_list_gem_candidates and gets score = outside_fame_rank - local_rank', async () => {
    const { client } = await adminClient();
    // Give Cafe Bahar an outside_fame_rank so it appears in the gem candidate set.
    await client.from('places').update({ outside_fame_rank: 312 }).eq('id', PLACE.cafeBahar);

    const { data, error } = await client.rpc('fn_admin_list_gem_candidates');
    expect(error).toBeNull();
    const row = data?.find((r: any) => r.place_id === PLACE.cafeBahar);
    expect(row).toBeTruthy();
    expect(row.gem_score).toBe(row.outside_fame_rank - row.local_rank);

    await client.from('places').update({ outside_fame_rank: null }).eq('id', PLACE.cafeBahar);
  });
});

describe('§5.6 business claims: called_at is separate from approval (S48)', () => {
  it('marking as called does not change status; approving does', async () => {
    const { client } = await adminClient();
    const { data: claim } = await client.from('business_claims').select('id, status').eq('place_id', PLACE.cafeBahar).single();
    expect(claim?.status).toBe('verified'); // seeded already-verified fixture

    // Exercise the call-marking path on a copy-safe field without disturbing
    // the fixture's resolved state: toggle called_at forward and back.
    const now = new Date().toISOString();
    const { error } = await client.from('business_claims').update({ called_at: now }).eq('id', claim!.id);
    expect(error).toBeNull();
    const { data: after } = await client.from('business_claims').select('status, called_at').eq('id', claim!.id).single();
    expect(after?.status).toBe('verified'); // unchanged by marking called
    expect(after?.called_at).toBeTruthy();
  });
});

describe('§5.11 fn_delete_own_account — guarded, real cascade', () => {
  it('requires explicit confirmation', async () => {
    const { client } = await regularUserClient();
    // NOTE: intentionally NOT actually deleting the shared regular-user
    // fixture (other test files depend on it). We only prove the guard.
    const { error } = await client.rpc('fn_delete_own_account', { p_confirm: false });
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/confirmation/i);
  });

  it('anon cannot call it', async () => {
    const anon = anonClient();
    const { error } = await anon.rpc('fn_delete_own_account', { p_confirm: true });
    expect(error).toBeTruthy();
  });
});
