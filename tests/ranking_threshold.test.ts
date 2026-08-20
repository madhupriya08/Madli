import { describe, it, expect } from 'vitest';
import { anonClient, adminClient, PLACE } from './helpers';

// §5.8 / §14: the ~50-local-ratings threshold, applied as a filter (view),
// configurable via app_config — not a magic number duplicated across queries.

describe('§5.8 published_picks ranking-threshold filter', () => {
  it('a place below the threshold (Mehfil, locals=9) is absent from published_picks', async () => {
    const anon = anonClient();
    const { data, error } = await anon.from('published_picks').select('id').eq('id', PLACE.mehfil);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('a place below the threshold (Charminar, locals=47) is absent from published_picks', async () => {
    const anon = anonClient();
    const { data } = await anon.from('published_picks').select('id').eq('id', PLACE.charminar);
    expect(data).toEqual([]);
  });

  it('a place at/above the threshold (Cafe Bahar, locals=61) IS present in published_picks', async () => {
    const anon = anonClient();
    const { data, error } = await anon.from('published_picks').select('id, locals').eq('id', PLACE.cafeBahar);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0]?.locals).toBeGreaterThanOrEqual(50);
  });

  it('the threshold is configurable (app_config), not a hardcoded literal — raising it removes a previously-eligible place', async () => {
    const { client: admin } = await adminClient();

    const { data: before } = await admin.from('published_picks').select('id').eq('id', PLACE.cafeBahar);
    expect(before?.length).toBe(1);

    const { error: updateError } = await admin
      .from('app_config')
      .update({ value: { threshold: 100 } })
      .eq('key', 'ranking_threshold_locals');
    expect(updateError).toBeNull();

    const { data: after } = await admin.from('published_picks').select('id').eq('id', PLACE.cafeBahar);
    expect(after).toEqual([]); // 61 locals no longer clears a 100 threshold

    // restore
    const { error: restoreError } = await admin
      .from('app_config')
      .update({ value: { threshold: 50 } })
      .eq('key', 'ranking_threshold_locals');
    expect(restoreError).toBeNull();

    const { data: restored } = await admin.from('published_picks').select('id').eq('id', PLACE.cafeBahar);
    expect(restored?.length).toBe(1);
  });

  it('a non-admin cannot change the threshold config', async () => {
    // A plain RLS USING-clause rejection is silent in PostgREST — it returns
    // success with zero affected rows, not an error. Verify via .select()
    // (which reports the actually-changed rows) rather than expecting `error`.
    const { regularUserClient } = await import('./helpers');
    const { client } = await regularUserClient();
    const { data, error } = await client
      .from('app_config')
      .update({ value: { threshold: 1 } })
      .eq('key', 'ranking_threshold_locals')
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
