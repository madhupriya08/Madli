import { describe, it, expect, vi } from 'vitest';
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
 * Phase 6 §6: "None of these" is gone entirely — it no longer renders, and
 * there is no path left that reaches its old handler. Results cap at 5 total
 * (3 initial + up to 2 more via "Show me two more"), and once at that cap —
 * or once the pool itself runs out — "Show me two more" is disabled, not
 * hidden. A Guest's first tap on "Show me two more" still shows the signup
 * prompt immediately, exactly as it did before this change (that gate is
 * unrelated to the 5-pick cap; it fires whether or not more picks exist).
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    // Phase 7 §4: ResultsScreen fires logEvent() (results_shown/pick_opened/
    // show_two_more_clicked), which calls supabase.from(...).insert(...).
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
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

// ResultsScreen holds a skeleton up for 900ms regardless of how fast the
// (mocked) data resolves, so every findByRole below that waits for the real
// action buttons needs more than RTL's default 1000ms budget.
const LOADING_TIMEOUT = { timeout: 2000 };

describe('ResultsScreen — Phase 6 §6: 5-pick cap, no "None of these"', () => {
  it('"None of these" no longer exists anywhere on this screen', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT);
    expect(screen.queryByRole('button', { name: 'None of these' })).not.toBeInTheDocument();
  });

  it('shows only the first 3 initially, out of a larger pool', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Place place-1', {}, LOADING_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByText('Place place-3')).toBeInTheDocument();
    expect(screen.queryByText('Place place-4')).not.toBeInTheDocument();
    expect(screen.queryByText('Place place-5')).not.toBeInTheDocument();
  });

  it('a signed-in User clicking "Show me two more" reveals up to 5 total, then it disables — it never hides', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    const showTwoMore = await screen.findByRole(
      'button',
      { name: 'Show me two more' },
      LOADING_TIMEOUT,
    );
    expect(showTwoMore).toBeEnabled();

    await userEvent.click(showTwoMore);

    expect(await screen.findByText('Place place-4')).toBeInTheDocument();
    expect(screen.getByText('Place place-5')).toBeInTheDocument();
    // Capped at 5 — the button is still there, just disabled now, not gone.
    expect(
      screen.getByRole('button', { name: 'Show me two more' }),
    ).toBeDisabled();
  });

  it('a pool with only 3 places ever available starts already disabled', async () => {
    discoveryResult.data = { ranked: poolOf(3) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(
      await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT),
    ).toBeDisabled();
  });

  it('gates a guest immediately on "Show me two more", same as before this change', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT),
    );

    expect(await screen.findByText('This one needs an account')).toBeInTheDocument();
    expect(screen.getByText(/Saving, two-stop plans and your ranked list/)).toBeInTheDocument();
  });

  it('"Continue as guest" closes the prompt without navigating away', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Continue as guest' }));

    expect(screen.queryByText('This one needs an account')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('"Sign up" from the prompt navigates to /signup', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Sign up' }));

    expect(await screen.findByRole('heading', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('a signed-in User is never gated', async () => {
    discoveryResult.data = { ranked: poolOf(5) };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Show me two more' }, LOADING_TIMEOUT),
    );
    expect(screen.queryByText('This one needs an account')).not.toBeInTheDocument();
  });
});
