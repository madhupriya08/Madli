import { describe, it, expect, beforeEach } from 'vitest';
import {
  listSavedGooglePlaces,
  saveGooglePlace,
  isGooglePlaceSaved,
  removeSavedGooglePlace,
} from './savedGooglePlaces';

/**
 * Live testing surfaced the same restaurant listed twice on the Bookmarks
 * screen after being saved from search — Google's own Places data had
 * returned two different place ids for one physical business (identical
 * name + address). placeId alone was too weak an identity for this store;
 * every read now merges same-name-and-address entries down to the most
 * recently saved one, and that merge persists back to storage so it fixes
 * data left over from before this change too.
 */
describe('savedGooglePlaces — de-duplication by name + address', () => {
  beforeEach(() => localStorage.clear());

  it('collapses two different place ids for the same name+address, keeping the newer save', () => {
    saveGooglePlace({
      placeId: 'google-old-id',
      name: 'Misree Chai',
      address: '789 Newark Ave, Jersey City, NJ 07306, USA',
      types: ['cafe'],
    });
    saveGooglePlace({
      placeId: 'google-new-id',
      name: 'Misree Chai',
      address: '789 Newark Ave, Jersey City, NJ 07306, USA',
      types: ['cafe'],
    });

    const all = listSavedGooglePlaces();
    expect(all).toHaveLength(1);
    expect(all[0].placeId).toBe('google-new-id');
  });

  it('self-heals a duplicate that was already sitting in storage, on the very next read', () => {
    localStorage.setItem(
      'madli.savedGooglePlaces',
      JSON.stringify([
        {
          placeId: 'old-1',
          name: 'Newport Green Park',
          address: 'Green Park, 14th St, Jersey City, NJ 07310, USA',
          types: ['park'],
          savedAt: 1000,
        },
        {
          placeId: 'old-2',
          name: 'Newport Green Park',
          address: 'Green Park, 14th St, Jersey City, NJ 07310, USA',
          types: ['park'],
          savedAt: 2000,
        },
      ]),
    );

    expect(listSavedGooglePlaces()).toHaveLength(1);
    // The merge wrote the cleaned list back — a second read (a fresh
    // localStorage parse, not a cached one) confirms it actually persisted.
    const raw = JSON.parse(localStorage.getItem('madli.savedGooglePlaces') ?? '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].placeId).toBe('old-2');
  });

  it('leaves genuinely different places alone', () => {
    saveGooglePlace({
      placeId: 'g1',
      name: 'Misree Chai',
      address: '789 Newark Ave, Jersey City, NJ 07306, USA',
      types: ['cafe'],
    });
    saveGooglePlace({
      placeId: 'g2',
      name: 'Lighthorse Tavern',
      address: '199 Washington St, Jersey City, NJ 07302, USA',
      types: ['restaurant'],
    });

    expect(listSavedGooglePlaces()).toHaveLength(2);
  });

  it('isGooglePlaceSaved and removeSavedGooglePlace keep working by placeId after a merge', () => {
    saveGooglePlace({
      placeId: 'g1',
      name: 'Misree Chai',
      address: '789 Newark Ave, Jersey City, NJ 07306, USA',
      types: ['cafe'],
    });
    expect(isGooglePlaceSaved('g1')).toBe(true);
    removeSavedGooglePlace('g1');
    expect(isGooglePlaceSaved('g1')).toBe(false);
    expect(listSavedGooglePlaces()).toHaveLength(0);
  });
});
