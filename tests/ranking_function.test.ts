import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ownerClient, PLACE, CATEGORY } from './helpers';

// §5.4 / §14: the pairwise binary-insert ranking mechanic, exercised through
// real RPC calls by the owner test account (chosen because it is otherwise
// lightly used by other test files, minimizing cross-file interference even
// with fileParallelism disabled).

describe('§5.4 fn_log_ranked_visit', () => {
  let client: Awaited<ReturnType<typeof ownerClient>>['client'];

  beforeAll(async () => {
    ({ client } = await ownerClient());
    // Clean slate: remove any leftover entries in this category from a
    // previous run so "first in category" is genuinely testable.
    await client.from('ranked_entries').delete().eq('category_id', CATEGORY.breakfastAndTiffin);
  });

  afterAll(async () => {
    await client.from('ranked_entries').delete().eq('category_id', CATEGORY.breakfastAndTiffin);
  });

  it('first-in-category: no comparison required, lands at position 1', async () => {
    const { data, error } = await client.rpc('fn_log_ranked_visit', {
      p_place_id: PLACE.chutneys,
      p_tier: 'loved',
    }).single();
    expect(error).toBeNull();
    expect(data?.landed_position).toBe(1);
    expect(data?.total_in_category).toBe(1);
  });

  it('rejects a second attempt to rank the same place twice for the same user', async () => {
    const { error } = await client.rpc('fn_log_ranked_visit', { p_place_id: PLACE.chutneys, p_tier: 'loved' });
    expect(error).toBeTruthy();
  });

  it('requires a comparison once the category is non-empty', async () => {
    const { error } = await client.rpc('fn_log_ranked_visit', { p_place_id: PLACE.simplySouth, p_tier: 'fine' });
    expect(error).toBeTruthy();
  });

  it('single comparison: "preferred over" lands immediately above the compared entry', async () => {
    const { data, error } = await client
      .rpc('fn_log_ranked_visit', {
        p_place_id: PLACE.simplySouth,
        p_tier: 'loved',
        p_compare_place_id_1: PLACE.chutneys,
        p_preferred_new_over_1: true,
      })
      .single();
    expect(error).toBeNull();
    expect(data?.landed_position).toBe(1); // ahead of Chutneys, which shifts to 2
    expect(data?.total_in_category).toBe(2);

    const { data: rows } = await client
      .from('ranked_entries')
      .select('place_id, position')
      .eq('category_id', CATEGORY.breakfastAndTiffin)
      .order('position');
    expect(rows?.map((r) => r.place_id)).toEqual([PLACE.simplySouth, PLACE.chutneys]);
    expect(rows?.map((r) => r.position)).toEqual([1, 2]);
  });

  it('single comparison: "not preferred over" lands immediately below the compared entry', async () => {
    // Insert a third place, "not preferred" over Chutneys (currently pos 2) →
    // should land at position 3 (bottom), Simply South/Chutneys unaffected.
    const { data, error } = await client
      .rpc('fn_log_ranked_visit', {
        p_place_id: PLACE.mehfil,
        p_tier: 'fine',
        p_compare_place_id_1: PLACE.chutneys,
        p_preferred_new_over_1: false,
      })
      .single();
    expect(error).toBeNull();
    expect(data?.landed_position).toBe(3);
    expect(data?.total_in_category).toBe(3);
  });

  it('honors the disliked tier as a valid, distinct value (rule 5: stays logged, still positioned)', async () => {
    const { error } = await client.from('ranked_entries').delete().eq('place_id', PLACE.mehfil);
    expect(error).toBeNull();

    const { data, error: rpcError } = await client
      .rpc('fn_log_ranked_visit', {
        p_place_id: PLACE.mehfil,
        p_tier: 'disliked',
        p_compare_place_id_1: PLACE.chutneys,
        p_preferred_new_over_1: false,
      })
      .single();
    expect(rpcError).toBeNull();
    expect(data?.landed_position).toBe(3);

    // ranked_entries_visible (rule 5's read-side filter) must exclude it...
    const { data: visible } = await client.from('ranked_entries_visible').select('place_id').eq('place_id', PLACE.mehfil);
    expect(visible).toEqual([]);
    // ...but the underlying table still has it (still contributing to ranking).
    const { data: raw } = await client.from('ranked_entries').select('place_id').eq('place_id', PLACE.mehfil);
    expect(raw?.length).toBe(1);
  });

  it('rejects an invalid tier value', async () => {
    const { error } = await client.rpc('fn_log_ranked_visit', {
      p_place_id: PLACE.roastery,
      p_tier: 'not-a-real-tier',
      p_compare_place_id_1: PLACE.chutneys,
      p_preferred_new_over_1: true,
    });
    expect(error).toBeTruthy();
  });

  it('rejects a nonexistent place id', async () => {
    const { error } = await client.rpc('fn_log_ranked_visit', {
      p_place_id: '00000000-0000-0000-0000-00000000dead',
      p_tier: 'loved',
    });
    expect(error).toBeTruthy();
  });

  it('anon cannot call the ranking RPC at all', async () => {
    const { anonClient } = await import('./helpers');
    const anon = anonClient();
    const { error } = await anon.rpc('fn_log_ranked_visit', { p_place_id: PLACE.roastery, p_tier: 'loved' });
    expect(error).toBeTruthy();
  });
});
