import { describe, it, expect, afterAll } from 'vitest';
import { regularUserClient, ownerClient, adminClient, PLACE, CATEGORY } from './helpers';

describe('§14 failure cases: duplicate data where uniqueness is required', () => {
  afterAll(async () => {
    const { client } = await regularUserClient();
    await client.from('bookmarks').delete().eq('place_id', PLACE.subhanBakery);
  });

  it('duplicate bookmark (same user, same place) is rejected by the unique constraint', async () => {
    const { client, user } = await regularUserClient();
    const first = await client.from('bookmarks').insert({ user_id: user.id, place_id: PLACE.subhanBakery });
    expect(first.error).toBeNull();
    const second = await client.from('bookmarks').insert({ user_id: user.id, place_id: PLACE.subhanBakery });
    expect(second.error).toBeTruthy();
  });

  it('a second PENDING business claim by the same user on a place they already have verified is rejected', async () => {
    const { client, user } = await ownerClient();
    const { error } = await client.from('business_claims').insert({
      user_id: user.id, place_id: PLACE.cafeBahar, contact_phone: '+91 90000 00000',
      maps_link: 'https://maps.google.com/?q=x', business_name: 'Cafe Bahar', claimed_role: 'Owner',
    });
    expect(error).toBeTruthy(); // business_claims_active_unique partial index
  });
});

describe('§14 failure cases: invalid / missing input rejected by CHECK constraints', () => {
  it('places.type must be eat|explore', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('places').insert({
      slug: 'x/invalid-type', name: 'x', type: 'nonsense', category_id: CATEGORY.cafes, neighborhood: 'x', reason: 'x',
    });
    expect(error).toBeTruthy();
  });

  it('places.reason cannot be empty', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('places').insert({
      slug: 'x/empty-reason', name: 'x', type: 'eat', category_id: CATEGORY.cafes, neighborhood: 'x', reason: '',
    });
    expect(error).toBeTruthy();
  });

  it('places.category_id must reference a real category (FK)', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('places').insert({
      slug: 'x/bad-category', name: 'x', type: 'eat', category_id: '00000000-0000-0000-0000-00000000dead', neighborhood: 'x', reason: 'x',
    });
    expect(error).toBeTruthy();
  });

  it('places.slug must be unique', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('places').insert({
      slug: 'restaurants/hotel-shadab', name: 'Duplicate slug attempt', type: 'eat', category_id: CATEGORY.cafes, neighborhood: 'x', reason: 'x',
    });
    expect(error).toBeTruthy();
  });

  it('a place_eat_details row cannot be attached to an explore-type place (type-mismatch trigger)', async () => {
    const { client } = await adminClient();
    const { error } = await client.from('place_eat_details').insert({ place_id: PLACE.durgamCheruvu, dishes: 5 });
    expect(error).toBeTruthy();
  });

  it('ranked_entries.tier must be loved|fine|disliked', async () => {
    const { client, user } = await regularUserClient();
    const { error } = await client.from('ranked_entries').insert({
      user_id: user.id, place_id: PLACE.roastery, category_id: CATEGORY.cafes, tier: 'meh', position: 1,
    });
    expect(error).toBeTruthy();
  });

  it('business_claims requires contact_phone, maps_link, business_name, claimed_role (NOT NULL)', async () => {
    const { client, user } = await regularUserClient();
    const { error } = await client.from('business_claims').insert({ user_id: user.id, place_id: PLACE.roastery } as any);
    expect(error).toBeTruthy();
  });
});

describe('§14 failure cases: unauthorized access attempts', () => {
  it('anon cannot insert a place, cannot insert a bookmark, cannot insert location_history', async () => {
    const { anonClient } = await import('./helpers');
    const anon = anonClient();
    const results = await Promise.all([
      anon.from('places').insert({ slug: 'x/anon', name: 'x', type: 'eat', category_id: CATEGORY.cafes, neighborhood: 'x', reason: 'x' }),
      anon.from('bookmarks').insert({ user_id: '10000000-0000-0000-0000-000000000002', place_id: PLACE.roastery }),
      anon.from('location_history').insert({ user_id: '10000000-0000-0000-0000-000000000002', action_type: 'search' }),
    ]);
    for (const r of results) expect(r.error).toBeTruthy();
  });

  it('a claimed-but-not-verified relationship grants no owner update rights', async () => {
    // regular user has never claimed Roastery — owns_verified_claim() must be false.
    const { client } = await regularUserClient();
    const { error } = await client.from('places').update({ hours: 'should fail' }).eq('id', PLACE.roastery);
    void error;
    const { client: adminC } = await adminClient();
    const { data } = await adminC.from('places').select('hours').eq('id', PLACE.roastery).single();
    expect(data?.hours).toBe('8am – 1am'); // unchanged from seed
  });
});
