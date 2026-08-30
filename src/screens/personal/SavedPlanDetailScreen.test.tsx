import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SavedPlanDetailScreen } from './SavedPlanDetailScreen';
import type { Plan } from '../../data/plans';

/**
 * Phase 6 §9: the stop list, map markers and Google Maps route now show the
 * shortest visiting order for a 3+ stop plan, computed fresh on every
 * render — never written back to the plan's own stored order. A known,
 * hand-verifiable 4-stop configuration (nearest-first is obviously optimal
 * when every stop sits on the same line out from the anchor) proves the
 * screen actually reorders, not just that the underlying function does.
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
vi.mock('../../data/hooks', () => ({
  usePlans: (...args: unknown[]) => usePlansMock(...args),
  useSharedPlan: () => ({ data: undefined, isLoading: false }),
  useCreatePlanShareToken: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../../lib/outingPlans', () => ({
  getOuting: () => undefined,
  removeOutingPlan: vi.fn(),
}));

function Harness({ planId = 'plan-1' }: { planId?: string } = {}) {
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={[`/plans/${planId}`]}>
        <Routes>
          <Route path="/plans/:id" element={<SavedPlanDetailScreen />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

// Every stop sits due north of the anchor at increasing latitude, stored in
// a deliberately zigzagged order — nearest-first (A, B, C, D) is trivially
// the shortest route, and is not the order they were stored in.
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

describe('SavedPlanDetailScreen — Phase 6 §9: shortest-route display order', () => {
  beforeEach(() => {
    usePersonaMock.mockReturnValue({ userId: 'user-1' });
  });

  it('shows a 4-stop plan nearest-first, not in its stored order, with a note that it was reordered', async () => {
    usePlansMock.mockReturnValue({ data: [ZIGZAG_PLAN], isLoading: false });
    render(<Harness />);

    const stopNames = await screen.findAllByText(/^[ABCD]$/);
    expect(stopNames.map((el) => el.textContent)).toEqual(['A', 'B', 'C', 'D']);
    expect(
      screen.getByText('Ordered for the shortest route from Hotel Shadab — not the order you added them.'),
    ).toBeInTheDocument();
  });

  it('a 2-stop plan is shown exactly as stored — too few stops to reorder', async () => {
    const twoStopPlan: Plan = { ...ZIGZAG_PLAN, stops: ZIGZAG_PLAN.stops.slice(0, 2) };
    usePlansMock.mockReturnValue({ data: [twoStopPlan], isLoading: false });
    render(<Harness />);

    const stopNames = await screen.findAllByText(/^[CA]$/);
    // Stored order is C then A — unchanged, since reordering only applies at 3+.
    expect(stopNames.map((el) => el.textContent)).toEqual(['C', 'A']);
    expect(
      screen.queryByText(/Ordered for the shortest route/),
    ).not.toBeInTheDocument();
  });
});
