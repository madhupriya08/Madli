import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SearchProvider, useSearch } from '../../lib/searchState';
import { saveGooglePlace } from '../../lib/savedGooglePlaces';
import { BookmarksScreen } from './BookmarksScreen';

/**
 * Covers the "Bookmark - U" checklist the user asked to close: remove,
 * an optional "why I saved this" note, filter by area/category, the
 * resurfaced-when-nearby banner (S23's own spec: "a variant of this screen,
 * not a notification"), and mark-as-visited working for a Google-sourced
 * bookmark too (previously catalogue-only).
 *
 * A nearby bookmark renders once, not twice — an earlier version of this
 * screen also repeated it in the plain list below "Nearby now" with no
 * divider between the two, which live testing read as a duplicate-add bug
 * rather than the intentional highlight it was meant to be.
 */

const removeBookmarkMutate = vi.fn();
const setBookmarkNoteMutate = vi.fn();
let bookmarksData: Array<{ id: string; placeId: string; note: string | null }> = [];
let rankedCatalogueData: Array<{ placeId: string }> = [];
let rankedGoogleData: Array<{ googlePlaceId: string }> = [];

vi.mock('../../data/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../data/hooks')>('../../data/hooks');
  return {
    ...actual,
    useBookmarks: () => ({ data: bookmarksData }),
    usePlans: () => ({ data: [] }),
    useRemoveBookmark: () => ({ mutate: removeBookmarkMutate }),
    useSetBookmarkNote: () => ({ mutate: setBookmarkNoteMutate }),
    useAllRankedEntries: () => ({ data: rankedCatalogueData }),
  };
});

vi.mock('../../data/googleRankings', async () => {
  const actual =
    await vi.importActual<typeof import('../../data/googleRankings')>('../../data/googleRankings');
  return {
    ...actual,
    useResidentStatus: () => ({ data: 'visitor' }),
    useRankGooglePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useMyGoogleRankings: () => ({ data: rankedGoogleData }),
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
    rankedCatalogueData = [];
    rankedGoogleData = [];
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
    await userEvent.click(await screen.findByText('Add a note: why did you save this?'));
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
    // only Cafe Bahar should land in the nearby section. It appears exactly
    // once on screen (in "Nearby now"), not again in the plain list below.
    render(<Harness centerLat={CAFE_BAHAR.lat} centerLng={CAFE_BAHAR.lng} />);

    const nearbyHeading = await screen.findByText('Nearby now');
    const nearbySection = nearbyHeading.parentElement!;
    expect(within(nearbySection).getByText('Cafe Bahar')).toBeInTheDocument();
    expect(within(nearbySection).queryByText('Charminar')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cafe Bahar')).toHaveLength(1);
    expect(screen.getByText('Charminar')).toBeInTheDocument();
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

  it('shows "Visited" (disabled) for a catalogue bookmark already ranked', async () => {
    rankedCatalogueData = [{ placeId: CAFE_BAHAR.id }];
    render(<Harness />);

    const visited = await screen.findByRole('button', { name: 'Visited' });
    expect(visited).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Mark as visited' })).not.toBeInTheDocument();
  });

  it('shows "Visited" (disabled) for a Google bookmark already ranked', async () => {
    bookmarksData = [];
    saveGooglePlace({
      placeId: 'g1',
      name: 'Testville Diner',
      address: '1 Test St',
      types: ['restaurant'],
    });
    rankedGoogleData = [{ googlePlaceId: 'g1' }];
    render(<Harness />);

    const visited = await screen.findByRole('button', { name: 'Visited' });
    expect(visited).toBeDisabled();
  });

  it('"Rank this place" opens as a centered modal on desktop, not a bottom sheet', async () => {
    bookmarksData = [];
    saveGooglePlace({
      placeId: 'g1',
      name: 'Testville Diner',
      address: '1 Test St',
      types: ['restaurant'],
    });

    function SetDesktop() {
      const { setBreakpoint } = usePersona();
      return (
        <button onClick={() => setBreakpoint('desktop')}>go desktop</button>
      );
    }

    render(
      <PersonaProvider>
        <ToastProvider>
          <SearchProvider>
            <MemoryRouter>
              <AutoSeedCenter lat={FAR_AWAY.lat} lng={FAR_AWAY.lng} />
              <SetDesktop />
              <BookmarksScreen />
            </MemoryRouter>
          </SearchProvider>
        </ToastProvider>
      </PersonaProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'go desktop' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as visited' }));

    const dialog = await screen.findByRole('dialog', { name: 'Rank this place' });
    // A sheet is bottom-aligned and full width (see Dialog.tsx); a desktop
    // modal is centered with a capped width — width is the one difference
    // that survives down to the rendered inline style either way.
    expect(dialog.style.width).not.toBe('100%');
  });
});
