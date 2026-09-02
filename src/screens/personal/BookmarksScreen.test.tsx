import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SearchProvider, useSearch } from '../../lib/searchState';
import { saveGooglePlace } from '../../lib/savedGooglePlaces';
import { BookmarksScreen } from './BookmarksScreen';

/**
 * Covers the "Bookmark - U" checklist the user asked to close: remove,
 * an optional "why I saved this" note, filter by area/category, the
 * resurfaced-when-nearby banner (S23's own spec: "a variant of this screen,
 * not a notification" — i.e. a nearby bookmark legitimately renders in both
 * that section AND the regular list below, not instead of it), and
 * mark-as-visited working for a Google-sourced bookmark too (previously
 * catalogue-only).
 */

const removeBookmarkMutate = vi.fn();
const setBookmarkNoteMutate = vi.fn();
let bookmarksData: Array<{ id: string; placeId: string; note: string | null }> = [];

vi.mock('../../data/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../data/hooks')>('../../data/hooks');
  return {
    ...actual,
    useBookmarks: () => ({ data: bookmarksData }),
    usePlans: () => ({ data: [] }),
    useRemoveBookmark: () => ({ mutate: removeBookmarkMutate }),
    useSetBookmarkNote: () => ({ mutate: setBookmarkNoteMutate }),
  };
});

vi.mock('../../data/googleRankings', async () => {
  const actual =
    await vi.importActual<typeof import('../../data/googleRankings')>('../../data/googleRankings');
  return {
    ...actual,
    useResidentStatus: () => ({ data: 'visitor' }),
    useRankGooglePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

// Two real catalogue fixtures, deliberately in different categories/areas/
// coordinates, so filter and nearby behaviour has something real to assert
// against rather than a single row that trivially always matches.
const CAFE_BAHAR = { id: '00000000-0000-0000-0000-0000000000f5', lat: 17.3997904, lng: 78.4785849 };
const CHARMINAR = { id: '00000000-0000-0000-0000-0000000000e5', lat: 17.3615636, lng: 78.4746645 };
// Far from both fixtures above — the default search origin (a generic
// Hyderabad point) is coincidentally within nearby-range of Cafe Bahar, so
// every test that isn't specifically about the nearby banner seeds here
// first to get a clean, single-render of each bookmark.
const FAR_AWAY = { lat: 0, lng: 0 };

function AutoSeedCenter({ lat, lng }: { lat: number; lng: number }) {
  const { setSearch } = useSearch();
  useEffect(() => {
    setSearch({ center: { lat, lng }, centerSource: 'area' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

function Harness({ centerLat = FAR_AWAY.lat, centerLng = FAR_AWAY.lng } = {}) {
  return (
    <PersonaProvider>
      <ToastProvider>
        <SearchProvider>
          <MemoryRouter>
            <AutoSeedCenter lat={centerLat} lng={centerLng} />
            <BookmarksScreen />
          </MemoryRouter>
        </SearchProvider>
      </ToastProvider>
    </PersonaProvider>
  );
}

describe('BookmarksScreen — S23 checklist', () => {
  beforeEach(() => {
    localStorage.clear();
    removeBookmarkMutate.mockReset();
    setBookmarkNoteMutate.mockReset();
    bookmarksData = [{ id: 'b1', placeId: CAFE_BAHAR.id, note: null }];
  });

  it('removing a catalogue bookmark calls the remove mutation', async () => {
    render(<Harness />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(removeBookmarkMutate).toHaveBeenCalledWith(CAFE_BAHAR.id);
  });

  it('removing a Google bookmark actually removes it from storage', async () => {
    bookmarksData = [];
    saveGooglePlace({
      placeId: 'g1',
      name: 'Testville Diner',
      address: '1 Test St',
      types: ['restaurant'],
    });
    render(<Harness />);

    expect(await screen.findByText('Testville Diner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText('Testville Diner')).not.toBeInTheDocument();
  });

  it('adding a note on a catalogue bookmark saves it', async () => {
    render(<Harness />);
    await userEvent.click(await screen.findByText('Add a note — why did you save this?'));
    await userEvent.type(screen.getByPlaceholderText('Why did you save this?'), 'Best haleem in town');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(setBookmarkNoteMutate).toHaveBeenCalledWith({
      placeId: CAFE_BAHAR.id,
      note: 'Best haleem in town',
    });
  });

  it('filtering by category hides a bookmark outside it, and Google bookmarks are unaffected', async () => {
    bookmarksData = [
      { id: 'b1', placeId: CAFE_BAHAR.id, note: null },
      { id: 'b2', placeId: CHARMINAR.id, note: null },
    ];
    saveGooglePlace({
      placeId: 'g1',
      name: 'Testville Diner',
      address: '1 Test St',
      types: ['restaurant'],
    });
    render(<Harness />);

    expect(await screen.findByText('Cafe Bahar')).toBeInTheDocument();
    expect(screen.getByText('Charminar')).toBeInTheDocument();
    expect(screen.getByText('Testville Diner')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Historical' }));
    expect(screen.queryByText('Cafe Bahar')).not.toBeInTheDocument();
    expect(screen.getByText('Charminar')).toBeInTheDocument();
    // A Google-sourced bookmark has no catalogue category to filter by, so
    // it stays visible rather than being silently hidden.
    expect(screen.getByText('Testville Diner')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Historical' }));
    expect(await screen.findByText('Cafe Bahar')).toBeInTheDocument();
  });

  it('has no "Nearby now" section when the search origin is far from every bookmark', async () => {
    bookmarksData = [
      { id: 'b1', placeId: CAFE_BAHAR.id, note: null },
      { id: 'b2', placeId: CHARMINAR.id, note: null },
    ];
    render(<Harness />);
    await screen.findByText('Cafe Bahar');
    expect(screen.queryByText('Nearby now')).not.toBeInTheDocument();
  });

  it('shows a "Nearby now" section only for the bookmark actually close to the search origin', async () => {
    bookmarksData = [
      { id: 'b1', placeId: CAFE_BAHAR.id, note: null },
      { id: 'b2', placeId: CHARMINAR.id, note: null },
    ];
    // Seeded to Cafe Bahar's own coordinates — Charminar is ~4km away, so
    // only Cafe Bahar should land in the nearby section. It also still
    // renders again in the regular list below, per S23's own framing of
    // this as "a variant of this screen, not a notification".
    render(<Harness centerLat={CAFE_BAHAR.lat} centerLng={CAFE_BAHAR.lng} />);

    const nearbyHeading = await screen.findByText('Nearby now');
    const nearbySection = nearbyHeading.parentElement!;
    expect(within(nearbySection).getByText('Cafe Bahar')).toBeInTheDocument();
    expect(within(nearbySection).queryByText('Charminar')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cafe Bahar')).toHaveLength(2);
  });

  it('marking a Google bookmark as visited opens the tier-ranking dialog', async () => {
    bookmarksData = [];
    saveGooglePlace({
      placeId: 'g1',
      name: 'Testville Diner',
      address: '1 Test St',
      types: ['restaurant'],
    });
    render(<Harness />);

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as visited' }));
    expect(await screen.findByText('How was Testville Diner?')).toBeInTheDocument();
  });
});
