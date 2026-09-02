import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { SearchProvider, useSearch } from '../../lib/searchState';
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
  useAreaDoorCounts: () => ({ data: undefined }),
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
  return (
    <PersonaProvider>
      <SearchProvider>
        <MemoryRouter initialEntries={['/app']}>
          <SeedArea areaText={areaText} center={center} />
          <SetPersona to="user" />
          <Routes>
            <Route path="/app" element={<HomeScreen />} />
            <Route path="/places/:slug" element={<h1>Place detail</h1>} />
            <Route path="/post-visit-nudge" element={<h1>Post-visit nudge</h1>} />
          </Routes>
        </MemoryRouter>
      </SearchProvider>
    </PersonaProvider>
  );
}

describe('HomeScreen — Phase 8 §9: no Gem of the town banner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    nudgeCandidate = null;
    myRankings = [];
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
