// What '/' serves, driven by a real supabase.auth session rather than the
// dev-harness persona. The three cases that matter are all here because
// getting any of them wrong is user-visible: a logged-out visitor seeing the
// app, a signed-in person bounced to marketing, or either one flashing the
// wrong page while the session resolves.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona } from '../dev/PersonaContext';
import { ToastProvider } from '../components/feedback/ToastProvider';
import { RootRoute } from './RootRoute';

const AUTHED_SESSION = { user: { id: '10000000-0000-0000-0000-000000000002' } };

// Controls what getSession() resolves with, per test.
const sessionRef: { current: typeof AUTHED_SESSION | null; delayMs: number } = {
  current: null,
  delayMs: 0,
};

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: sessionRef.current } }), sessionRef.delayMs),
        ),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    // The profiles read PersonaProvider makes for a signed-in user. Kept
    // deliberately failing to prove '/' routes on the session alone and not
    // on this row loading.
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'no row' } }) }),
      }),
    }),
  },
}));

function renderRoot() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/app" element={<h1>Where to start?</h1>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PersonaProvider>
    </QueryClientProvider>,
  );
}

describe("RootRoute — what '/' serves", () => {
  beforeEach(() => {
    sessionRef.current = null;
    sessionRef.delayMs = 0;
  });

  it('shows the marketing landing page when there is no session', async () => {
    renderRoot();
    expect(
      await screen.findByRole('heading', { name: /Three picks\. One reason each\./i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Where to start\?/i })).not.toBeInTheDocument();
  });

  it('sends a signed-in visitor into the app home', async () => {
    sessionRef.current = AUTHED_SESSION;
    renderRoot();
    expect(await screen.findByRole('heading', { name: /Where to start\?/i })).toBeInTheDocument();
  });

  it('renders neither page while the session is still resolving', async () => {
    sessionRef.delayMs = 50;
    sessionRef.current = AUTHED_SESSION;
    renderRoot();

    // The marketing page must not flash before the session resolves — that
    // flash is exactly what a signed-in person would otherwise see on every
    // page load.
    expect(screen.queryByRole('heading', { name: /Three picks/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Where to start\?/i })).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Where to start\?/i })).toBeInTheDocument(),
    );
  });

  it('ignores the dev-harness persona — only a real session opens the app', async () => {
    // A dev persona of "admin" with no session must still get marketing:
    // the harness can claim any role without anyone having logged in.
    function SetAdminPersona() {
      const { setPersona, hasSession } = usePersona();
      return (
        <>
          <button onClick={() => setPersona('admin')}>make admin</button>
          <span data-testid="has-session">{String(hasSession)}</span>
        </>
      );
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PersonaProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/']}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <>
                      <SetAdminPersona />
                      <RootRoute />
                    </>
                  }
                />
                <Route path="/app" element={<h1>Where to start?</h1>} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </PersonaProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'make admin' }));
    expect(
      await screen.findByRole('heading', { name: /Three picks\. One reason each\./i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('has-session')).toHaveTextContent('false');
  });
});
