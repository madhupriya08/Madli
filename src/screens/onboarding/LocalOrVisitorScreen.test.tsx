import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, type InitialEntry } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../../dev/PersonaContext';
import { GuestSessionProvider, useGuestSession } from '../../lib/guestSession';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { SearchProvider } from '../../lib/searchState';
import { LocalOrVisitorScreen } from './LocalOrVisitorScreen';

const updateSpy = vi.fn();

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () =>
        Promise.resolve({ data: { user: { id: '10000000-0000-0000-0000-000000000002' } } }),
    },
    from: () => ({
      update: (patch: unknown) => {
        updateSpy(patch);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));

function SetPersona({ to }: { to: 'guest' | 'user' }) {
  const { setPersona } = usePersona();
  return <button onClick={() => setPersona(to)}>set persona {to}</button>;
}

function GuestAnswerProbe() {
  const { residentStatus } = useGuestSession();
  return <div data-testid="guest-answer">{residentStatus ?? 'none'}</div>;
}

function Harness({ initialEntry = '/local-or-visitor' }: { initialEntry?: InitialEntry }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <GuestSessionProvider>
          <SearchProvider>
            <ToastProvider>
              <MemoryRouter initialEntries={[initialEntry]}>
                {/* Outside <Routes> so it survives navigating off
                    '/local-or-visitor' — the point is what guestSession
                    looks like *after* landing on the next screen. */}
                <GuestAnswerProbe />
                <Routes>
                  <Route
                    path="/local-or-visitor"
                    element={
                      <>
                        <SetPersona to="guest" />
                        <SetPersona to="user" />
                        <LocalOrVisitorScreen />
                      </>
                    }
                  />
                  <Route path="/app" element={<h1>Where to start?</h1>} />
                  <Route path="/ranking-onboarding" element={<h1>Rank places you know</h1>} />
                </Routes>
              </MemoryRouter>
            </ToastProvider>
          </SearchProvider>
        </GuestSessionProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('LocalOrVisitorScreen', () => {
  beforeEach(() => {
    sessionStorage.clear();
    updateSpy.mockClear();
  });

  it('shows both choices and a skip link', async () => {
    render(<Harness />);
    expect(await screen.findByText('I live here')).toBeInTheDocument();
    expect(screen.getByText("I'm visiting")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
  });

  it('a guest answering stores it in guestSession, not Supabase, and continues to next', async () => {
    render(<Harness initialEntry={{ pathname: '/local-or-visitor', state: { next: '/app' } }} />);
    await userEvent.click(screen.getByRole('button', { name: 'set persona guest' }));

    await userEvent.click(screen.getByText('I live here'));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    expect(screen.getByTestId('guest-answer')).toHaveTextContent('local');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('a signed-in person answering persists to profiles.resident_status and continues', async () => {
    render(
      <Harness
        initialEntry={{ pathname: '/local-or-visitor', state: { next: '/ranking-onboarding' } }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'set persona user' }));

    await userEvent.click(screen.getByText("I'm visiting"));

    expect(
      await screen.findByRole('heading', { name: 'Rank places you know' }),
    ).toBeInTheDocument();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resident_status: 'visitor' }),
    );
  });

  it('skipping continues to next without answering or writing anything', async () => {
    render(<Harness initialEntry={{ pathname: '/local-or-visitor', state: { next: '/app' } }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('defaults to /app when no next destination is given', async () => {
    render(<Harness initialEntry="/local-or-visitor" />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(await screen.findByRole('heading', { name: 'Where to start?' })).toBeInTheDocument();
  });
});
