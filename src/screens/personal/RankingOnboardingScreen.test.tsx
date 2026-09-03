import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { SearchProvider } from '../../lib/searchState';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { RankingOnboardingScreen } from './RankingOnboardingScreen';
import type { GoogleCandidate } from '../../lib/placesSearch';

/**
 * P5 §1: two real, specific gaps in this screen.
 *
 *  1. No deselect — tapping an already-chosen tier had no way back, so a
 *     mis-tap permanently polluted the ranked list.
 *  2. Eat-only — the recommendation logic this seeds needs both doors, and
 *     Explore places were never asked about at all.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('../../lib/googleMaps', () => ({
  hasMapsApiKey: () => true,
}));

const searchCandidatesMock = vi.fn();
vi.mock('../../lib/placesSearch', () => ({
  searchCandidates: (...args: unknown[]) => searchCandidatesMock(...args),
}));

const rankMock = vi.fn();
const unrankMock = vi.fn();
vi.mock('../../data/googleRankings', () => ({
  setResidentStatus: vi.fn(async () => {}),
  useResidentStatus: () => ({ data: 'local' }),
  useRankGooglePlace: () => ({
    mutateAsync: (...args: unknown[]) => rankMock(...args),
  }),
  useUnrankGooglePlace: () => ({
    mutateAsync: (...args: unknown[]) => unrankMock(...args),
  }),
}));

const EAT_CANDIDATE: GoogleCandidate = {
  placeId: 'eat-1',
  name: 'Chutneys',
  address: 'Punjagutta',
  location: { lat: 17.43, lng: 78.44 },
  types: ['restaurant'],
  reviewCount: 500,
};

const EXPLORE_CANDIDATE: GoogleCandidate = {
  placeId: 'explore-1',
  name: 'Golconda Fort',
  address: 'Golconda',
  location: { lat: 17.38, lng: 78.4 },
  types: ['tourist_attraction'],
  reviewCount: 900,
};

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <ToastProvider>
          <SearchProvider>
            <MemoryRouter initialEntries={['/ranking-onboarding']}>
              <SetPersona to="user" />
              <Routes>
                <Route path="/ranking-onboarding" element={<RankingOnboardingScreen />} />
                <Route path="/app" element={<h1>Home</h1>} />
              </Routes>
            </MemoryRouter>
          </SearchProvider>
        </ToastProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('RankingOnboardingScreen — deselect + Explore places', () => {
  beforeEach(() => {
    searchCandidatesMock.mockReset();
    rankMock.mockReset();
    unrankMock.mockReset();
    rankMock.mockResolvedValue({ landedPosition: 1, totalInDoor: 1 });
    unrankMock.mockResolvedValue(undefined);
    searchCandidatesMock.mockImplementation((input: { door: 'eat' | 'explore' }) =>
      Promise.resolve(input.door === 'eat' ? [EAT_CANDIDATE] : [EXPLORE_CANDIDATE]),
    );
  });

  it('asks about both Eat and Explore places, not just Eat', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Chutneys')).toBeInTheDocument();
    expect(await screen.findByText('Golconda Fort')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Places to eat' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Places to explore' })).toBeInTheDocument();
  });

  it('ranks an Explore candidate under door "explore", not hardcoded to "eat"', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));

    const exploreCard = (await screen.findByText('Golconda Fort')).closest('div')!.parentElement!;
    await user.click(within(exploreCard).getByRole('button', { name: 'Loved it' }));

    expect(rankMock).toHaveBeenCalledWith(
      expect.objectContaining({
        googlePlaceId: 'explore-1',
        door: 'explore',
        tier: 'loved',
        types: ['tourist_attraction'],
      }),
    );
  });

  it('tapping the already-selected tier again undoes the ranking', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));

    const eatCard = (await screen.findByText('Chutneys')).closest('div')!.parentElement!;
    const lovedButton = within(eatCard).getByRole('button', { name: 'Loved it' });

    await user.click(lovedButton);
    expect(await within(eatCard).findByText('Saved, tap again to undo')).toBeInTheDocument();
    expect(rankMock).toHaveBeenCalledTimes(1);

    await user.click(lovedButton);
    expect(unrankMock).toHaveBeenCalledWith('eat-1');
    expect(within(eatCard).queryByText('Saved, tap again to undo')).not.toBeInTheDocument();
  });

  it('switching from one tier to another re-ranks rather than undoing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));

    const eatCard = (await screen.findByText('Chutneys')).closest('div')!.parentElement!;
    await user.click(within(eatCard).getByRole('button', { name: 'Loved it' }));
    await user.click(within(eatCard).getByRole('button', { name: 'It was fine' }));

    expect(unrankMock).not.toHaveBeenCalled();
    expect(rankMock).toHaveBeenCalledTimes(2);
    expect(rankMock).toHaveBeenLastCalledWith(expect.objectContaining({ tier: 'fine' }));
  });
});

describe('RankingOnboardingScreen — Phase 6 §5: Skip for now moved to the top', () => {
  beforeEach(() => {
    searchCandidatesMock.mockReset();
    rankMock.mockReset();
    unrankMock.mockReset();
    searchCandidatesMock.mockImplementation((input: { door: 'eat' | 'explore' }) =>
      Promise.resolve(input.door === 'eat' ? [EAT_CANDIDATE] : [EXPLORE_CANDIDATE]),
    );
  });

  it('renders before the nearby-places lists, reachable without scrolling past them', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));

    const skipButton = await screen.findByRole('button', {
      name: 'Skip for now, you can rank any place from its own page later',
    });
    const eatHeading = await screen.findByRole('heading', { name: 'Places to eat' });

    // DOCUMENT_POSITION_FOLLOWING means eatHeading comes *after* skipButton
    // in the DOM — i.e. skip is above the places list, not below it.
    expect(
      skipButton.compareDocumentPosition(eatHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('appears only once — not duplicated at the bottom too', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));
    await screen.findByRole('heading', { name: 'Places to eat' });

    expect(
      screen.getAllByText('Skip for now, you can rank any place from its own page later'),
    ).toHaveLength(1);
  });

  it('clicking it leaves immediately, without needing to answer residency or rate anything', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'set persona user' }));

    await user.click(
      screen.getByRole('button', {
        name: 'Skip for now, you can rank any place from its own page later',
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(rankMock).not.toHaveBeenCalled();
  });
});
