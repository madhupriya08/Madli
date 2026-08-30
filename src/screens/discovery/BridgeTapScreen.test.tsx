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
vi.mock('../../lib/placesSearch', () => ({
  searchCandidates: (...args: unknown[]) => searchCandidatesMock(...args),
  fetchPlaceDetails: vi.fn(),
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
};

function Harness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SearchProvider>
          <MemoryRouter initialEntries={['/places/restaurants%2Fhotel-shadab/bridge']}>
            <Routes>
              <Route path="/places/:slug/bridge" element={<BridgeTapScreen />} />
            </Routes>
          </MemoryRouter>
        </SearchProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('BridgeTapScreen — Add to plan', () => {
  beforeEach(() => {
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

describe('BridgeTapScreen — Phase 6 §7: door selector + reference-point priority', () => {
  beforeEach(() => {
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
    expect(searchCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ door: 'explore' }),
    );
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
    expect(searchCandidatesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ door: 'eat' }),
    );
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

    expect(await screen.findByText(/Nearest to Most Recent Stop/)).toBeInTheDocument();
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

    expect(await screen.findByText(/Nearest to Stop B/)).toBeInTheDocument();
    expect(searchCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ center: { lat: 17.42, lng: 78.42 } }),
    );
  });
});
