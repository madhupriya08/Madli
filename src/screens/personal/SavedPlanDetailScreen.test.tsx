import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SavedPlanDetailScreen } from './SavedPlanDetailScreen';
import type { Plan } from '../../data/plans';
import type { OutingPlan } from '../../lib/outingPlans';

/**
 * Phase 8 §2: "plan stop positions rotate when adding places" — traced to
 * Phase 6 §9's shortest-route display reorder, which recomputed fresh on
 * every render, so adding one stop could reshuffle every other stop's
 * displayed position too. Removed outright: the stop list, map markers and
 * Google Maps route now always use the plan's actual stored order
 * (plan_items.position, or insertion order for a local Guest Outing) and
 * nothing here reorders it, regardless of stop count.
 *
 * Phase 8 §3: "give an option to edit the plan — basically delete the
 * places from plan" — a "Remove" button per stop, for both a real,
 * signed-in-User plan (fn_remove_plan_item) and a Guest's local Outing
 * (removeOutingStop). Either path deletes the whole plan too when it was
 * the last remaining stop, and navigates back to Bookmarks in that case.
 */

vi.mock('../../lib/googleMaps', () => ({
  hasMapsApiKey: () => true,
  loadGoogleMaps: () => new Promise(() => {}),
}));

const usePersonaMock = vi.fn();
vi.mock('../../dev/PersonaContext', () => ({
  usePersona: () => usePersonaMock(),
}));

const usePlansMock = vi.fn();
const removePlanItemMutateAsyncMock = vi.fn();
const useRemovePlanItemStateMock = vi.fn();
vi.mock('../../data/hooks', () => ({
  usePlans: (...args: unknown[]) => usePlansMock(...args),
  useSharedPlan: () => ({ data: undefined, isLoading: false }),
  useCreatePlanShareToken: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRemovePlanItem: () => ({
    ...useRemovePlanItemStateMock(),
    mutateAsync: removePlanItemMutateAsyncMock,
  }),
}));

const getOutingMock = vi.fn();
const removeOutingStopMock = vi.fn();
vi.mock('../../lib/outingPlans', () => ({
  getOuting: (...args: unknown[]) => getOutingMock(...args),
  removeOutingPlan: vi.fn(),
  removeOutingStop: (...args: unknown[]) => removeOutingStopMock(...args),
}));

function Harness({ planId = 'plan-1' }: { planId?: string } = {}) {
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={[`/plans/${planId}`]}>
        <Routes>
          <Route path="/plans/:id" element={<SavedPlanDetailScreen />} />
          <Route path="/bookmarks" element={<h1>Bookmarks</h1>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

// Every stop sits due north of the anchor at increasing latitude, stored in
// a deliberately zigzagged order. Nearest-first (A, B, C, D) would be the
// "shortest route" order the old Phase 6 §9 feature computed — this proves
// that no longer happens: the stored order (C, A, D, B) is what renders.
const ZIGZAG_PLAN: Plan = {
  id: 'plan-1',
  userId: 'user-1',
  anchorKey: 'anchor-1',
  anchorName: 'Hotel Shadab',
  anchorLat: 17.4,
  anchorLng: 78.4,
  name: null,
  shareToken: null,
  stops: [
    { googlePlaceId: 'c', placeName: 'C', address: null, lat: 17.43, lng: 78.4, position: 1 },
    { googlePlaceId: 'a', placeName: 'A', address: null, lat: 17.41, lng: 78.4, position: 2 },
    { googlePlaceId: 'd', placeName: 'D', address: null, lat: 17.44, lng: 78.4, position: 3 },
    { googlePlaceId: 'b', placeName: 'B', address: null, lat: 17.42, lng: 78.4, position: 4 },
  ],
};

describe('SavedPlanDetailScreen — Phase 8 §2: stop order never rotates', () => {
  beforeEach(() => {
    usePersonaMock.mockReturnValue({ userId: 'user-1' });
    getOutingMock.mockReturnValue(undefined);
    useRemovePlanItemStateMock.mockReturnValue({ isPending: false, variables: undefined });
  });

  it('a 4-stop plan renders in its stored order, not reordered by distance', async () => {
    usePlansMock.mockReturnValue({ data: [ZIGZAG_PLAN], isLoading: false });
    render(<Harness />);

    const stopNames = await screen.findAllByText(/^[ABCD]$/);
    expect(stopNames.map((el) => el.textContent)).toEqual(['C', 'A', 'D', 'B']);
    expect(screen.queryByText(/shortest route/i)).not.toBeInTheDocument();
  });

  it('a 2-stop plan renders in its stored order too', async () => {
    const twoStopPlan: Plan = { ...ZIGZAG_PLAN, stops: ZIGZAG_PLAN.stops.slice(0, 2) };
    usePlansMock.mockReturnValue({ data: [twoStopPlan], isLoading: false });
    render(<Harness />);

    const stopNames = await screen.findAllByText(/^[CA]$/);
    expect(stopNames.map((el) => el.textContent)).toEqual(['C', 'A']);
  });
});

describe('SavedPlanDetailScreen — Phase 8 §3: delete a stop from a saved plan', () => {
  beforeEach(() => {
    usePersonaMock.mockReturnValue({ userId: 'user-1' });
    getOutingMock.mockReturnValue(undefined);
    removePlanItemMutateAsyncMock.mockReset();
    removeOutingStopMock.mockReset();
    useRemovePlanItemStateMock.mockReturnValue({ isPending: false, variables: undefined });
  });

  it('a real Plan: removing one of several stops calls the mutation and stays on the plan', async () => {
    const twoStopPlan: Plan = { ...ZIGZAG_PLAN, stops: ZIGZAG_PLAN.stops.slice(0, 2) };
    usePlansMock.mockReturnValue({ data: [twoStopPlan], isLoading: false });
    removePlanItemMutateAsyncMock.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<Harness />);

    await screen.findByText('C');
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[0]);

    await waitFor(() =>
      expect(removePlanItemMutateAsyncMock).toHaveBeenCalledWith({
        planId: 'plan-1',
        googlePlaceId: 'c',
      }),
    );
    expect(screen.queryByRole('heading', { name: 'Bookmarks' })).not.toBeInTheDocument();
  });

  it('a real Plan: removing the last stop navigates back to Bookmarks with a "Plan removed" toast', async () => {
    const oneStopPlan: Plan = { ...ZIGZAG_PLAN, stops: ZIGZAG_PLAN.stops.slice(0, 1) };
    usePlansMock.mockReturnValue({ data: [oneStopPlan], isLoading: false });
    removePlanItemMutateAsyncMock.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Plan removed.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Bookmarks' })).toBeInTheDocument();
  });

  it('a Guest Outing: removing one of several stops calls removeOutingStop and stays on the plan', async () => {
    const outing: OutingPlan = {
      anchorPlaceId: 'anchor-1',
      anchorName: 'Hotel Shadab',
      anchorLat: 17.4,
      anchorLng: 78.4,
      stops: [
        { placeId: 'c', name: 'C', address: '', addedAt: 1 },
        { placeId: 'a', name: 'A', address: '', addedAt: 2 },
      ],
    };
    getOutingMock.mockReturnValue(outing);
    removeOutingStopMock.mockReturnValue(false);
    const user = userEvent.setup();
    render(<Harness />);

    await screen.findByText('C');
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[0]);

    expect(removeOutingStopMock).toHaveBeenCalledWith('anchor-1', 'c');
    expect(screen.queryByRole('heading', { name: 'Bookmarks' })).not.toBeInTheDocument();
  });

  it('a Guest Outing: removing the last stop navigates back to Bookmarks with a "Plan removed" toast', async () => {
    const outing: OutingPlan = {
      anchorPlaceId: 'anchor-1',
      anchorName: 'Hotel Shadab',
      stops: [{ placeId: 'c', name: 'C', address: '', addedAt: 1 }],
    };
    getOutingMock.mockReturnValue(outing);
    removeOutingStopMock.mockReturnValue(true);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Plan removed.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Bookmarks' })).toBeInTheDocument();
  });
});
