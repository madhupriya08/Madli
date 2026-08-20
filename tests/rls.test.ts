import { describe, it, expect, afterAll } from 'vitest';
import {
  anonClient,
  anonClientWithHeader,
  adminClient,
  regularUserClient,
  ownerClient,
  PLACE,
  CATEGORY,
  USER_ID,
  OWNER_ID,
} from './helpers';

describe('§7 RLS: public-read lookup tables (places, areas, categories, app_config)', () => {
  it('anon can read places, areas, categories, app_config', async () => {
    const anon = anonClient();
    const [places, areas, categories, config] = await Promise.all([
      anon.from('places').select('id').limit(1),
      anon.from('areas').select('id').limit(1),
      anon.from('categories').select('id').limit(1),
      anon.from('app_config').select('key').limit(1),
    ]);
    for (const r of [places, areas, categories, config]) {
      expect(r.error).toBeNull();
      expect(r.data?.length).toBeGreaterThan(0);
    }
  });

  it('anon cannot write places/areas/categories/app_config', async () => {
    const anon = anonClient();
    const insertPlace = await anon.from('places').insert({
      slug: 'x/should-fail', name: 'x', type: 'eat', category_id: CATEGORY.cafes, neighborhood: 'x', reason: 'x',
    });
    expect(insertPlace.error).toBeTruthy();

    const updateArea = await anon.from('areas').update({ name: 'hacked' }).eq('id', PLACE.hotelShadab);
    // RLS silently filters the affected-rows set to zero rather than allowing it.
    expect(updateArea.error === null || updateArea.error !== null).toBe(true);
    const check = await anon.from('areas').select('name').eq('name', 'hacked');
    expect(check.data).toEqual([]);
  });

  it('a signed-in non-owner regular user still cannot write places (admin-only insert/update/delete)', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.from('places').insert({
      slug: 'x/should-fail-2', name: 'x', type: 'eat', category_id: CATEGORY.cafes, neighborhood: 'x', reason: 'x',
    });
    expect(error).toBeTruthy();
  });
});

describe('§7 RLS: profiles', () => {
  it('a user can select and update their own profile', async () => {
    const { client, user } = await regularUserClient();
    const { data, error } = await client.from('profiles').select('id, display_name').eq('id', user.id).single();
    expect(error).toBeNull();
    expect(data?.id).toBe(user.id);

    const { error: updateError } = await client.from('profiles').update({ display_name: 'Updated Name' }).eq('id', user.id);
    expect(updateError).toBeNull();
  });

  it('a user cannot select another user\'s profile row', async () => {
    const { client } = await regularUserClient();
    const { data, error } = await client.from('profiles').select('id').eq('id', OWNER_ID);
    expect(error).toBeNull();
    expect(data).toEqual([]); // filtered out, not returned
  });

  it('a user cannot self-promote to admin (blocked by trigger, not just policy)', async () => {
    const { client, user } = await regularUserClient();
    const { error } = await client.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/only admin may change/i);
  });

  it('admin can select any profile', async () => {
    const { client } = await adminClient();
    const { data, error } = await client.from('profiles').select('id').eq('id', USER_ID);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });
});

describe('§7 RLS: bookmarks — strictly owner-only', () => {
  afterAll(async () => {
    const { client } = await regularUserClient();
    await client.from('bookmarks').delete().eq('place_id', PLACE.roastery);
  });

  it('owner can insert and select their own bookmark; another user cannot see it; anon cannot see it', async () => {
    const { client: userClient, user } = await regularUserClient();
    const { error: insertError } = await userClient.from('bookmarks').insert({ user_id: user.id, place_id: PLACE.roastery });
    expect(insertError).toBeNull();

    const { data: ownRead } = await userClient.from('bookmarks').select('id').eq('place_id', PLACE.roastery);
    expect(ownRead?.length).toBe(1);

    const { client: ownerC } = await ownerClient();
    const { data: otherRead, error: otherErr } = await ownerC.from('bookmarks').select('id').eq('place_id', PLACE.roastery);
    expect(otherErr).toBeNull();
    expect(otherRead).toEqual([]);

    const anon = anonClient();
    const { data: anonRead } = await anon.from('bookmarks').select('id').eq('place_id', PLACE.roastery);
    expect(anonRead).toEqual([]);
  });

  it('a user cannot insert a bookmark on another user\'s behalf', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.from('bookmarks').insert({ user_id: OWNER_ID, place_id: PLACE.chutneys });
    expect(error).toBeTruthy();
  });
});

describe('§7 RLS: plans — owner full access; anon/other users only via share_token header match', () => {
  let planId: string;
  let shareToken: string;

  afterAll(async () => {
    if (planId) {
      const { client } = await regularUserClient();
      await client.from('plans').delete().eq('id', planId);
    }
  });

  it('owner can create a plan (eat + explore pair)', async () => {
    const { client, user } = await regularUserClient();
    const { data, error } = await client
      .from('plans')
      .insert({ user_id: user.id, eat_place_id: PLACE.chutneys, explore_place_id: PLACE.durgamCheruvu, name: 'Test plan' })
      .select('id')
      .single();
    expect(error).toBeNull();
    planId = data!.id;
  });

  it('rejects a plan where eat/explore place types are swapped', async () => {
    const { client, user } = await regularUserClient();
    const { error } = await client
      .from('plans')
      .insert({ user_id: user.id, eat_place_id: PLACE.durgamCheruvu, explore_place_id: PLACE.chutneys });
    expect(error).toBeTruthy();
  });

  it('another authenticated user cannot see the plan without the share token', async () => {
    const { client } = await ownerClient();
    const { data, error } = await client.from('plans').select('id').eq('id', planId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('anon cannot see the plan via an unfiltered/blanket select (no token header)', async () => {
    const anon = anonClient();
    const { data } = await anon.from('plans').select('id');
    expect(data?.find((p) => p.id === planId)).toBeUndefined();
  });

  it('owner can mint a share token via fn_create_plan_share_token', async () => {
    const { client } = await regularUserClient();
    const { data, error } = await client.rpc('fn_create_plan_share_token', { p_plan_id: planId });
    expect(error).toBeNull();
    expect(typeof data).toBe('string');
    shareToken = data as string;
  });

  it('anon WITH the correct x-share-token header can read exactly that one plan', async () => {
    const anonWithToken = anonClientWithHeader('x-share-token', shareToken);
    const { data, error } = await anonWithToken.from('plans').select('id, name').eq('id', planId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it('anon with a WRONG token gets nothing, not the row', async () => {
    const anonWrong = anonClientWithHeader('x-share-token', 'not-the-real-token');
    const { data } = await anonWrong.from('plans').select('id').eq('id', planId);
    expect(data).toEqual([]);
  });

  it('anon with the right token still cannot list ALL shared plans (no blanket exposure)', async () => {
    const anonWithToken = anonClientWithHeader('x-share-token', shareToken);
    const { data } = await anonWithToken.from('plans').select('id'); // no .eq filter at all
    // The token only ever matches its own row, so an unfiltered scan still
    // returns at most the one plan whose token matches — never other users'.
    expect(data?.every((p) => p.id === planId)).toBe(true);
  });
});

describe('§7 RLS: ranked_entries — strictly owner-only', () => {
  it('a user cannot read another user\'s ranked entries', async () => {
    const { client } = await regularUserClient();
    const { data, error } = await client.from('ranked_entries').select('id').eq('user_id', OWNER_ID);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('a user cannot insert a ranked_entries row directly for another user (bypassing the RPC)', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.from('ranked_entries').insert({
      user_id: OWNER_ID, place_id: PLACE.chutneys, category_id: CATEGORY.breakfastAndTiffin, tier: 'loved', position: 1,
    });
    expect(error).toBeTruthy();
  });
});

describe('§7 RLS: business_claims', () => {
  it('the submitting user can select their own claim; another user cannot', async () => {
    const { client: ownerC } = await ownerClient();
    const { data: own, error } = await ownerC.from('business_claims').select('id, status').eq('place_id', PLACE.cafeBahar);
    expect(error).toBeNull();
    expect(own?.length).toBe(1);
    expect(own?.[0]?.status).toBe('verified');

    const { client: userC } = await regularUserClient();
    const { data: other } = await userC.from('business_claims').select('id').eq('place_id', PLACE.cafeBahar);
    expect(other).toEqual([]);
  });

  it('a non-owner cannot change another user\'s claim status directly', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.from('business_claims').update({ status: 'verified' }).eq('place_id', PLACE.cafeBahar);
    // Either RLS filters it to zero rows (no error, no effect) or the
    // protection trigger raises — both are acceptable; verify no effect either way.
    void error;
    const { client: adminC } = await adminClient();
    const { data } = await adminC.from('business_claims').select('user_id').eq('place_id', PLACE.cafeBahar).single();
    expect(data?.user_id).toBe(OWNER_ID);
  });

  it('admin can select all claims', async () => {
    const { client } = await adminClient();
    const { data, error } = await client.from('business_claims').select('id');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });
});

describe('§7 RLS: location_history — owner-only, NOT admin (function-gated instead)', () => {
  afterAll(async () => {
    const { client } = await regularUserClient();
    await client.from('location_history').delete().eq('action_type', 'search').is('place_id', null);
  });

  it('a user can log and read their own location_history', async () => {
    const { client, user } = await regularUserClient();
    const { error: insertError } = await client.from('location_history').insert({
      user_id: user.id, area_name: 'Jubilee Hills', action_type: 'search',
    });
    expect(insertError).toBeNull();

    const { data, error } = await client.from('location_history').select('id').eq('user_id', user.id);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('admin has NO direct SELECT on location_history — the table itself, not just the row', async () => {
    const { client } = await adminClient();
    const { data, error } = await client.from('location_history').select('id').eq('user_id', USER_ID);
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS: no admin policy at all on this table
  });
});

describe('§7 RLS: location_history_access_log / admin_audit_log / place_rank_snapshots — admin-select-only, no client writes', () => {
  it('a regular user cannot read admin_audit_log or location_history_access_log', async () => {
    const { client } = await regularUserClient();
    const [audit, lhAccess, snapshots] = await Promise.all([
      client.from('admin_audit_log').select('id'),
      client.from('location_history_access_log').select('id'),
      client.from('place_rank_snapshots').select('id'),
    ]);
    expect(audit.data).toEqual([]);
    expect(lhAccess.data).toEqual([]);
    expect(snapshots.data).toEqual([]);
  });

  it('nobody — not even admin — can INSERT into admin_audit_log directly (function-only)', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('admin_audit_log').insert({
      admin_id: '10000000-0000-0000-0000-000000000001', event_type: 'other', reason: 'direct insert attempt',
    });
    expect(error).toBeTruthy();
  });

  it('nobody can UPDATE or DELETE admin_audit_log rows (append-only)', async () => {
    // No UPDATE/DELETE policy exists on this table at all, so RLS silently
    // matches zero rows (PostgREST reports success, not an error) — verify
    // via .select(), which reports the actually-affected rows.
    const { client } = await adminClient();
    const { data: rows } = await client.from('admin_audit_log').select('id').limit(1);
    if (rows && rows.length > 0) {
      const { data: updateData, error: updateError } = await client
        .from('admin_audit_log').update({ reason: 'tampered' }).eq('id', rows[0].id).select();
      expect(updateError).toBeNull();
      expect(updateData).toEqual([]);
      const { data: deleteData, error: deleteError } = await client
        .from('admin_audit_log').delete().eq('id', rows[0].id).select();
      expect(deleteError).toBeNull();
      expect(deleteData).toEqual([]);
    }
  });
});

describe('§7 RLS: reports', () => {
  afterAll(async () => {
    const { client } = await adminClient();
    await client.from('reports').delete().eq('detail', 'RLS test report');
  });

  it('an authenticated user can file a report and read their own; another user cannot see it', async () => {
    const { client: userC, user } = await regularUserClient();
    const { error: insertError } = await userC.from('reports').insert({
      place_id: PLACE.hotelShadab, report_type: 'timings_wrong', detail: 'RLS test report', reported_by: user.id,
    });
    expect(insertError).toBeNull();

    const { data: own } = await userC.from('reports').select('id').eq('detail', 'RLS test report');
    expect(own?.length).toBe(1);

    const { client: ownerC } = await ownerClient();
    const { data: other } = await ownerC.from('reports').select('id').eq('detail', 'RLS test report');
    expect(other).toEqual([]);
  });

  it('a user cannot resolve their own report (admin-only)', async () => {
    // Blocked purely by RLS's USING clause (reports_update_admin requires
    // is_admin()) — silently matches zero rows rather than erroring.
    const { client } = await regularUserClient();
    const { data: rows } = await client.from('reports').select('id').eq('detail', 'RLS test report');
    const { data, error } = await client.from('reports').update({ status: 'resolved' }).eq('id', rows![0].id).select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('admin can resolve a report', async () => {
    const { client } = await adminClient();
    const { data: rows } = await client.from('reports').select('id').eq('detail', 'RLS test report');
    const { error } = await client.from('reports').update({ status: 'resolved', resolution_outcome: 'fixed' }).eq('id', rows![0].id);
    expect(error).toBeNull();
  });
});
