import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchProvider } from '../../lib/searchState';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { BridgeTapScreen } from './BridgeTapScreen';
import type { GoogleCandidate } from '../../lib/placesSearch';
import type { Plan } from '../../data/plans';

/**
 * P5 §4: "Add to plan" now branches three ways depending on who is asking —
 * a Guest keeps the existing local-only Outing (no account to persist a
 * real plan under); a signed-in User with no plan yet for this anchor gets
 * a real one created (plan_items, not the old fixed pair); a signed-in User
 * who already has one gets the stop appended to it instead of a duplicate.
 *
 * usePersona is mocked directly (not the real PersonaProvider) because
 * `hasSession` only ever becomes true from a real supabase.auth session —
 * the dev-harness persona quick-switch deliberately never sets it (see
 * dev/PersonaContext.tsx), so there is no way to reach the signed-in-User
 * branch through that quick-switch in a test.
 */

const usePersonaMock = vi.fn();
vi.mock('../../dev/PersonaContext', () => ({
  usePersona: () => usePersonaMock(),
}));

vi.mock('../../lib/googleMaps', () => ({
  hasMapsApiKey: () => true,
  // GoogleMapView awaits this in an effect; these tests only care about the
  // "Add to plan" button logic, not the map itself, so a promise that never
  // resolves is a safe, side-effect-free stand-in.
  loadGoogleMaps: () => new Promise(() => {}),
}));

const searchCandidatesMock = vi.fn();
const fetchPlaceDetailsMock = vi.fn();
vi.mock('../../lib/placesSearch', () => ({
  searchCandidates: (...args: unknown[]) => searchCandidatesMock(...args),
  fetchPlaceDetails: (...args: unknown[]) => fetchPlaceDetailsMock(...args),
}));

const addOutingStopMock = vi.fn();
const isStopInOutingMock = vi.fn();
const getOutingMock = vi.fn();
vi.mock('../../lib/outingPlans', () => ({
  addOutingStop: (...args: unknown[]) => addOutingStopMock(...args),
  isStopInOuting: (...args: unknown[]) => isStopInOutingMock(...args),
  getOuting: (...args: unknown[]) => getOutingMock(...args),
}));

const usePlansMock = vi.fn();
const createPlanMutateAsyncMock = vi.fn();
const addPlanItemMutateAsyncMock = vi.fn();
vi.mock('../../data/hooks', () => ({
  usePlans: (...args: unknown[]) => usePlansMock(...args),
  useCreatePlan: () => ({ isPending: false, mutateAsync: createPlanMutateAsyncMock }),
  useAddPlanItem: () => ({ isPending: false, mutateAsync: addPlanItemMutateAsyncMock }),
}));

const NEARBY_STOP: GoogleCandidate = {
  placeId: 'nearby-stop-1',
  name: 'Durgam Cheruvu',
  address: 'Madhapur, near the cable bridge',
  location: { lat: 17.4300414, lng: 78.3894594 },
  types: ['park'],
  photoUrl: 'https://example.com/durgam-cheruvu.jpg',
};

// P14: the seed catalogue is retired — BridgeTapScreen now always resolves
// its anchor via fetchPlaceDetails, so every test below mocks it to this
// same Google-sourced "Hotel Shadab" data (its real former seeded lat/lng,
// kept as-is so every existing assertion stays meaningful).
const ANCHOR_PLACE_ID = 'ChIJKyxGIoiXyzsRPY8PASGdTW0';
function mockAnchor() {
  fetchPlaceDetailsMock.mockReset();
  fetchPlaceDetailsMock.mockResolvedValue({
    placeId: ANCHOR_PLACE_ID,
    name: 'Hotel Shadab',
    address: 'Ghansi Bazaar, Hyderabad',
    location: { lat: 17.368888, lng: 78.4755104 },
    types: ['restaurant'],
  });
}

function Harness({ slug = ANCHOR_PLACE_ID }: { slug?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SearchProvider>
          <MemoryRouter initialEntries={[`/places/${slug}/bridge`]}>
            <Routes>
              <Route path="/places/:slug/bridge" element={<BridgeTapScreen />} />
              <Route path="/plans/:id" element={<h1>plan detail</h1>} />
              <Route path="/places/:slug" element={<h1>place detail</h1>} />
            </Routes>
          </MemoryRouter>
        </SearchProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('BridgeTapScreen — Add to plan', () => {
  beforeEach(() => {
    mockAnchor();
    searchCandidatesMock.mockReset();
    addOutingStopMock.mockReset();
    isStopInOutingMock.mockReset();
    getOutingMock.mockReset();
    usePlansMock.mockReset();
    createPlanMutateAsyncMock.mockReset();
    addPlanItemMutateAsyncMock.mockReset();
    searchCandidatesMock.mockResolvedValue([NEARBY_STOP]);
    isStopInOutingMock.mockReturnValue(false);
    getOutingMock.mockReturnValue(undefined);
    usePlansMock.mockReturnValue({ data: [] });
    createPlanMutateAsyncMock.mockResolvedValue(undefined);
    addPlanItemMutateAsyncMock.mockResolvedValue(undefined);
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
  });

  it('a Guest adds to the local Outing — no real plan is created', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Add to plan' }));

    expect(addOutingStopMock).toHaveBeenCalledWith(
      'ChIJKyxGIoiXyzsRPY8PASGdTW0',
      'Hotel Shadab',
      expect.objectContaining({ placeId: 'nearby-stop-1', name: 'Durgam Cheruvu' }),
      { lat: 17.368888, lng: 78.4755104 },
    );
    expect(createPlanMutateAsyncMock).not.toHaveBeenCalled();
    expect(addPlanItemMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('a signed-in User with no plan yet for this anchor gets a real one created', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Add to plan' }));

    expect(createPlanMutateAsyncMock).toHaveBeenCalledWith({
      anchor: {
        key: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
        name: 'Hotel Shadab',
        lat: 17.368888,
        lng: 78.4755104,
      },
      firstStop: {
        googlePlaceId: 'nearby-stop-1',
        placeName: 'Durgam Cheruvu',
        address: 'Madhapur, near the cable bridge',
        lat: 17.4300414,
        lng: 78.3894594,
      },
    });
    expect(addOutingStopMock).not.toHaveBeenCalled();
    expect(addPlanItemMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('a signed-in User who already has a plan for this anchor gets the stop appended instead', async () => {
    const existingPlan: Plan = {
      id: 'plan-1',
      userId: 'u1',
      anchorKey: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
      anchorName: 'Hotel Shadab',
      anchorLat: 17.368888,
      anchorLng: 78.4755104,
      name: null,
      shareToken: null,
      stops: [
        {
          googlePlaceId: 'already-there',
          placeName: 'Somewhere Else',
          address: null,
          lat: null,
          lng: null,
          position: 1,
        },
      ],
    };
    usePlansMock.mockReturnValue({ data: [existingPlan] });
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });

    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Add to plan' }));

    expect(addPlanItemMutateAsyncMock).toHaveBeenCalledWith({
      planId: 'plan-1',
      stop: {
        googlePlaceId: 'nearby-stop-1',
        placeName: 'Durgam Cheruvu',
        address: 'Madhapur, near the cable bridge',
        lat: 17.4300414,
        lng: 78.3894594,
      },
    });
    expect(createPlanMutateAsyncMock).not.toHaveBeenCalled();
  });

  it('P8 §1: shows at most 3 nearby places even when more are available', async () => {
    const manyCandidates: GoogleCandidate[] = Array.from({ length: 6 }, (_, i) => ({
      placeId: `nearby-stop-${i + 1}`,
      name: `Place ${i + 1}`,
      address: 'Somewhere, Hyderabad',
      // Increasing distance from the anchor so the sort/slice order is deterministic.
      location: { lat: 17.368888 + (i + 1) * 0.01, lng: 78.4755104 + (i + 1) * 0.01 },
      types: ['park'],
    }));
    searchCandidatesMock.mockResolvedValue(manyCandidates);
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    render(<Harness />);

    await screen.findByText('Place 1');
    expect(screen.getAllByRole('button', { name: 'Add to plan' })).toHaveLength(3);
    expect(screen.queryByText('Place 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Place 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Place 6')).not.toBeInTheDocument();
  });

  it('a stop already on the existing plan shows Added and does not call either mutation again', async () => {
    const existingPlan: Plan = {
      id: 'plan-1',
      userId: 'u1',
      anchorKey: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
      anchorName: 'Hotel Shadab',
      anchorLat: 17.368888,
      anchorLng: 78.4755104,
      name: null,
      shareToken: null,
      stops: [
        {
          googlePlaceId: 'nearby-stop-1',
          placeName: 'Durgam Cheruvu',
          address: null,
          lat: null,
          lng: null,
          position: 1,
        },
      ],
    };
    usePlansMock.mockReturnValue({ data: [existingPlan] });
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });

    const user = userEvent.setup();
    render(<Harness />);

    const addedButton = await screen.findByRole('button', { name: 'Added' });
    expect(addedButton).toBeInTheDocument();
    await user.click(addedButton);

    expect(createPlanMutateAsyncMock).not.toHaveBeenCalled();
    expect(addPlanItemMutateAsyncMock).not.toHaveBeenCalled();
  });
});

// Phase 6 §8 repro: SavedPlanDetailScreen's "Add another stop" button
// navigates to `/places/${plan.anchorPlaceId}/bridge` — the plan's raw
// anchorKey, always a real Google place id now that plans can only ever be
// anchored to a Google-sourced place.
describe('BridgeTapScreen — Phase 6 §8: "Add another stop" from a saved plan', () => {
  beforeEach(() => {
    searchCandidatesMock.mockReset();
    fetchPlaceDetailsMock.mockReset();
    addOutingStopMock.mockReset();
    isStopInOutingMock.mockReset();
    getOutingMock.mockReset();
    usePlansMock.mockReset();
    createPlanMutateAsyncMock.mockReset();
    addPlanItemMutateAsyncMock.mockReset();
    searchCandidatesMock.mockResolvedValue([NEARBY_STOP]);
    isStopInOutingMock.mockReturnValue(false);
    getOutingMock.mockReturnValue(undefined);
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });
  });

  it('re-anchored via a real Google place id (SavedPlanDetailScreen\'s "Add another stop") appends to the existing plan, not a new one', async () => {
    const GOOGLE_ANCHOR_ID = 'ChIJKyxGIoiXyzsRPY8PASGdTW0';
    const existingPlan: Plan = {
      id: 'plan-1',
      userId: 'user-1',
      anchorKey: GOOGLE_ANCHOR_ID,
      anchorName: 'Hotel Shadab',
      anchorLat: 17.368888,
      anchorLng: 78.4755104,
      name: null,
      shareToken: null,
      stops: [
        {
          googlePlaceId: 'already-there',
          placeName: 'Somewhere Else',
          address: null,
          lat: 17.4,
          lng: 78.4,
          position: 1,
        },
      ],
    };
    usePlansMock.mockReturnValue({ data: [existingPlan] });
    fetchPlaceDetailsMock.mockResolvedValue({
      placeId: GOOGLE_ANCHOR_ID,
      name: 'Hotel Shadab',
      address: 'Somewhere, Hyderabad',
      location: { lat: 17.368888, lng: 78.4755104 },
      types: ['restaurant'],
    });

    const user = userEvent.setup();
    render(<Harness slug={encodeURIComponent(GOOGLE_ANCHOR_ID)} />);

    await user.click(await screen.findByRole('button', { name: 'Add to plan' }));

    expect(addPlanItemMutateAsyncMock).toHaveBeenCalledWith({
      planId: 'plan-1',
      stop: expect.objectContaining({ googlePlaceId: 'nearby-stop-1' }),
    });
    expect(createPlanMutateAsyncMock).not.toHaveBeenCalled();
  });
});

describe('BridgeTapScreen — Phase 6 §7: door selector + reference-point priority', () => {
  beforeEach(() => {
    mockAnchor();
    searchCandidatesMock.mockReset();
    addOutingStopMock.mockReset();
    isStopInOutingMock.mockReset();
    getOutingMock.mockReset();
    usePlansMock.mockReset();
    createPlanMutateAsyncMock.mockReset();
    addPlanItemMutateAsyncMock.mockReset();
    searchCandidatesMock.mockResolvedValue([NEARBY_STOP]);
    isStopInOutingMock.mockReturnValue(false);
    getOutingMock.mockReturnValue(undefined);
    usePlansMock.mockReturnValue({ data: [] });
  });

  it('Hotel Shadab (an Eat place) defaults to searching Explore', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    render(<Harness />);

    await screen.findByRole('tab', { name: 'Explore' });
    expect(screen.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
    expect(searchCandidatesMock).toHaveBeenCalledWith(expect.objectContaining({ door: 'explore' }));
  });

  it('clicking "Eat" overrides the default and re-searches that door instead', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('tab', { name: 'Eat' }));

    expect(await screen.findByRole('tab', { name: 'Eat' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(searchCandidatesMock).toHaveBeenLastCalledWith(expect.objectContaining({ door: 'eat' }));
  });

  it("a Guest's outing already in progress searches from the most recently added stop, not the original anchor", async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    getOutingMock.mockReturnValue({
      anchorPlaceId: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
      anchorName: 'Hotel Shadab',
      anchorLat: 17.368888,
      anchorLng: 78.4755104,
      stops: [
        {
          placeId: 'first-stop',
          name: 'First Stop',
          address: '',
          lat: 17.4,
          lng: 78.4,
          addedAt: 1,
        },
        {
          placeId: 'most-recent-stop',
          name: 'Most Recent Stop',
          address: '',
          lat: 17.45,
          lng: 78.45,
          addedAt: 2,
        },
      ],
    });
    render(<Harness />);

    expect(await screen.findByText(/within reach of Most Recent Stop/)).toBeInTheDocument();
    expect(searchCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ center: { lat: 17.45, lng: 78.45 } }),
    );
  });

  it("a signed-in User's plan searches from the most recently added stop (highest position), not the anchor", async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });
    usePlansMock.mockReturnValue({
      data: [
        {
          id: 'plan-1',
          userId: 'user-1',
          anchorKey: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
          anchorName: 'Hotel Shadab',
          anchorLat: 17.368888,
          anchorLng: 78.4755104,
          name: null,
          shareToken: null,
          stops: [
            {
              googlePlaceId: 'stop-a',
              placeName: 'Stop A',
              address: null,
              lat: 17.4,
              lng: 78.4,
              position: 1,
            },
            {
              googlePlaceId: 'stop-b',
              placeName: 'Stop B',
              address: null,
              lat: 17.42,
              lng: 78.42,
              position: 2,
            },
          ],
        },
      ],
    });
    render(<Harness />);

    expect(await screen.findByText(/within reach of Stop B/)).toBeInTheDocument();
    expect(searchCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ center: { lat: 17.42, lng: 78.42 } }),
    );
  });
});

describe('BridgeTapScreen — Phase 8 §12: View plan button', () => {
  beforeEach(() => {
    mockAnchor();
    searchCandidatesMock.mockReset();
    addOutingStopMock.mockReset();
    isStopInOutingMock.mockReset();
    getOutingMock.mockReset();
    usePlansMock.mockReset();
    createPlanMutateAsyncMock.mockReset();
    addPlanItemMutateAsyncMock.mockReset();
    searchCandidatesMock.mockResolvedValue([NEARBY_STOP]);
    isStopInOutingMock.mockReturnValue(false);
    getOutingMock.mockReturnValue(undefined);
    usePlansMock.mockReturnValue({ data: [] });
  });

  it('is absent for a Guest with no outing under way for this anchor yet', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    render(<Harness />);

    await screen.findByRole('button', { name: 'Add to plan' });
    expect(screen.queryByRole('button', { name: 'View plan' })).not.toBeInTheDocument();
  });

  it('appears for a Guest whose outing already has a stop, and opens that outing', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
    getOutingMock.mockReturnValue({
      anchorPlaceId: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
      anchorName: 'Hotel Shadab',
      anchorLat: 17.368888,
      anchorLng: 78.4755104,
      stops: [
        {
          placeId: 'first-stop',
          name: 'First Stop',
          address: '',
          lat: 17.4,
          lng: 78.4,
          addedAt: 1,
        },
      ],
    });
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'View plan' }));
    expect(await screen.findByRole('heading', { name: 'plan detail' })).toBeInTheDocument();
  });

  it('is absent for a signed-in User with no plan yet for this anchor', async () => {
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });
    render(<Harness />);

    await screen.findByRole('button', { name: 'Add to plan' });
    expect(screen.queryByRole('button', { name: 'View plan' })).not.toBeInTheDocument();
  });

  it('appears for a signed-in User who already has a plan for this anchor, and opens that plan', async () => {
    const existingPlan: Plan = {
      id: 'plan-1',
      userId: 'user-1',
      anchorKey: 'ChIJKyxGIoiXyzsRPY8PASGdTW0',
      anchorName: 'Hotel Shadab',
      anchorLat: 17.368888,
      anchorLng: 78.4755104,
      name: null,
      shareToken: null,
      stops: [
        {
          googlePlaceId: 'already-there',
          placeName: 'Somewhere Else',
          address: null,
          lat: null,
          lng: null,
          position: 1,
        },
      ],
    };
    usePlansMock.mockReturnValue({ data: [existingPlan] });
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: true, userId: 'user-1' });

    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'View plan' }));
    expect(await screen.findByRole('heading', { name: 'plan detail' })).toBeInTheDocument();
  });
});

/**
 * P13 §5: "when the user clicks on the places or images the placedetail
 * page should open" — only the separate "Details" button did that before;
 * the photo and the name/reason block right next to it did nothing.
 */
describe('BridgeTapScreen — tapping a nearby stop opens its place detail page', () => {
  beforeEach(() => {
    mockAnchor();
    searchCandidatesMock.mockReset();
    searchCandidatesMock.mockResolvedValue([NEARBY_STOP]);
    usePlansMock.mockReset();
    usePlansMock.mockReturnValue({ data: [] });
    usePersonaMock.mockReturnValue({ breakpoint: 'desktop', hasSession: false, userId: '' });
  });

  it('clicking the photo opens the place detail page', async () => {
    render(<Harness />);
    const photoButton = (await screen.findByAltText('Durgam Cheruvu')).closest('button')!;
    await userEvent.click(photoButton);
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });

  it('clicking the place name opens the place detail page', async () => {
    render(<Harness />);
    const nameButton = (
      await screen.findByRole('heading', { name: 'Durgam Cheruvu', level: 3 })
    ).closest('button')!;
    await userEvent.click(nameButton);
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });

  it('the "Details" button still opens it too', async () => {
    render(<Harness />);
    await userEvent.click(await screen.findByRole('button', { name: 'Details' }));
    expect(await screen.findByRole('heading', { name: 'place detail' })).toBeInTheDocument();
  });
});
