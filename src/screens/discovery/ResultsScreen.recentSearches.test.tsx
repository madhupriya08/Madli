import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona, MOCK_USER_ID } from '../../dev/PersonaContext';
import { GuestSessionProvider } from '../../lib/guestSession';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SearchProvider, useSearch, DEFAULT_STATE } from '../../lib/searchState';
import { ResultsScreen } from './ResultsScreen';
import { listRecentSearches } from '../../lib/recentSearches';
import type { DiscoveryQueryResult } from '../../data/useDiscovery';
import type { GoogleCandidate } from '../../lib/placesSearch';

/**
 * P11 §3: results pages (S17/S18) previously had no recent-searches feature
 * at all. Covers both halves: a real results view for a signed-in User gets
 * recorded (recordRecentSearch, gated off for a Guest — no profile row to
 * anchor history to, same precedent as SearchEntryScreen's own "sign up to
 * keep a history" copy), and a previously-recorded entry both renders as a
 * chip and actually restores its filter set when clicked.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
  },
}));

const discoveryResult: DiscoveryQueryResult = {
  data: undefined,
  isLoading: false,
  googleError: null,
};

vi.mock('../../data/useDiscovery', () => ({
  // A fresh object every call — real useDiscovery (a react-query hook)
  // returns a new reference whenever its result actually changes, which is
  // what the recording effect below keys its "did results just load" check
  // on. The static-reference version other ResultsScreen tests use is fine
  // for them (they only ever check final rendered output), but would make
  // that effect never re-fire here.
  useDiscovery: () => ({ ...discoveryResult }),
}));

vi.mock('../../data/googleRankings', () => ({
  useRankingCounts: () => ({ data: undefined }),
}));

function candidate(placeId: string): GoogleCandidate {
  return {
    placeId,
    name: `Place ${placeId}`,
    address: '12 Test Road',
    location: { lat: 17.43, lng: 78.41 },
    types: ['restaurant'],
    googleRating: 4.5,
    reviewCount: 200,
  };
}

function poolOf(n: number) {
  return Array.from({ length: n }, (_, i) => i + 1).map((num) => ({
    kind: 'ranked' as const,
    candidate: candidate(`place-${num}`),
    location: { lat: 17.43, lng: 78.41 },
  }));
}

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function SeedArea({ areaText }: { areaText: string }) {
  const { setSearch } = useSearch();
  return <button onClick={() => setSearch({ areaText })}>seed {areaText}</button>;
}

function StateProbe() {
  const { search } = useSearch();
  return <div data-testid="probe">{JSON.stringify(search)}</div>;
}

function Harness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <GuestSessionProvider>
          <SearchProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={['/app/eat']}>
                <SetPersona to="guest" />
                <SetPersona to="user" />
                <SeedArea areaText="Jubilee Hills" />
                <StateProbe />
                <Routes>
                  <Route path="/app/eat" element={<ResultsScreen door="eat" />} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </SearchProvider>
        </GuestSessionProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

const LOADING_TIMEOUT = { timeout: 2000 };

describe('ResultsScreen — recent searches (P11 §3)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    discoveryResult.data = { ranked: poolOf(3) };
  });

  it('records a real results view for a signed-in User', async () => {
    const { rerender } = render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));
    await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT);

    // Force one more, deterministic render pass with persona already
    // settled as 'user' and a genuinely new discovery result — the
    // recording effect keys on the discovery result changing (matching the
    // real hook, which returns a new reference on every real query
    // resolution), which this test's static mock does not naturally do on
    // its own between the two renders above.
    discoveryResult.data = { ranked: poolOf(3) };
    rerender(<Harness />);
    await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT);

    await waitFor(() => {
      const recorded = listRecentSearches(MOCK_USER_ID, 'eat');
      expect(recorded).toHaveLength(1);
      expect(recorded[0].label).toBe('Eat · Nearby');
    });
  });

  it('does not record anything for a Guest', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));
    await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT);

    expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
    expect(listRecentSearches(MOCK_USER_ID, 'eat')).toHaveLength(0);
  });

  it('shows a previously-recorded search as a chip and restores it on click', async () => {
    localStorage.setItem(
      `madli.recentSearches.${MOCK_USER_ID}`,
      JSON.stringify([
        {
          id: 'r1',
          door: 'eat',
          label: 'Eat · Banjara Hills',
          savedAt: Date.now(),
          snapshot: { ...DEFAULT_STATE, door: 'eat', areaText: 'Banjara Hills' },
        },
      ]),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    const chip = await screen.findByText('Eat · Banjara Hills', {}, LOADING_TIMEOUT);
    await userEvent.click(chip);

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
      expect(state.areaText).toBe('Banjara Hills');
    });
  });
});
