import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  type InitialEntry,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SearchProvider, useSearch, type SearchState } from '../../lib/searchState';
import { PickAreaScreen } from './PickAreaScreen';

/**
 * S8, merged: the GPS button and the eight-neighbourhood searchable list
 * replace what used to be a cold OS prompt (S8) with a typed-area fallback
 * behind it (S9). These assert the things the merge was actually for:
 * geolocation fires only on tap, a denial stays on this screen with no error
 * UI, selecting an area sets a real centre (not just text), and the "Set as
 * my home area" toggle exists for a signed-in persona and is absent for a
 * guest.
 */

let homeAreaId: string | null = null;
let homeAreaText: string | null = null;
const updateSpy = vi.fn();

const hasMapsApiKeyMock = vi.fn(() => false);
const suggestAreasMock = vi.fn();
const resolveAreaCenterMock = vi.fn();
const reverseGeocodeAreaMock = vi.fn();

vi.mock('../../lib/googleMaps', () => ({
  hasMapsApiKey: () => hasMapsApiKeyMock(),
}));

vi.mock('../../lib/placesSearch', () => ({
  suggestAreas: (...args: unknown[]) => suggestAreasMock(...args),
  resolveAreaCenter: (...args: unknown[]) => resolveAreaCenterMock(...args),
  reverseGeocodeArea: (...args: unknown[]) => reverseGeocodeAreaMock(...args),
}));

const setResidentStatusMock = vi.fn();
vi.mock('../../data/googleRankings', () => ({
  setResidentStatus: (...args: unknown[]) => setResidentStatusMock(...args),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    // No real session in any of these tests — persona is driven entirely by
    // the dev-harness switch below, exactly like RootRoute.test.tsx's own
    // "ignores the dev-harness persona" case.
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { home_area_id: homeAreaId, home_area_text: homeAreaText },
              error: null,
            }),
        }),
      }),
      update: (patch: { home_area_id?: string | null; home_area_text?: string | null }) => {
        updateSpy(patch);
        if ('home_area_id' in patch) homeAreaId = patch.home_area_id ?? null;
        if ('home_area_text' in patch) homeAreaText = patch.home_area_text ?? null;
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function StateProbe() {
  const { search } = useSearch();
  return <div data-testid="probe">{JSON.stringify(search)}</div>;
}

function probe(): SearchState {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}') as SearchState;
}

// PickAreaScreen now hands off to '/local-or-visitor' rather than straight to
// `next` — that screen's own behaviour is covered by its own test file. Here
// it is stubbed as a transparent pass-through, so these tests keep verifying
// what they always verified: that PickAreaScreen itself carries the right
// `next` forward.
function ForwardToNext() {
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next ?? '/app';
  return <Navigate to={next} replace />;
}

function Harness({ initialEntry = '/area' }: { initialEntry?: InitialEntry }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <SearchProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
              {/* Outside <Routes> so it survives navigating off '/area' —
                  the whole point of these assertions is what search state
                  looks like *after* landing on the next screen. */}
              <StateProbe />
              <Routes>
                <Route
                  path="/area"
                  element={
                    <>
                      <SetPersona to="guest" />
                      <SetPersona to="user" />
                      <PickAreaScreen />
                    </>
                  }
                />
                <Route path="/local-or-visitor" element={<ForwardToNext />} />
                <Route path="/app" element={<h1>Where to start?</h1>} />
                <Route path="/bookmarks" element={<h1>Bookmarks</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </SearchProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

const originalGeolocation = navigator.geolocation;

describe('PickAreaScreen — S8, merged', () => {
  beforeEach(() => {
    sessionStorage.clear();
    homeAreaId = null;
    homeAreaText = null;
    updateSpy.mockClear();
    // Not configured by default — matches most of these tests, which only
    // care about the seeded eight. Tests that exercise live search or the
    // GPS-far-away path opt in explicitly.
    hasMapsApiKeyMock.mockReturnValue(false);
    suggestAreasMock.mockReset().mockResolvedValue([]);
    resolveAreaCenterMock.mockReset();
    reverseGeocodeAreaMock.mockReset();
    setResidentStatusMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it('shows all eight seeded neighbourhoods and filters live as you type', async () => {
    render(<Harness />);
    expect(await screen.findByText('Jubilee Hills')).toBeInTheDocument();
    expect(screen.getByText('Alwal')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search a neighbourhood'), 'jub');
    expect(screen.getByText('Jubilee Hills')).toBeInTheDocument();
    expect(screen.queryByText('Alwal')).not.toBeInTheDocument();
  });

  it('shows the empty state rather than an empty list for no match', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByPlaceholderText('Search a neighbourhood'), 'nowhere');
    expect(await screen.findByText('Nothing matches that')).toBeInTheDocument();
  });

  it('never calls geolocation on mount — only on the button tap', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    render(<Harness />);
    await screen.findByText('Jubilee Hills');
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('selecting an area sets a real centre and continues to Home by default', async () => {
    render(<Harness />);
    await userEvent.click(await screen.findByText('Jubilee Hills'));
    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();

    const state = probe();
    expect(state.areaText).toBe('Jubilee Hills');
    expect(state.centerSource).toBe('area');
    // Not just text — a real centroid, so results do not silently re-centre
    // on the city default instead of the area someone just chose.
    expect(state.center).not.toBeNull();
  });

  it('honours a next destination carried in navigation state (e.g. a deep link)', async () => {
    render(<Harness initialEntry={{ pathname: '/area', state: { next: '/bookmarks' } }} />);
    await userEvent.click(await screen.findByText('Banjara Hills'));
    expect(await screen.findByRole('heading', { name: 'Bookmarks' })).toBeInTheDocument();
  });

  it('resolving GPS success routes through the nearest seeded neighbourhood', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 17.433, longitude: 78.41 } } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    render(<Harness />);
    await userEvent.click(await screen.findByRole('button', { name: 'Use my current location' }));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    const state = probe();
    // That coordinate sits right by Jubilee Hills — nearestArea should
    // resolve to it, not to some other seeded neighbourhood.
    expect(state.areaText).toBe('Jubilee Hills');
    expect(state.centerSource).toBe('geolocation');
    // The real device reading is kept for centre — only the label is
    // resolved to the nearest neighbourhood, not the coordinate itself.
    expect(state.center).toEqual({ lat: 17.433, lng: 78.41 });
  });

  it('a denial is not an error — no alert, stays on this screen, list still usable', async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: 'denied' } as GeolocationPositionError);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    render(<Harness />);
    await userEvent.click(await screen.findByRole('button', { name: 'Use my current location' }));

    // Still here — no navigation happened.
    expect(screen.queryByRole('heading', { name: 'Where to start?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The list is exactly what was already on screen — the real fallback.
    expect(screen.getByText('Jubilee Hills')).toBeInTheDocument();
  });

  it('P14: shows a read-only "Home" badge next to whichever seeded row is already marked home — no toggle here any more', async () => {
    homeAreaId = '00000000-0000-0000-0000-0000000000a1'; // Jubilee Hills
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    const jubileeRow = (await screen.findByText('Jubilee Hills')).closest('li')!;
    expect(within(jubileeRow).getByText('Home')).toBeInTheDocument();
    expect(within(jubileeRow).queryByRole('switch')).not.toBeInTheDocument();

    const banjaraRow = screen.getByText('Banjara Hills').closest('li')!;
    expect(within(banjaraRow).queryByText('Home')).not.toBeInTheDocument();
  });

  it('has no home-area badge or toggle at all for a guest', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));
    await screen.findByText('Jubilee Hills');
    expect(screen.queryByRole('switch', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  describe('not restricted to Hyderabad', () => {
    it('offers a live search for any other location, and picking one resolves a real centre', async () => {
      hasMapsApiKeyMock.mockReturnValue(true);
      suggestAreasMock.mockResolvedValue([
        { placeId: 'place-mumbai-bandra', label: 'Bandra, Mumbai, Maharashtra, India' },
      ]);
      resolveAreaCenterMock.mockResolvedValue({
        center: { lat: 19.0596, lng: 72.8295 },
        countryCode: 'IN',
      });

      render(<Harness />);
      await userEvent.type(screen.getByPlaceholderText('Search a neighbourhood'), 'bandra');

      expect(await screen.findByText('Bandra, Mumbai, Maharashtra, India')).toBeInTheDocument();
      expect(suggestAreasMock).toHaveBeenCalledWith('bandra', expect.any(Object));

      await userEvent.click(screen.getByText('Bandra, Mumbai, Maharashtra, India'));
      expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();

      const state = probe();
      expect(state.areaText).toBe('Bandra, Mumbai, Maharashtra, India');
      expect(state.areaPlaceId).toBe('place-mumbai-bandra');
      expect(state.center).toEqual({ lat: 19.0596, lng: 72.8295 });
      expect(state.centerSource).toBe('area');
      expect(state.countryCode).toBe('IN');
    });

    // P14: "Set as home" now lives on Home, not on a row in this list — a
    // live (non-seeded) search result still shows the read-only "Home"
    // badge when it is already the marked home (profiles.home_area_text,
    // the case with no seeded `areas` row to point a `home_area_id` FK at).
    it('shows the read-only "Home" badge on a live search result too, when it is already marked home', async () => {
      hasMapsApiKeyMock.mockReturnValue(true);
      homeAreaText = 'Bandra, Mumbai, Maharashtra, India';
      suggestAreasMock.mockResolvedValue([
        { placeId: 'place-mumbai-bandra', label: 'Bandra, Mumbai, Maharashtra, India' },
      ]);

      render(<Harness />);
      await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));
      await userEvent.type(screen.getByPlaceholderText('Search a neighbourhood'), 'bandra');

      const bandraRow = (await screen.findByText('Bandra, Mumbai, Maharashtra, India')).closest(
        'li',
      )!;
      expect(within(bandraRow).getByText('Home')).toBeInTheDocument();
      expect(within(bandraRow).queryByRole('switch')).not.toBeInTheDocument();
    });

    it('does not offer live search at all when Maps is not configured', async () => {
      render(<Harness />);
      await userEvent.type(screen.getByPlaceholderText('Search a neighbourhood'), 'bandra');
      expect(screen.queryByText('Or search any other location')).not.toBeInTheDocument();
      expect(suggestAreasMock).not.toHaveBeenCalled();
    });

    it('a GPS reading far from all eight seeded areas is reverse-geocoded, not mislabelled as one of them', async () => {
      hasMapsApiKeyMock.mockReturnValue(true);
      reverseGeocodeAreaMock.mockResolvedValue({
        label: 'Indiranagar, Bengaluru, Karnataka, India',
        countryCode: 'IN',
      });
      // Bengaluru — hundreds of km from every seeded Hyderabad neighbourhood.
      const getCurrentPosition = vi.fn((success: PositionCallback) => {
        success({ coords: { latitude: 12.9716, longitude: 77.5946 } } as GeolocationPosition);
      });
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition },
        configurable: true,
      });

      render(<Harness />);
      await userEvent.click(await screen.findByRole('button', { name: 'Use my current location' }));

      expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
      const state = probe();
      expect(state.areaText).toBe('Indiranagar, Bengaluru, Karnataka, India');
      expect(state.centerSource).toBe('geolocation');
      // The raw device reading, not snapped to any seeded neighbourhood.
      expect(state.center).toEqual({ lat: 12.9716, lng: 77.5946 });
      expect(state.countryCode).toBe('IN');
    });

    it('still proceeds with a generic label if reverse geocoding itself fails', async () => {
      hasMapsApiKeyMock.mockReturnValue(true);
      reverseGeocodeAreaMock.mockRejectedValue(new Error('geocoding API not enabled'));
      const getCurrentPosition = vi.fn((success: PositionCallback) => {
        success({ coords: { latitude: 12.9716, longitude: 77.5946 } } as GeolocationPosition);
      });
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition },
        configurable: true,
      });

      render(<Harness />);
      await userEvent.click(await screen.findByRole('button', { name: 'Use my current location' }));

      expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
      const state = probe();
      expect(state.areaText).toBe('Your current location');
      expect(state.center).toEqual({ lat: 12.9716, lng: 77.5946 });
      expect(state.countryCode).toBeNull();
    });
  });
});

/**
 * P13 §3/§4: a one-tap "Home" shortcut once a home area is marked, and
 * picking (or jumping straight to) that home area skips the local/visitor
 * ask entirely — selecting it already answers "do you live here".
 */
describe('PickAreaScreen — P13 §3/§4: a shortcut to home, and no redundant residency ask', () => {
  beforeEach(() => {
    sessionStorage.clear();
    homeAreaId = null;
    homeAreaText = null;
    updateSpy.mockClear();
    hasMapsApiKeyMock.mockReturnValue(false);
    suggestAreasMock.mockReset().mockResolvedValue([]);
    resolveAreaCenterMock.mockReset();
    reverseGeocodeAreaMock.mockReset();
    setResidentStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it('is absent when nothing is marked home yet', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));
    await screen.findByText('Jubilee Hills');
    expect(screen.queryByRole('button', { name: /^Home —/ })).not.toBeInTheDocument();
  });

  it('is absent for a Guest even when a home area exists on the account', async () => {
    homeAreaId = '00000000-0000-0000-0000-0000000000a1';
    render(<Harness />);
    await screen.findByText('Jubilee Hills');
    expect(screen.queryByRole('button', { name: /^Home —/ })).not.toBeInTheDocument();
  });

  it('jumps straight to the marked home neighbourhood and skips the residency ask', async () => {
    homeAreaId = '00000000-0000-0000-0000-0000000000a1';
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Home · Jubilee Hills' }));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    const state = probe();
    expect(state.areaText).toBe('Jubilee Hills');
    expect(state.center).not.toBeNull();
    expect(setResidentStatusMock).toHaveBeenCalledWith('local', 'Jubilee Hills');
  });

  it('re-resolves coordinates for a home area outside the seeded eight', async () => {
    homeAreaText = 'Bandra West';
    hasMapsApiKeyMock.mockReturnValue(true);
    suggestAreasMock.mockResolvedValue([{ placeId: 'bandra-1', label: 'Bandra West' }]);
    resolveAreaCenterMock.mockResolvedValue({
      center: { lat: 19.0596, lng: 72.8295 },
      countryCode: 'IN',
    });

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Home · Bandra West' }));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    const state = probe();
    expect(state.areaText).toBe('Bandra West');
    expect(state.center).toEqual({ lat: 19.0596, lng: 72.8295 });
  });

  it('selecting the area already marked home from the list also skips the ask', async () => {
    homeAreaId = '00000000-0000-0000-0000-0000000000a1';
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByText('Jubilee Hills'));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    expect(setResidentStatusMock).toHaveBeenCalledWith('local', 'Jubilee Hills');
  });

  it('a different area (not home) still goes through the residency ask as before', async () => {
    homeAreaId = '00000000-0000-0000-0000-0000000000a1';
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByText('Banjara Hills'));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    expect(setResidentStatusMock).not.toHaveBeenCalled();
  });
});
