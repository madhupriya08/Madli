import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SignupScreen } from './SignupScreen';

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

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
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
