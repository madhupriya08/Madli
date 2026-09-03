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
 * S8, merged: what used to be a cold OS prompt (S8) with a typed-area
 * fallback behind it (S9) is one screen now, GPS and live search live from
 * the first paint. These assert the things the merge was actually for:
 * geolocation fires only on tap, a denial stays on this screen with no
 * error UI, and any area anywhere resolves to a real centre.
 *
 * P14: the eight-neighbourhood seeded quick-pick list this file used to test
 * is gone — a leftover of the retired seed catalogue. Live search and GPS
 * (both reverse-geocoded, never snapped to a fixed list) are the only two
 * ways in now.
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
    hasMapsApiKeyMock.mockReturnValue(true);
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

  it('never calls geolocation on mount — only on the button tap', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    render(<Harness />);
    await screen.findByPlaceholderText('Search a neighbourhood, city, or landmark');
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('offers a live search for any location, and picking one resolves a real centre', async () => {
    suggestAreasMock.mockResolvedValue([
      { placeId: 'place-mumbai-bandra', label: 'Bandra, Mumbai, Maharashtra, India' },
    ]);
    resolveAreaCenterMock.mockResolvedValue({
      center: { lat: 19.0596, lng: 72.8295 },
      countryCode: 'IN',
    });

    render(<Harness />);
    await userEvent.type(
      screen.getByPlaceholderText('Search a neighbourhood, city, or landmark'),
      'bandra',
    );

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

  it('shows a real empty state, not a silent nothing, when nothing matches', async () => {
    render(<Harness />);
    await userEvent.type(
      screen.getByPlaceholderText('Search a neighbourhood, city, or landmark'),
      'zzzznowhere',
    );
    expect(await screen.findByText('Nothing found yet. Keep typing.')).toBeInTheDocument();
  });

  it('does not offer live search at all when Maps is not configured', async () => {
    hasMapsApiKeyMock.mockReturnValue(false);
    render(<Harness />);
    expect(
      screen.getByText('Live area search is not configured, so there is nothing to search here yet.'),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByPlaceholderText('Search a neighbourhood, city, or landmark'),
      'bandra',
    );
    expect(suggestAreasMock).not.toHaveBeenCalled();
  });

  it('a GPS reading is reverse-geocoded to a real name', async () => {
    reverseGeocodeAreaMock.mockResolvedValue({
      label: 'Indiranagar, Bengaluru, Karnataka, India',
      countryCode: 'IN',
    });
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
    // The raw device reading is kept for centre — only the label is resolved.
    expect(state.center).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(state.countryCode).toBe('IN');
  });

  it('still proceeds with a generic label if reverse geocoding itself fails', async () => {
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

  it('a denial is not an error — no alert, stays on this screen', async () => {
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
  });

  it('shows the read-only "Home" badge on a live search result already marked home', async () => {
    homeAreaText = 'Bandra, Mumbai, Maharashtra, India';
    suggestAreasMock.mockResolvedValue([
      { placeId: 'place-mumbai-bandra', label: 'Bandra, Mumbai, Maharashtra, India' },
    ]);

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));
    await userEvent.type(
      screen.getByPlaceholderText('Search a neighbourhood, city, or landmark'),
      'bandra',
    );

    const bandraRow = (await screen.findByText('Bandra, Mumbai, Maharashtra, India')).closest(
      'li',
    )!;
    expect(within(bandraRow).getByText('Home')).toBeInTheDocument();
  });

  it('has no home-area badge or shortcut at all for a guest', async () => {
    homeAreaText = 'Bandra, Mumbai, Maharashtra, India';
    suggestAreasMock.mockResolvedValue([
      { placeId: 'place-mumbai-bandra', label: 'Bandra, Mumbai, Maharashtra, India' },
    ]);
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));
    expect(screen.queryByRole('button', { name: /^Home ·/ })).not.toBeInTheDocument();
  });
});

/**
 * P13 §3/§4: a one-tap "Home" shortcut once a home area is marked, and
 * jumping straight to that home area skips the local/visitor ask entirely —
 * choosing it already answers "do you live here". P14: the shortcut now
 * reads only the text field (profiles.home_area_text) — the seeded
 * `areas`/home_area_id path it also used to read from is retired along with
 * the catalogue.
 */
describe('PickAreaScreen — P13 §3/§4: a shortcut to home, and no redundant residency ask', () => {
  beforeEach(() => {
    sessionStorage.clear();
    homeAreaId = null;
    homeAreaText = null;
    updateSpy.mockClear();
    hasMapsApiKeyMock.mockReturnValue(true);
    suggestAreasMock.mockReset().mockResolvedValue([]);
    resolveAreaCenterMock.mockReset();
    reverseGeocodeAreaMock.mockReset();
    setResidentStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it('is absent when nothing is marked home yet', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));
    await screen.findByPlaceholderText('Search a neighbourhood, city, or landmark');
    expect(screen.queryByRole('button', { name: /^Home ·/ })).not.toBeInTheDocument();
  });

  it('jumps straight to the marked home area and skips the residency ask', async () => {
    homeAreaText = 'Jubilee Hills';
    suggestAreasMock.mockResolvedValue([{ placeId: 'jubilee-1', label: 'Jubilee Hills' }]);
    resolveAreaCenterMock.mockResolvedValue({
      center: { lat: 17.4326, lng: 78.4071 },
      countryCode: 'IN',
    });

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Home · Jubilee Hills' }));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    const state = probe();
    expect(state.areaText).toBe('Jubilee Hills');
    expect(state.center).toEqual({ lat: 17.4326, lng: 78.4071 });
    expect(setResidentStatusMock).toHaveBeenCalledWith('local', 'Jubilee Hills');
  });

  it('a different area (not home) still goes through the residency ask as before', async () => {
    homeAreaText = 'Jubilee Hills';
    suggestAreasMock.mockResolvedValue([
      { placeId: 'banjara-1', label: 'Banjara Hills, Hyderabad' },
    ]);
    resolveAreaCenterMock.mockResolvedValue({
      center: { lat: 17.41, lng: 78.44 },
      countryCode: 'IN',
    });

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));
    await userEvent.type(
      screen.getByPlaceholderText('Search a neighbourhood, city, or landmark'),
      'banjara',
    );
    await userEvent.click(await screen.findByText('Banjara Hills, Hyderabad'));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    expect(setResidentStatusMock).not.toHaveBeenCalled();
  });
});
