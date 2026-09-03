import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { SearchProvider, useSearch, type SearchState } from '../../lib/searchState';
import { SearchEntryScreen } from './SearchEntryScreen';
import type { GoogleCandidate } from '../../lib/placesSearch';

/**
 * Phase 6 §2 regression: the Search tab (S52) used to throw away whatever
 * was typed and navigate straight to whatever generic filtered results were
 * already in search state — so searching for a real place name returned
 * unrelated results instead of that place. A real name search now drives
 * submit directly.
 *
 * Phase 8 §5 / P14: the seeded catalogue this used to check first (and
 * de-duplicate Google results against) is retired — a name search runs
 * entirely against live Google Places now.
 */

const searchPlacesByQueryMock = vi.fn();
vi.mock('../../lib/placesSearch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/placesSearch')>();
  return {
    ...actual,
    searchPlacesByQuery: (...args: Parameters<typeof actual.searchPlacesByQuery>) =>
      searchPlacesByQueryMock(...args),
  };
});

vi.mock('../../lib/googleMaps', () => ({
  hasMapsApiKey: () => true,
  loadGoogleMaps: () => new Promise(() => {}),
}));

function StateProbe() {
  const { search } = useSearch();
  return <div data-testid="probe">{JSON.stringify(search)}</div>;
}

function probe(): SearchState {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as SearchState;
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
        <SearchProvider>
          <SetPersona to="user" />
          <StateProbe />
          <MemoryRouter initialEntries={['/search']}>
            <Routes>
              <Route path="/search" element={<SearchEntryScreen />} />
              <Route path="/places/:slug" element={<h1>place detail</h1>} />
              <Route path="/intake" element={<h1>intake</h1>} />
              <Route path="/results/eat" element={<h1>eat results</h1>} />
              <Route path="/results/explore" element={<h1>explore results</h1>} />
            </Routes>
          </MemoryRouter>
        </SearchProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

function googleCandidate(overrides: Partial<GoogleCandidate> = {}): GoogleCandidate {
  return {
    placeId: 'google-place-1',
    name: 'Some Real Place',
    address: '12 Real Road, Hyderabad',
    location: { lat: 17.4, lng: 78.4 },
    types: ['point_of_interest'],
    ...overrides,
  };
}

describe('SearchEntryScreen — S52 / Phase 8 §5: live Google Places name search', () => {
  beforeEach(() => {
    searchPlacesByQueryMock.mockReset();
  });

  it('finds a real place by its exact name', async () => {
    searchPlacesByQueryMock.mockResolvedValue([googleCandidate({ name: 'Random Cafe' })]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Random Cafe{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Random Cafe/ })).toBeInTheDocument();
  });

  it('clicking a match navigates using its raw Google place id', async () => {
    searchPlacesByQueryMock.mockResolvedValue([
      googleCandidate({ placeId: 'google-place-xyz', name: 'Random Cafe' }),
    ]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Random Cafe{enter}');

    await userEvent.click(await screen.findByRole('button', { name: /Random Cafe/ }));
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });

  it('multiple distinct matches all show under one count', async () => {
    searchPlacesByQueryMock.mockResolvedValue([
      googleCandidate({ placeId: 'place-1', name: 'Mehfil' }),
      googleCandidate({ placeId: 'place-2', name: 'Mehfil Annex' }),
    ]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Mehfil{enter}');

    expect(await screen.findByText('2 matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mehfil ·/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Mehfil Annex ·/ })).toBeInTheDocument();
  });

  it('a query matching nothing at all shows a real empty state, not a silent redirect', async () => {
    searchPlacesByQueryMock.mockResolvedValue([]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'zzzznonexistentplace{enter}');

    expect(await screen.findByText('No matches')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'place detail' })).not.toBeInTheDocument();
  });
});

/**
 * P12 §5: "search entries should show the results page based on the place or
 * the cuisine or item selected — consider it as a filter and show the places
 * accordingly." Typing a craving used to be a lookup that ended in a list of
 * names; it is a filter now, and it lands on the real results screen.
 */
describe('SearchEntryScreen — P12 §5: a typed search is a filter', () => {
  beforeEach(() => {
    searchPlacesByQueryMock.mockReset();
    searchPlacesByQueryMock.mockResolvedValue([]);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('applies what was typed as a real filter and opens the results screen', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'biryani');

    await userEvent.click(screen.getByRole('button', { name: 'Show matching places' }));

    expect(probe().queryText).toBe('biryani');
    expect(await screen.findByRole('heading', { name: 'eat results' })).toBeInTheDocument();
  });

  it('offers a typed cuisine as the real cuisine filter, not only as free text', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'south indian');

    await userEvent.click(screen.getByRole('button', { name: 'Filter by South Indian' }));

    expect(probe().cuisine).toBe('South Indian');
    expect(probe().door).toBe('eat');
    expect(await screen.findByRole('heading', { name: 'eat results' })).toBeInTheDocument();
  });

  it('offers the results screen even when nothing matched by name', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'zzzznonexistentplace{enter}');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Search the picks for it instead' }),
    );
    expect(probe().queryText).toBe('zzzznonexistentplace');
  });
});

/** P12 §7: "last 5 searches should be shown to the user." */
describe('SearchEntryScreen — P12 §7: real recent searches', () => {
  beforeEach(() => {
    searchPlacesByQueryMock.mockReset();
    searchPlacesByQueryMock.mockResolvedValue([]);
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shows a signed-in person's own last searches, newest first, capped at five", async () => {
    const entries = [1, 2, 3, 4, 5, 6].map((n) => ({
      id: `r${n}`,
      door: 'eat' as const,
      label: `Eat · Area ${n}`,
      savedAt: n,
      snapshot: { door: 'eat' },
    }));
    localStorage.setItem(
      'madli.recentSearches.10000000-0000-0000-0000-000000000002',
      JSON.stringify(entries),
    );

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Recent searches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Area 6/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Area 1$/ })).not.toBeInTheDocument();
  });

  it('a Guest is told why there is no history, rather than shown a fake one', async () => {
    render(<Harness />);
    expect(
      screen.getByText(/Recent searches are saved once you have an account/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Jubilee Hills · Biryani and kebab')).not.toBeInTheDocument();
  });
});
