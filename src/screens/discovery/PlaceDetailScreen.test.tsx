import { useEffect, useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { SearchProvider } from '../../lib/searchState';
import { PlaceDetailScreen } from './PlaceDetailScreen';

/**
 * S19, item 8 of the guest-flow round: the bridge-tap card now gates a Guest
 * behind the same "This one needs an account" prompt used elsewhere, the map
 * falls back to a real placeholder (not a bare "Map — open directions" div)
 * when a catalogue place has no coordinates, and "What to order" shows a
 * locked teaser for a Guest / the real mention count for anyone else.
 *
 * "Mehfil" (restaurants/mehfil) is used throughout: a real catalogue fixture
 * with a real `dishes` count (exercises "What to order") that already has
 * `drive` set, so the route-fetch effect short-circuits instead of hitting
 * the network. Mehfil has real lat/lng now (Phase 6 §1 backfill), so the map
 * placeholder test below uses "Deccan Grill House" instead — the one
 * remaining catalogue fixture with no coordinates at all.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

// A real, reactive stand-in for the bookmark store — not a static empty
// array — so clicking Save actually drives a re-render with `isBookmarked`
// flipped, the same way a real useQuery cache update would. This is what
// makes the Save/Saved test below a genuine click-and-observe check rather
// than a re-statement of the component's own ternary.
let bookmarkedPlaceIds: string[] = [];
const bookmarkListeners = new Set<() => void>();
function notifyBookmarkListeners() {
  bookmarkListeners.forEach((l) => l());
}

vi.mock('../../data/hooks', () => ({
  useBookmarks: () => {
    const [ids, setIds] = useState(bookmarkedPlaceIds);
    useEffect(() => {
      const listener = () => setIds([...bookmarkedPlaceIds]);
      bookmarkListeners.add(listener);
      return () => {
        bookmarkListeners.delete(listener);
      };
    }, []);
    return { data: ids.map((placeId) => ({ placeId })) };
  },
  useAddBookmark: () => ({
    mutate: (placeId: string) => {
      bookmarkedPlaceIds = [...bookmarkedPlaceIds, placeId];
      notifyBookmarkListeners();
    },
  }),
  useRemoveBookmark: () => ({
    mutate: (placeId: string) => {
      bookmarkedPlaceIds = bookmarkedPlaceIds.filter((id) => id !== placeId);
      notifyBookmarkListeners();
    },
  }),
  useOwnsVerifiedClaim: () => ({ data: false }),
}));

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness({ slug = 'restaurants%2Fmehfil' }: { slug?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <SearchProvider>
          <MemoryRouter initialEntries={[`/places/${slug}`]}>
            <SetPersona to="guest" />
            <SetPersona to="user" />
            <Routes>
              <Route path="/places/:slug" element={<PlaceDetailScreen />} />
              <Route path="/places/:slug/bridge" element={<h1>Bridge tap</h1>} />
              <Route path="/signup" element={<h1>Sign up</h1>} />
            </Routes>
          </MemoryRouter>
        </SearchProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('PlaceDetailScreen — S19 gaps closed against the prototype', () => {
  beforeEach(() => {
    sessionStorage.clear();
    bookmarkedPlaceIds = [];
  });

  it('item 9: clicking Save actually flips the button to Saved, and back on a second click', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    // Scoped to <main> — AppShell's own tab bar also has a "Saved" nav item
    // (Bookmarks tab), a same-name coincidence unrelated to this button.
    const main = await screen.findByRole('main');
    const saveButton = await within(main).findByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);

    expect(await within(main).findByRole('button', { name: 'Saved' })).toBeInTheDocument();
    expect(within(main).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    await userEvent.click(within(main).getByRole('button', { name: 'Saved' }));
    expect(await within(main).findByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('falls back to a real map placeholder, matching the design copy, when a place has no coordinates', async () => {
    render(<Harness slug="restaurants%2Fdeccan-grill-house" />);
    expect(await screen.findByText('Map placeholder — open directions')).toBeInTheDocument();
    expect(screen.getByText('Real geography is deliberately not drawn')).toBeInTheDocument();
  });

  it('a Guest sees the locked "What to order" teaser, not the real count', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    expect(await screen.findByText('6 dishes mentioned — sign up to see them')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up to see them' })).toBeInTheDocument();
  });

  it('a signed-in User sees the real mention count, not the locked teaser', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(
      await screen.findByText('6 dishes mentioned by people who have logged a visit here.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up to see them' })).not.toBeInTheDocument();
  });

  it('a Guest tapping the bridge card sees the signup prompt instead of navigating through', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', {
        name: /closest places worth stopping at afterwards/,
      }),
    );

    expect(await screen.findByText('This one needs an account')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bridge tap' })).not.toBeInTheDocument();
  });

  it('"Continue as guest" closes the bridge-tap prompt without navigating away', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(
      await screen.findByRole('button', {
        name: /closest places worth stopping at afterwards/,
      }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Continue as guest' }));

    expect(screen.queryByText('This one needs an account')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bridge tap' })).not.toBeInTheDocument();
  });

  it('a signed-in User tapping the bridge card goes straight through, no prompt', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(
      await screen.findByRole('button', {
        name: /closest places worth stopping at afterwards/,
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Bridge tap' })).toBeInTheDocument();
  });

  it('shows "Is this your business? Claim it" for a signed-in User who does not own a verified claim', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Is this your business?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim it' })).toBeInTheDocument();
  });
});
