import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { MyRankedListScreen } from './MyRankedListScreen';

/**
 * P10 §6: a person's Google-place rankings (from onboarding, or the new
 * "I've been here" button on a real place's detail page) used to never show
 * up here at all — only the 17 seeded catalogue places did. They now render
 * as their own door-scoped column(s) alongside the catalogue's per-category
 * columns, so nothing a person ranks disappears from their own list.
 *
 * P11 §11: an earlier version of this screen had drifted far from the actual
 * S31 design (design_handoff_madli/prototype/Madli Prototype.dc.html) — no
 * header stats line, no Share/Re-rank buttons, no hide-visited toggle, no
 * "Been and loved"/"Been and fine" tier labels, no disliked-hidden footer,
 * and it used the raw stored position (which can have gaps where a disliked
 * entry sits) instead of a clean renumbering of the visible rows. This suite
 * also covers that rebuild.
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

function Harness() {
  return (
    <PersonaProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={['/my-list']}>
          <Routes>
            <Route path="/my-list" element={<MyRankedListScreen />} />
            <Route path="/log-visit" element={<h1>log-visit route</h1>} />
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

  it('shows the catalogue category column, and switching tabs reveals the Google door column', async () => {
    render(<Harness />);

    // Mobile layout (the default breakpoint here) shows one column at a
    // time behind tabs — the category heading (an <h3>) and its own tab
    // (a <button role="tab">) legitimately share the same text.
    expect(
      await screen.findByRole('heading', { name: 'Breakfast and tiffin' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cafe Bahar')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Eat — nearby places' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Eat — nearby places' }));
    expect(await screen.findByRole('heading', { name: 'Eat — nearby places' })).toBeInTheDocument();
    expect(screen.getByText('Testville Diner')).toBeInTheDocument();
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

  it('shows the stats subtitle, tier label, and the two action buttons', async () => {
    render(<Harness />);

    expect(await screen.findByText('Cafe Bahar')).toBeInTheDocument();
    // 1 catalogue entry + 1 Google entry from the mocks above.
    expect(
      screen.getByText('2 places ranked · 25 needed for full ranking weight'),
    ).toBeInTheDocument();
    expect(screen.getByText('Been and loved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share the list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-rank by comparing' })).toBeInTheDocument();
    expect(screen.getByText('Hide visited places elsewhere in the app')).toBeInTheDocument();
  });

  it('"Re-rank by comparing" goes to the same log-a-visit entry point as everywhere else', async () => {
    render(<Harness />);
    await screen.findByText('Cafe Bahar');

    await userEvent.click(screen.getByRole('button', { name: 'Re-rank by comparing' }));
    expect(await screen.findByRole('heading', { name: 'log-visit route' })).toBeInTheDocument();
  });

  it('"Share the list" copies a text summary to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Harness />);
    await screen.findByText('Cafe Bahar');

    await userEvent.click(screen.getByRole('button', { name: 'Share the list' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Cafe Bahar'));
    expect(await screen.findByText('Ranked list copied — paste it anywhere.')).toBeInTheDocument();
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
 * P12 §9: "my ranked list and any ranking logic should ask the user to rank
 * the place ... followed up with comparing the existing list."
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

  it('opens the same Rank-this-place card the rest of the app uses', async () => {
    render(<Harness />);

    await userEvent.click(await screen.findByRole('tab', { name: 'Eat — nearby places' }));
    await userEvent.click(screen.getByRole('button', { name: 'Re-rank' }));

    expect(await screen.findByRole('heading', { name: 'Rank this place' })).toBeInTheDocument();
  });

  it('offers no re-rank on a catalogue row — that path has no update mechanic yet', async () => {
    render(<Harness />);

    await screen.findByRole('heading', { name: 'Breakfast and tiffin' });
    expect(screen.queryByRole('button', { name: 'Re-rank' })).not.toBeInTheDocument();
  });
});
