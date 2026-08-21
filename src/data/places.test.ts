import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateOwnerListing, ProtectedFieldError } from './places';
import { places } from '../fixtures/places';

const HOTEL_SHADAB = '00000000-0000-0000-0000-0000000000f1';

describe('updateOwnerListing', () => {
  let original: (typeof places)[number];

  beforeEach(() => {
    original = { ...places.find((p) => p.id === HOTEL_SHADAB)! };
  });

  afterEach(() => {
    Object.assign(
      places.find((p) => p.id === HOTEL_SHADAB)!,
      original,
    );
  });

  it('rejects an update to a ranking-relevant protected field', async () => {
    await expect(updateOwnerListing(HOTEL_SHADAB, { locals: 9999 })).rejects.toThrow(
      ProtectedFieldError,
    );
    await expect(updateOwnerListing(HOTEL_SHADAB, { locals: 9999 })).rejects.toThrow(/locals/);
  });

  it('leaves the record untouched when the update is rejected', async () => {
    const before = places.find((p) => p.id === HOTEL_SHADAB)!.locals;
    await expect(updateOwnerListing(HOTEL_SHADAB, { locals: 9999 })).rejects.toThrow();
    expect(places.find((p) => p.id === HOTEL_SHADAB)!.locals).toBe(before);
  });

  it('succeeds updating a field on the owner-editable allowlist', async () => {
    const updated = await updateOwnerListing(HOTEL_SHADAB, { phone: '040 9999 9999' });
    expect(updated.phone).toBe('040 9999 9999');
    expect(places.find((p) => p.id === HOTEL_SHADAB)!.phone).toBe('040 9999 9999');
  });

  it('rejects the whole update — not just the disallowed key — when any field is protected', async () => {
    await expect(
      updateOwnerListing(HOTEL_SHADAB, { phone: '111', gapPoints: 999 }),
    ).rejects.toThrow(ProtectedFieldError);
    expect(places.find((p) => p.id === HOTEL_SHADAB)!.phone).toBe(original.phone);
  });

  it('throws for an unknown place id', async () => {
    await expect(updateOwnerListing('not-a-real-id', { phone: '111' })).rejects.toThrow(
      /not found/,
    );
  });
});
