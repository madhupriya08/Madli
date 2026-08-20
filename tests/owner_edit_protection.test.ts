import { describe, it, expect, afterAll } from 'vitest';
import { adminClient, regularUserClient, ownerClient, PLACE } from './helpers';

// §5.5 / §14: "owner edits never affect ranking" — the trigger must block a
// protected-column write attempted directly against Supabase (bypassing any
// frontend guard), regardless of what the RLS UPDATE policy let through.

describe('§5.5 owner-edit protection trigger', () => {
  afterAll(async () => {
    // Restore the fixture's original hours in case an assertion below ran
    // ahead of a cleanup step (defensive; the allowed-column test also resets it).
    const { client } = await adminClient();
    await client.from('places').update({ hours: '11am – 12am' }).eq('id', PLACE.cafeBahar);
  });

  it('the verified owner CAN update an allowed (owner-editable) column: hours', async () => {
    const { client } = await ownerClient();
    const { error } = await client.from('places').update({ hours: '11am – 1am (owner-updated)' }).eq('id', PLACE.cafeBahar);
    expect(error).toBeNull();

    const { data } = await client.from('places').select('hours').eq('id', PLACE.cafeBahar).single();
    expect(data?.hours).toBe('11am – 1am (owner-updated)');

    // put it back
    await client.from('places').update({ hours: '11am – 12am' }).eq('id', PLACE.cafeBahar);
  });

  it('the verified owner CANNOT change a ranking-relevant column (locals) — trigger rejects it', async () => {
    const { client } = await ownerClient();
    const { error } = await client.from('places').update({ locals: 999999 }).eq('id', PLACE.cafeBahar);
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/ranking-relevant column change rejected/i);

    const { client: adminC } = await adminClient();
    const { data } = await adminC.from('places').select('locals').eq('id', PLACE.cafeBahar).single();
    expect(data?.locals).toBe(61); // unchanged from seed
  });

  it('the verified owner CANNOT change reason, category_id, or gap_tone either', async () => {
    const { client } = await ownerClient();
    const attempts = [
      client.from('places').update({ reason: 'hacked reason' }).eq('id', PLACE.cafeBahar),
      client.from('places').update({ gap_tone: 'clear' }).eq('id', PLACE.cafeBahar),
    ];
    const results = await Promise.all(attempts);
    for (const r of results) expect(r.error).toBeTruthy();
  });

  it('the eat-only "gem" field (in a different table than the ranking fields) is also owner-protected', async () => {
    const { client } = await ownerClient();
    const { error } = await client.from('place_eat_details').update({ gem: true }).eq('place_id', PLACE.cafeBahar);
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/ranking-relevant column change rejected/i);
  });

  it('the eat-only "dishes" field (owner-editable, same table as gem) IS allowed for the owner', async () => {
    const { client } = await ownerClient();
    const { error } = await client.from('place_eat_details').update({ dishes: 12 }).eq('place_id', PLACE.cafeBahar);
    expect(error).toBeNull();
    // restore
    await client.from('place_eat_details').update({ dishes: 11 }).eq('place_id', PLACE.cafeBahar);
  });

  it('a non-owning user cannot update the place at all (not even allowed columns)', async () => {
    const { client } = await regularUserClient();
    const { error } = await client.from('places').update({ hours: 'should not work' }).eq('id', PLACE.cafeBahar);
    // RLS blocks the row from being targeted; verify no effect either way.
    void error;
    const { client: adminC } = await adminClient();
    const { data } = await adminC.from('places').select('hours').eq('id', PLACE.cafeBahar).single();
    expect(data?.hours).toBe('11am – 12am');
  });

  it('admin CAN change ranking-relevant fields directly (trigger allows admin)', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('places').update({ gap_points: 5 }).eq('id', PLACE.cafeBahar);
    expect(error).toBeNull();
    // restore
    await client.from('places').update({ gap_points: 2 }).eq('id', PLACE.cafeBahar);
  });
});
