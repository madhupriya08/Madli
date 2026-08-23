// Phase 3: updateOwnerListing's protected-field rejection is still a pure,
// pre-network check (the OWNER_EDITABLE_FIELDS guard runs before any
// Supabase call is made — see src/data/places.ts), so those cases stay real
// unit tests with no mocking needed. The success/not-found paths now make
// real Supabase calls, so the client is mocked here the same way any
// component test mocks an external service — the real round trip for these
// same cases was independently verified against the live project (owner
// PATCH on an allowed field succeeding, a protected field rejected by the
// real trigger with the real error message) in PHASE_3_COMPLETION_REPORT.md §4.
import { describe, it, expect, vi } from 'vitest';
import { updateOwnerListing, ProtectedFieldError, NotAuthorizedError } from './places';

// vi.mock factories are hoisted above top-level const declarations, so the
// place id is inlined here rather than shared via an outer constant.
//
// Postgres RLS blocks an unauthorized UPDATE by matching zero rows rather
// than raising an error, so the mock's `.eq()` returns a row list reflecting
// whether the id is one this "owner" actually owns — same as PostgREST would
// for a real blocked write — rather than always reporting success.
vi.mock('../lib/supabaseClient', () => {
  const rows = new Map<string, Record<string, unknown>>([
    [
      '00000000-0000-0000-0000-0000000000f1',
      {
        id: '00000000-0000-0000-0000-0000000000f1',
        phone: '040 2456 1180',
        place_eat_details: null,
        place_explore_details: null,
      },
    ],
  ]);

  function from(table: string) {
    if (table === 'places') {
      return {
        update: (fields: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => ({
            select: (_sel: string) => {
              const row = rows.get(id);
              if (!row) return Promise.resolve({ data: [], error: null });
              Object.assign(row, fields);
              return Promise.resolve({ data: [{ id }], error: null });
            },
          }),
        }),
        select: () => ({
          eq: (_col: string, id: string) => ({
            maybeSingle: () => Promise.resolve({ data: rows.get(id) ?? null, error: null }),
          }),
        }),
      };
    }
    // place_eat_details / place_explore_details: no-op for this test's fields.
    return {
      update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
    };
  }

  return { supabase: { from } };
});

const HOTEL_SHADAB = '00000000-0000-0000-0000-0000000000f1';

describe('updateOwnerListing', () => {
  it('rejects an update to a ranking-relevant protected field, before any network call', async () => {
    await expect(updateOwnerListing(HOTEL_SHADAB, { locals: 9999 })).rejects.toThrow(
      ProtectedFieldError,
    );
    await expect(updateOwnerListing(HOTEL_SHADAB, { locals: 9999 })).rejects.toThrow(/locals/);
  });

  it('rejects the whole update — not just the disallowed key — when any field is protected', async () => {
    await expect(
      updateOwnerListing(HOTEL_SHADAB, { phone: '111', gapPoints: 999 }),
    ).rejects.toThrow(ProtectedFieldError);
  });

  it('succeeds updating a field on the owner-editable allowlist', async () => {
    const updated = await updateOwnerListing(HOTEL_SHADAB, { phone: '040 9999 9999' });
    expect(updated.phone).toBe('040 9999 9999');
  });

  it('throws NotAuthorizedError when the write matches no rows — RLS blocked it silently, not with an error', async () => {
    await expect(updateOwnerListing('not-a-real-id', { phone: '111' })).rejects.toThrow(
      NotAuthorizedError,
    );
  });
});
