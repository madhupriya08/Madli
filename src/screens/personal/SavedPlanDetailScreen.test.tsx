import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SavedPlanDetailScreen } from './SavedPlanDetailScreen';
import type { Plan } from '../../data/plans';

/**
 * Phase 8 §2: "plan stop positions rotate when adding places" — traced to
 * Phase 6 §9's shortest-route display reorder, which recomputed fresh on
 * every render, so adding one stop could reshuffle every other stop's
 * displayed position too. Removed outright: the stop list, map markers and
 * Google Maps route now always use the plan's actual stored order
 * (plan_items.position, or insertion order for a local Guest Outing) and
 * nothing here reorders it, regardless of stop count.
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
