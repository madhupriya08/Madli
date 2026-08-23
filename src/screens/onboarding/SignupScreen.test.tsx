import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SignupScreen } from './SignupScreen';
import * as authModule from '../../lib/auth';

// The success-path test below mocks the real supabase.auth.signUp call (the
// same way any component test mocks an external service) so it can assert
// the submit actually completed, not just that no error was showing before
// the async call resolved. Real signUp behavior (and its real "provider not
// enabled" case for phone) was verified separately — see
// PHASE_3_COMPLETION_REPORT.md §6.
vi.mock('../../lib/auth', async () => {
  const actual = await vi.importActual<typeof authModule>('../../lib/auth');
  return { ...actual, signUp: vi.fn().mockResolvedValue(undefined) };
});

describe('SignupScreen — S11 validation', () => {
  it('shows an inline error and does not navigate on an invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('shows an inline error for a too-short password even with a valid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 8 characters.',
    );
  });

  it('submits and moves on to OTP verification once both fields are valid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(authModule.signUp).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('switches the field label and validation to phone mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupScreen />, { path: '/signup', route: '/signup' });

    await user.click(screen.getByRole('tab', { name: 'Phone' }));
    await user.type(screen.getByLabelText('Phone number'), '12345');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid phone number.');
  });
});
