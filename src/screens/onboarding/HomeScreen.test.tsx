import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona, MOCK_USER_ID } from '../../dev/PersonaContext';
import { SearchProvider, useSearch } from '../../lib/searchState';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { HomeScreen } from './HomeScreen';

/**
 * Phase 8 §9: the Gem of the town banner used to appear on Home, scoped to
 * whichever area a person had picked — but it only ever had one seeded gem
 * (Subhan Bakery, Nampally) to show, so in practice it was a hardcoded
 * Hyderabad banner masquerading as a dynamic feature. Removed entirely;
 * this pins that it is gone even right on top of that one seeded place.
 */

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('../../data/areaCounts', () => ({
  useAreaDoorCountsLive: () => ({ data: undefined }),
}));

let nudgeCandidate: unknown = null;
vi.mock('../../data/postVisitNudge', () => ({
  usePostVisitNudgeCandidate: () => nudgeCandidate,
}));

// P12 §9: Home now reads the signed-in person's own ranked places to show
// their list for this locality. Mocked rather than wrapped in a
// QueryClientProvider so these tests keep testing Home, not react-query.
let myRankings: unknown[] = [];
vi.mock('../../data/googleRankings', () => ({
  useMyGoogleRankings: () => ({ data: myRankings }),
}));

// P14: Home now reads/writes the signed-in person's home area directly
// (the toggle used to live on every row of PickAreaScreen's own lists).
// Text-only (home_area_text) -- the seeded-area id path this used to also
// support has nothing left to point at once the seed catalogue is retired.
let homeArea: { areaId: string | null; areaText: string | null } = {
  areaId: null,
  areaText: null,
};
const setHomeAreaTextMock = vi.fn();
vi.mock('../../data/homeArea', () => ({
  fetchHomeArea: () => Promise.resolve(homeArea),
  setHomeAreaText: (...args: unknown[]) => setHomeAreaTextMock(...args),
}));

function seedRanking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    googlePlaceId: 'g-ranked-1',
    placeName: 'Olive Bistro & Bar',
    door: 'eat',
    tier: 'loved',
    raterType: 'local',
    position: 1,
    areaText: 'Jubilee Hills',
    location: null,
    types: ['restaurant'],
    ...overrides,
  };
}

function SeedArea({
  areaText,
  center,
}: {
  areaText: string;
  center: { lat: number; lng: number };
}) {
  const { setSearch } = useSearch();
  return (
    <button onClick={() => setSearch({ areaText, center, centerSource: 'area' })}>
      seed {areaText}
    </button>
  );
}

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function Harness({ areaText, center }: { areaText: string; center: { lat: number; lng: number } }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <SearchProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/app']}>
              <SeedArea areaText={areaText} center={center} />
              <SetPersona to="user" />
              <Routes>
                <Route path="/app" element={<HomeScreen />} />
                <Route path="/places/:slug" element={<h1>Place detail</h1>} />
                <Route path="/post-visit-nudge" element={<h1>Post-visit nudge</h1>} />
                <Route path="/results/eat" element={<h1>eat results</h1>} />
                <Route path="/results/explore" element={<h1>explore results</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </SearchProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('HomeScreen — Phase 8 §9: no Gem of the town banner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    nudgeCandidate = null;
    myRankings = [];
    homeArea = { areaId: null, areaText: null };
    setHomeAreaTextMock.mockReset();
  });

  it('never shows a gem banner, even right on top of the one seeded gem (Nampally)', async () => {
    render(<Harness areaText="Nampally" center={{ lat: 17.3833, lng: 78.4757 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Nampally' }));

    await screen.findByRole('heading', { name: 'Where to start?' });
    expect(screen.queryByText('Gem of the town · this week')).not.toBeInTheDocument();
    expect(screen.queryByText('Subhan Bakery')).not.toBeInTheDocument();
  });

  it('still shows the two doors and lets Eat navigate to intake', async () => {
    render(<Harness areaText="Nampally" center={{ lat: 17.3833, lng: 78.4757 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Nampally' }));

    expect(await screen.findByText('Eat')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });
});

// P10 §5: Home is the real trigger for the post-visit nudge (S30) — there is
// no push-notification system, so "some time after a visit" is not
// reachable; this is the next-best real moment; landing here.
describe('HomeScreen — post-visit nudge trigger (P10 §5)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    myRankings = [];
    homeArea = { areaId: null, areaText: null };
  });

  it('navigates to the nudge once a bookmarked-but-unranked candidate exists', async () => {
    nudgeCandidate = { kind: 'catalogue', placeId: 'p1', placeName: 'Cafe Bahar' };
    render(<Harness areaText="Nampally" center={{ lat: 17.3833, lng: 78.4757 }} />);

    expect(await screen.findByRole('heading', { name: 'Post-visit nudge' })).toBeInTheDocument();
  });

  it('does not navigate when there is no candidate', async () => {
    nudgeCandidate = null;
    render(<Harness areaText="Nampally" center={{ lat: 17.3833, lng: 78.4757 }} />);

    await screen.findByRole('heading', { name: 'Where to start?' });
    expect(screen.queryByRole('heading', { name: 'Post-visit nudge' })).not.toBeInTheDocument();
  });

  it('only navigates once per session even if the candidate is still present', async () => {
    nudgeCandidate = { kind: 'catalogue', placeId: 'p1', placeName: 'Cafe Bahar' };
    sessionStorage.setItem('madli.postVisitNudge.shown', '1');
    render(<Harness areaText="Nampally" center={{ lat: 17.3833, lng: 78.4757 }} />);

    await screen.findByRole('heading', { name: 'Where to start?' });
    expect(screen.queryByRole('heading', { name: 'Post-visit nudge' })).not.toBeInTheDocument();
  });
});

/**
 * P12 §9: "in the app page after login show the user his place in that
 * locality based on his rankings."
 */
describe('HomeScreen — your own ranked places in this locality', () => {
  beforeEach(() => {
    sessionStorage.clear();
    nudgeCandidate = null;
    myRankings = [];
    homeArea = { areaId: null, areaText: null };
  });

  it('shows a signed-in person their ranked places for the area they are in', async () => {
    myRankings = [seedRanking()];
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Your list in Jubilee Hills')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Olive Bistro & Bar' })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('leaves out places ranked somewhere else entirely', async () => {
    myRankings = [seedRanking({ areaText: 'Alwal', location: { lat: 17.6, lng: 78.6 } })];
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(screen.queryByText('Your list in Jubilee Hills')).not.toBeInTheDocument();
  });

  it('never shows it to a Guest — a Guest has no rankings to show', async () => {
    myRankings = [seedRanking()];
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));

    expect(screen.queryByText('Your list in Jubilee Hills')).not.toBeInTheDocument();
  });
});

/**
 * P14 §1: "Set as home" moved off every row of PickAreaScreen's own lists
 * (most of which someone would never revisit) onto the one place it
 * actually matters — the area currently in view.
 */
describe('HomeScreen — "Set as home" on the current area', () => {
  beforeEach(() => {
    sessionStorage.clear();
    nudgeCandidate = null;
    myRankings = [];
    homeArea = { areaId: null, areaText: null };
    setHomeAreaTextMock.mockReset().mockResolvedValue(undefined);
  });

  it('is absent for a Guest', async () => {
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));

    await screen.findByText('Jubilee Hills · Change');
    expect(screen.queryByText('Set as home')).not.toBeInTheDocument();
    expect(screen.queryByText('Home area')).not.toBeInTheDocument();
  });

  it('offers "Set as home" for a signed-in person, and marks the current area home', async () => {
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    const setHome = await screen.findByText('Set as home');
    await userEvent.click(setHome);

    expect(setHomeAreaTextMock).toHaveBeenCalledWith(MOCK_USER_ID, 'Jubilee Hills');
    expect(await screen.findByText('Home area')).toBeInTheDocument();
  });

  it('shows "Home area" (not "Set as home") once the current area already is the marked home', async () => {
    homeArea = { areaId: null, areaText: 'Jubilee Hills' };
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Home area')).toBeInTheDocument();
    expect(screen.queryByText('Set as home')).not.toBeInTheDocument();
  });

  it('marks a live-searched (non-seeded) area home via home_area_text', async () => {
    render(<Harness areaText="Bandra West" center={{ lat: 19.0596, lng: 72.8295 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Bandra West' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByText('Set as home'));

    expect(setHomeAreaTextMock).toHaveBeenCalledWith(MOCK_USER_ID, 'Bandra West');
  });
});

/** P14 §3: the last five searches, right on Home, not only the Search tab. */
describe('HomeScreen — recent searches', () => {
  beforeEach(() => {
    sessionStorage.clear();
    nudgeCandidate = null;
    myRankings = [];
    homeArea = { areaId: null, areaText: null };
    localStorage.clear();
  });

  it('shows the real last five under a plain "Recent searches" heading, no count', async () => {
    localStorage.setItem(
      `madli.recentSearches.${MOCK_USER_ID}`,
      JSON.stringify([
        { id: 'r1', door: 'eat', label: 'Eat · biryani', savedAt: 1, snapshot: { door: 'eat' } },
      ]),
    );
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    expect(await screen.findByText('Recent searches')).toBeInTheDocument();
    expect(screen.getByText('Eat · biryani')).toBeInTheDocument();
  });

  it('clicking a recent search restores it and opens that door\'s results', async () => {
    localStorage.setItem(
      `madli.recentSearches.${MOCK_USER_ID}`,
      JSON.stringify([
        {
          id: 'r1',
          door: 'explore',
          label: 'Explore · Historical',
          savedAt: 1,
          snapshot: { door: 'explore', vibes: ['Historical'] },
        },
      ]),
    );
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByText('Explore · Historical'));
    expect(await screen.findByRole('heading', { name: 'explore results' })).toBeInTheDocument();
  });

  it('is absent when there is nothing to show', async () => {
    render(<Harness areaText="Jubilee Hills" center={{ lat: 17.4239, lng: 78.4738 }} />);
    await userEvent.click(screen.getByRole('button', { name: 'seed Jubilee Hills' }));
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await screen.findByText('Eat');
    expect(screen.queryByText('Recent searches')).not.toBeInTheDocument();
  });
});
