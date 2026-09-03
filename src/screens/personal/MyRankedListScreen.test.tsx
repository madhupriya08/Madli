import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { MyRankedListScreen } from './MyRankedListScreen';

/**
 * P10 §6: a person's Google-place rankings (from onboarding, or the new
 * "I've been here" button on a real place's detail page) used to never show
 * up here at all — only the 17 seeded catalogue places did. They now render
 * as their own subtype-scoped column(s) alongside the catalogue's
 * per-category columns, so nothing a person ranks disappears from their own
 * list.
 *
 * P11 §11: an earlier version of this screen had drifted far from the actual
 * S31 design (design_handoff_madli/prototype/Madli Prototype.dc.html) — no
 * header stats line, no Share/Re-rank buttons, no hide-visited toggle, no
 * "Been and loved"/"Been and fine" tier labels, no disliked-hidden footer,
 * and it used the raw stored position (which can have gaps where a disliked
 * entry sits) instead of a clean renumbering of the visible rows. This suite
 * also covers that rebuild.
 *
 * P13 §7: Google rankings split by subtype within each door now (not just
 * one flat "Eat"/"Explore" column) — see rankedSubtypes.test.ts for the
 * type→subtype rules themselves; this file only checks that the screen
 * actually renders that grouping.
 *
 * P13 §6: "Re-rank by comparing" used to be one screen-level button naming
 * no place at all, so it fell back to an arbitrary fixed catalogue place
 * every time it was clicked. It is a per-row action now, for both kinds of
 * ranked place, always on the actual row someone taps.
 */

const CAT_ID = '00000000-0000-0000-0000-0000000000c1';

interface MockEntry {
  id: string;
  placeId: string;
  categoryId: string;
  tier: string;
  position: number;
}
interface MockGoogleEntry {
  id: string;
  googlePlaceId: string;
  placeName: string;
  door: string;
  tier: string;
  raterType: string;
  position: number;
  areaText: string | null;
  types: string[];
}

let rankedEntries: MockEntry[] = [];
let googleRankings: MockGoogleEntry[] = [];

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock('../../data/hooks', async () => {
  const actual = await vi.importActual<typeof import('../../data/hooks')>('../../data/hooks');
  return {
    ...actual,
    useAllRankedEntries: () => ({ data: rankedEntries }),
  };
});

const PLACE_NAMES: Record<string, string> = {
  'catalogue-1': 'Cafe Bahar',
  'catalogue-2': 'Charminar',
  'catalogue-3': 'Chutneys',
};

vi.mock('../../fixtures/places', async () => {
  const actual =
    await vi.importActual<typeof import('../../fixtures/places')>('../../fixtures/places');
  return {
    ...actual,
    placeById: (id: string) => (PLACE_NAMES[id] ? { id, name: PLACE_NAMES[id] } : undefined),
  };
});

vi.mock('../../data/googleRankings', async () => {
  const actual = await vi.importActual<typeof import('../../data/googleRankings')>(
    '../../data/googleRankings',
  );
  return {
    ...actual,
    useMyGoogleRankings: () => ({ data: googleRankings }),
    // P12 §9: the re-rank card this screen now opens reads both of these.
    // Mocked so these tests stay about the list, not react-query.
    useResidentStatus: () => ({ data: 'visitor' }),
    useRankGooglePlace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

// Shows what navigation state actually reached '/log-visit' — the whole
// point of the P13 §6 regression tests below is that a specific, correct
// placeId gets there, not an arbitrary fallback.
function LogVisitRouteProbe() {
  const location = useLocation();
  const placeId = (location.state as { placeId?: string } | null)?.placeId;
  return <h1>log-visit route: {placeId ?? 'no placeId'}</h1>;
}

function Harness() {
  return (
    <PersonaProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={['/my-list']}>
          <Routes>
            <Route path="/my-list" element={<MyRankedListScreen />} />
            <Route path="/log-visit" element={<LogVisitRouteProbe />} />
            <Route path="/search" element={<h1>search route</h1>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </PersonaProvider>
  );
}

describe('MyRankedListScreen — merges catalogue and Google rankings', () => {
  beforeEach(() => {
    rankedEntries = [
      { id: 'e1', placeId: 'catalogue-1', categoryId: CAT_ID, tier: 'loved', position: 1 },
    ];
    googleRankings = [
      {
        id: 'g1',
        googlePlaceId: 'google-1',
        placeName: 'Testville Diner',
        door: 'eat',
        tier: 'loved',
        raterType: 'visitor',
        position: 1,
        areaText: null,
        types: ['restaurant'],
      },
    ];
  });

  it('shows the catalogue category column, and switching tabs reveals the Google subtype column', async () => {
    render(<Harness />);

    // Mobile layout (the default breakpoint here) shows one column at a
    // time behind tabs — the category heading (an <h3>) and its own tab
    // (a <button role="tab">) legitimately share the same text.
    expect(
      await screen.findByRole('heading', { name: 'Breakfast and tiffin' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cafe Bahar')).toBeInTheDocument();
    // A plain 'restaurant' type falls to the Eat door's own fallback bucket.
    expect(screen.getByRole('tab', { name: 'Eat · Restaurants' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Eat · Restaurants' }));
    expect(await screen.findByRole('heading', { name: 'Eat · Restaurants' })).toBeInTheDocument();
    expect(screen.getByText('Testville Diner')).toBeInTheDocument();
  });

  it('splits Google rankings into more than one column when their types differ', async () => {
    rankedEntries = [];
    googleRankings = [
      {
        id: 'g1',
        googlePlaceId: 'google-1',
        placeName: 'Testville Diner',
        door: 'eat',
        tier: 'loved',
        raterType: 'visitor',
        position: 1,
        areaText: null,
        types: ['restaurant'],
      },
      {
        id: 'g2',
        googlePlaceId: 'google-2',
        placeName: 'Testville Coffee',
        door: 'eat',
        tier: 'loved',
        raterType: 'visitor',
        position: 2,
        areaText: null,
        types: ['cafe'],
      },
    ];
    render(<Harness />);

    expect(await screen.findByRole('tab', { name: 'Eat · Restaurants' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Eat · Cafes' })).toBeInTheDocument();
  });
});

describe('MyRankedListScreen — matches the S31 design handoff', () => {
  beforeEach(() => {
    rankedEntries = [
      { id: 'e1', placeId: 'catalogue-1', categoryId: CAT_ID, tier: 'loved', position: 1 },
    ];
    googleRankings = [
      {
        id: 'g1',
        googlePlaceId: 'google-1',
        placeName: 'Testville Diner',
        door: 'eat',
        tier: 'loved',
        raterType: 'visitor',
        position: 1,
        areaText: null,
        types: ['restaurant'],
      },
    ];
  });

  it('shows the stats subtitle, tier label, and the Share action', async () => {
    render(<Harness />);

    expect(await screen.findByText('Cafe Bahar')).toBeInTheDocument();
    // 1 catalogue entry + 1 Google entry from the mocks above.
    expect(
      screen.getByText('2 places ranked · 25 needed for full ranking weight'),
    ).toBeInTheDocument();
    expect(screen.getByText('Been and loved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share the list' })).toBeInTheDocument();
    expect(screen.getByText('Hide visited places elsewhere in the app')).toBeInTheDocument();
  });

  it('"Share the list" copies a text summary to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Harness />);
    await screen.findByText('Cafe Bahar');

    await userEvent.click(screen.getByRole('button', { name: 'Share the list' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Cafe Bahar'));
    expect(await screen.findByText('Ranked list copied. Paste it anywhere.')).toBeInTheDocument();
  });

  it('renumbers visible rows sequentially, closing the gap a hidden disliked entry leaves in the raw position', async () => {
    rankedEntries = [
      { id: 'e1', placeId: 'catalogue-1', categoryId: CAT_ID, tier: 'loved', position: 1 },
      { id: 'e2', placeId: 'catalogue-2', categoryId: CAT_ID, tier: 'disliked', position: 2 },
      { id: 'e3', placeId: 'catalogue-3', categoryId: CAT_ID, tier: 'fine', position: 3 },
    ];
    googleRankings = [];
    render(<Harness />);

    expect(await screen.findByText('#1')).toBeInTheDocument();
    // The disliked entry (would-be #2) is hidden — the next visible entry
    // renumbers to #2, not #3, and the raw position gap never reaches the
    // screen.
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.queryByText('#3')).not.toBeInTheDocument();
    expect(screen.getByText('1 disliked, hidden but still counted')).toBeInTheDocument();
  });
});

/**
 * P13 §6: re-ranking is a per-row action, on the actual place shown — never
 * a screen-level button naming nothing, which is what let the old
 * "Re-rank by comparing" button silently fall back to an unrelated,
 * hardcoded catalogue place on every click.
 */
describe('MyRankedListScreen — re-ranking from the list itself', () => {
  beforeEach(() => {
    rankedEntries = [
      { id: 'e1', placeId: 'catalogue-1', categoryId: CAT_ID, tier: 'loved', position: 1 },
    ];
    googleRankings = [
      {
        id: 'g1',
        googlePlaceId: 'google-1',
        placeName: 'Testville Diner',
        door: 'eat',
        tier: 'loved',
        raterType: 'visitor',
        position: 1,
        areaText: null,
        types: ['restaurant'],
      },
    ];
  });

  it('there is no screen-level "Re-rank by comparing" button any more', async () => {
    render(<Harness />);
    await screen.findByText('Cafe Bahar');
    expect(screen.queryByRole('button', { name: 'Re-rank by comparing' })).not.toBeInTheDocument();
  });

  it('a Google row opens the same Rank-this-place card the rest of the app uses', async () => {
    render(<Harness />);

    await userEvent.click(await screen.findByRole('tab', { name: 'Eat · Restaurants' }));
    await userEvent.click(screen.getByRole('button', { name: 'Re-rank' }));

    expect(await screen.findByRole('heading', { name: 'Rank this place' })).toBeInTheDocument();
  });

  it('a catalogue row\'s "Re-rank" goes to the real comparison flow, on that exact place — not an unrelated fallback', async () => {
    render(<Harness />);

    await screen.findByRole('heading', { name: 'Breakfast and tiffin' });
    await userEvent.click(screen.getByRole('button', { name: 'Re-rank' }));

    expect(
      await screen.findByRole('heading', { name: 'log-visit route: catalogue-1' }),
    ).toBeInTheDocument();
  });
});

describe('MyRankedListScreen — empty state does not fall back to a hardcoded place either', () => {
  beforeEach(() => {
    rankedEntries = [];
    googleRankings = [];
  });

  it('"Find a place to rank" goes to Search, not a broken log-visit link', async () => {
    render(<Harness />);

    await userEvent.click(await screen.findByRole('button', { name: 'Find a place to rank' }));
    expect(await screen.findByRole('heading', { name: 'search route' })).toBeInTheDocument();
  });
});
