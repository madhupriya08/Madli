import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { SearchProvider } from '../../lib/searchState';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { PlaceDetailScreen } from './PlaceDetailScreen';
import type { GooglePlaceDetails } from '../../lib/placesSearch';

/**
 * P10 §3: the "I have been here" button used to exist only on the
 * catalogue-fixture branch of this screen (CatalogueDetail) — a real
 * (Google-sourced) place, which is what most searches actually return since
 * P8 §5 moved search to Google Places, had no way to rank it at all. These
 * tests cover the new button on the Google branch (GoogleDetail) and its
 * tier-only ranking dialog (RankGooglePlaceForm, shared with the post-visit
 * nudge).
 */

const GOOGLE_PLACE: GooglePlaceDetails = {
  placeId: 'google-place-1',
  name: 'Testville Diner',
  address: '1 Test Street',
  location: { lat: 17.4, lng: 78.4 },
  types: ['restaurant', 'point_of_interest'],
  googleRating: 4.5,
  reviewCount: 100,
};

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('../../data/placeHistory', () => ({
  useAiPlaceHistory: () => ({ data: null }),
}));

vi.mock('../../data/hooks', () => ({
  useBookmarks: () => ({ data: [] }),
  useAddBookmark: () => ({ mutate: vi.fn() }),
  useRemoveBookmark: () => ({ mutate: vi.fn() }),
  useAllRankedEntries: () => ({ data: [] }),
}));

vi.mock('../../lib/placesSearch', async () => {
  const actual =
    await vi.importActual<typeof import('../../lib/placesSearch')>('../../lib/placesSearch');
  return { ...actual, fetchPlaceDetails: () => Promise.resolve(GOOGLE_PLACE) };
});

const rankMutateAsync = vi.fn();

vi.mock('../../data/googleRankings', async () => {
  const actual = await vi.importActual<typeof import('../../data/googleRankings')>(
    '../../data/googleRankings',
  );
  return {
    ...actual,
    useResidentStatus: () => ({ data: 'visitor' }),
    useRankGooglePlace: () => ({ mutateAsync: rankMutateAsync, isPending: false }),
    useMyGoogleRankings: () => ({ data: [] }),
    setResidentStatus: vi.fn(),
  };
});

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <SearchProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[`/places/${GOOGLE_PLACE.placeId}`]}>
              <SetPersona to="guest" />
              <SetPersona to="user" />
              <Routes>
                <Route path="/places/:slug" element={<PlaceDetailScreen />} />
                <Route path="/signup" element={<h1>Sign up</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </SearchProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('PlaceDetailScreen — "I have been here" on a real (Google-sourced) place', () => {
  beforeEach(() => {
    rankMutateAsync.mockReset();
  });

  it('is hidden for a Guest', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await screen.findByText('Testville Diner');
    expect(screen.queryByRole('button', { name: 'I have been here' })).not.toBeInTheDocument();
  });

  it('opens a tier-ranking dialog for a signed-in User and shows the landed position', async () => {
    rankMutateAsync.mockResolvedValue({ landedPosition: 2, totalInDoor: 5 });
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    const main = await screen.findByRole('main');
    await userEvent.click(await within(main).findByRole('button', { name: 'I have been here' }));

    expect(await screen.findByText('How was Testville Diner?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Loved it' }));

    expect(rankMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ googlePlaceId: 'google-place-1', tier: 'loved', door: 'eat' }),
    );
    expect(
      await screen.findByText("Testville Diner landed at #2 out of 5 places you've ranked in Eat."),
    ).toBeInTheDocument();
  });
});
