import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

/**
 * Phase 8 §10: every password field gets a show/hide toggle from the shared
 * Input component itself — added once here rather than in each of the 5
 * screens that render a password field, so there is nothing left to miss
 * the next time one is added.
 */
describe('Input — password visibility toggle', () => {
  it('renders masked by default and reveals as plain text on toggle', async () => {
    const user = userEvent.setup();
    render(<Input label="Password" type="password" value="secret123" onChange={vi.fn()} />);

    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(field).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('does not render a toggle for a non-password field', () => {
    render(<Input label="Email" type="email" value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /show password/i })).not.toBeInTheDocument();
  });
});
