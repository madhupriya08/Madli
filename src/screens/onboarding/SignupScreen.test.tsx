import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SignupScreen } from './SignupScreen';
import * as authModule from '../../lib/auth';

// The success-path test below mocks the real supabase.auth.signUp call (the
// same way any component test mocks an external service) so it can assert
// the submit actually completed, not just that no error was showing before
// the async call resolved. Real signUp behavior was verified separately —
// see PHASE_3_COMPLETION_REPORT.md §6.
//
// There is no phone-mode test any more, and no OTP step to assert: signup is
// name, email and password in one step.
vi.mock('../../lib/auth', async () => {
  const actual = await vi.importActual<typeof authModule>('../../lib/auth');
  return { ...actual, signUp: vi.fn().mockResolvedValue(undefined) };
});

describe('SignupScreen — S11 validation', () => {
  it('shows an inline error and does not navigate on an invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Your name'), 'Priya');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('shows an inline error for a too-short password even with a valid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Your name'), 'Priya');
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 8 characters.',
    );
  });

  // The name is not decoration: it is what the home screen greets people by,
  // and profiles.display_name has no other source.
  it('shows an inline error when the name is missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your name.');
  });

  it('submits once every field is valid, with no verification step in between', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Your name'), 'Priya');
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(authModule.signUp).toHaveBeenCalledTimes(1));
    // The name has to reach signUp, not just the form — it is passed on as
    // user metadata, which is the only thing handle_new_user() reads
    // display_name from.
    expect(authModule.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Priya', email: 'person@example.com' }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // P10 §7: this is the one link in the post-signup ranking-prompt chain
  // that had no test of its own — PickAreaScreen and LocalOrVisitorScreen
  // each already have their own test forwarding `state.next` onward, but
  // nothing asserted that a real signup is what queues
  // `next: '/ranking-onboarding'` up in the first place.
  it('hands off to /area with the ranking-onboarding step queued behind it', async () => {
    function AreaProbe() {
      const location = useLocation();
      const next = (location.state as { next?: string } | null)?.next;
      return <h1>On /area, next={next}</h1>;
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PersonaProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/signup']}>
              <Routes>
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/area" element={<AreaProbe />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </PersonaProvider>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('Your name'), 'Priya');
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { name: 'On /area, next=/ranking-onboarding' }),
    ).toBeInTheDocument();
  });
});
