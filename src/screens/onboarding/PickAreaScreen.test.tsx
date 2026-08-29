import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, type InitialEntry } from 'react-router-dom';
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
const updateSpy = vi.fn();

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
          single: () => Promise.resolve({ data: { home_area_id: homeAreaId }, error: null }),
        }),
      }),
      update: (patch: { home_area_id: string | null }) => {
        updateSpy(patch);
        homeAreaId = patch.home_area_id;
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
                <Route path="/app" element={<h1>Where to start?</h1>} />
                <Route path="/owner/profile" element={<h1>Owner profile</h1>} />
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
    updateSpy.mockClear();
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

  it('honours a next destination carried in navigation state (e.g. an Owner login)', async () => {
    render(<Harness initialEntry={{ pathname: '/area', state: { next: '/owner/profile' } }} />);
    await userEvent.click(await screen.findByText('Banjara Hills'));
    expect(await screen.findByRole('heading', { name: 'Owner profile' })).toBeInTheDocument();
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

  it('offers "Set as my home area" for a signed-in persona and persists the choice', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    const jubileeRow = (await screen.findByText('Jubilee Hills')).closest('li')!;
    const homeSwitch = within(jubileeRow).getByRole('switch', { name: 'Home' });
    expect(homeSwitch).not.toBeChecked();

    await userEvent.click(homeSwitch);
    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({ home_area_id: expect.any(String) }),
    );
    await waitFor(() => expect(homeSwitch).toBeChecked());
  });

  it('has no home-area toggle at all for a guest', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));
    await screen.findByText('Jubilee Hills');
    expect(screen.queryByRole('switch', { name: 'Home' })).not.toBeInTheDocument();
  });
});
