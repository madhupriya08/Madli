import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider } from '../../dev/PersonaContext';
import { SearchProvider } from '../../lib/searchState';
import { SearchEntryScreen } from './SearchEntryScreen';
import type { GoogleCandidate } from '../../lib/placesSearch';

/**
 * Phase 6 §2 regression: the Search tab (S52) used to throw away whatever
 * was typed and navigate straight to whatever generic filtered results were
 * already in search state — so searching for a real, seeded place name
 * ("Mehfil") returned unrelated results instead of that place. These tests
 * reproduce that exact repro (type the name, submit, check what happens)
 * against the fix: a real name search against the catalogue.
 *
 * Phase 8 §5: catalogue-only meant any real place outside the 17 seeded
 * ones came back "No matches" — search now also queries live Google Places.
 * searchPlacesByQuery is mocked to an empty array by default so the
 * catalogue-only assertions above still hold unchanged; the tests further
 * down give it real candidates to prove the live-Google half.
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

function Harness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <SearchProvider>
          <MemoryRouter initialEntries={['/search']}>
            <Routes>
              <Route path="/search" element={<SearchEntryScreen />} />
              <Route path="/places/:slug" element={<h1>place detail</h1>} />
              <Route path="/intake" element={<h1>intake</h1>} />
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

describe('SearchEntryScreen — S52 direct name search', () => {
  beforeEach(() => {
    searchPlacesByQueryMock.mockReset();
    searchPlacesByQueryMock.mockResolvedValue([]);
  });

  it('finds a known seeded place by its exact name, not generic unrelated results', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Mehfil{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mehfil · Alwal/ })).toBeInTheDocument();
  });

  it('matches case-insensitively', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'mehfil{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
  });

  it('matches on a partial name', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'meh{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
  });

  it('clicking a match opens that exact place, not a generic results list', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Mehfil{enter}');

    await userEvent.click(await screen.findByRole('button', { name: /Mehfil · Alwal/ }));
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });

  it('a query matching nothing at all shows a real empty state, not a silent redirect', async () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'zzzznonexistentplace{enter}');

    expect(await screen.findByText('No matches')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'place detail' })).not.toBeInTheDocument();
  });
});

describe('SearchEntryScreen — Phase 8 §5: live Google Places search', () => {
  beforeEach(() => {
    searchPlacesByQueryMock.mockReset();
  });

  it('finds a real place that is not in the seeded catalogue at all', async () => {
    searchPlacesByQueryMock.mockResolvedValue([googleCandidate({ name: 'Random Cafe' })]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Random Cafe{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Random Cafe/ })).toBeInTheDocument();
  });

  it('clicking a Google-only match navigates using its raw Google place id', async () => {
    searchPlacesByQueryMock.mockResolvedValue([
      googleCandidate({ placeId: 'google-place-xyz', name: 'Random Cafe' }),
    ]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Random Cafe{enter}');

    await userEvent.click(await screen.findByRole('button', { name: /Random Cafe/ }));
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });

  it('a Google result matching a catalogue place\'s own googlePlaceId is not shown twice', async () => {
    // Ananthagiri Hills's real seeded googlePlaceId (src/fixtures/places.ts)
    // — Google returning the very same place the catalogue already has
    // should not produce two separate rows for it.
    searchPlacesByQueryMock.mockResolvedValue([
      googleCandidate({ placeId: 'ChIJI61uwDxeyTsR4cnl69rlMQ0', name: 'Ananthagiri Hills' }),
    ]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Ananthagiri{enter}');

    expect(await screen.findByText('1 match')).toBeInTheDocument();
  });

  it('combines a catalogue match and a distinct Google match under one count', async () => {
    searchPlacesByQueryMock.mockResolvedValue([googleCandidate({ name: 'Mehfil Annex' })]);
    render(<Harness />);
    const input = screen.getByPlaceholderText('Search a city or a craving');
    await userEvent.type(input, 'Mehfil{enter}');

    expect(await screen.findByText('2 matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mehfil · Alwal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mehfil Annex/ })).toBeInTheDocument();
  });
});
