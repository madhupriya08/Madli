import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { GuestSessionProvider } from '../../lib/guestSession';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SearchProvider } from '../../lib/searchState';
import { ResultsScreen } from './ResultsScreen';
import type { DiscoveryQueryResult } from '../../data/useDiscovery';
import type { GoogleCandidate } from '../../lib/placesSearch';

/**
 * Item 7 of the guest-flow update: a Guest tapping "None of these" or "Show
 * me two more" now sees an immediate signup prompt, replacing the old
 * one-free-use-then-intercept quota. These assert exactly that switch, and
 * that a signed-in User (who never had that quota) is unaffected.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

const discoveryResult: DiscoveryQueryResult = {
  data: undefined,
  isLoading: false,
  googleError: null,
};

vi.mock('../../data/useDiscovery', () => ({
  useDiscovery: () => discoveryResult,
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

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
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
                <Routes>
                  <Route path="/app/eat" element={<ResultsScreen door="eat" />} />
                  <Route path="/signup" element={<h1>Sign up</h1>} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </SearchProvider>
        </GuestSessionProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('ResultsScreen — guest gating on None of these / Show me two more', () => {
  beforeEach(() => {
    discoveryResult.data = {
      ranked: [1, 2, 3, 4, 5].map((n) => ({
        kind: 'ranked' as const,
        candidate: candidate(`place-${n}`),
        location: { lat: 17.43, lng: 78.41 },
      })),
    };
  });

  // ResultsScreen holds a skeleton up for 900ms regardless of how fast the
  // (mocked) data resolves, so every findByRole below that waits for the
  // real action buttons needs more than RTL's default 1000ms budget.
  const LOADING_TIMEOUT = { timeout: 2000 };

  it('gates a guest immediately on "None of these" — no free use left', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'None of these' }, LOADING_TIMEOUT),
    );

    expect(await screen.findByText('This one needs an account')).toBeInTheDocument();
    expect(screen.getByText(/Saving, two-stop plans and your ranked list/)).toBeInTheDocument();
  });

  it('gates a guest immediately on "Show me two more" too', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT),
    );

    expect(await screen.findByText('This one needs an account')).toBeInTheDocument();
  });

  it('"Continue as guest" closes the prompt without navigating away', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'None of these' }, LOADING_TIMEOUT),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Continue as guest' }));

    expect(screen.queryByText('This one needs an account')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('"Sign up" from the prompt navigates to /signup', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'None of these' }, LOADING_TIMEOUT),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Sign up' }));

    expect(await screen.findByRole('heading', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('a signed-in User is never gated — both actions work directly', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'None of these' }, LOADING_TIMEOUT),
    );
    expect(screen.queryByText('This one needs an account')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Show me two more' }));
    expect(screen.queryByText('This one needs an account')).not.toBeInTheDocument();
  });
});
