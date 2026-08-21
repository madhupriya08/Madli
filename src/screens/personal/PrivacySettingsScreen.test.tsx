import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PrivacySettingsScreen } from './PrivacySettingsScreen';

describe('PrivacySettingsScreen — S36 typed delete-confirmation guard', () => {
  it('keeps the permanent-delete button disabled until "DELETE" is typed exactly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PrivacySettingsScreen />, {
      path: '/settings/privacy',
      route: '/settings/privacy',
    });

    await user.click(screen.getByRole('button', { name: 'Delete my account' }));
    const confirmButton = screen.getByRole('button', { name: 'Delete permanently' });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByLabelText('Type "DELETE" to confirm');
    await user.type(input, 'delete');
    expect(confirmButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'DELETE ME');
    expect(confirmButton).toBeDisabled();
  });

  it('enables the permanent-delete button once "DELETE" is typed exactly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PrivacySettingsScreen />, {
      path: '/settings/privacy',
      route: '/settings/privacy',
    });

    await user.click(screen.getByRole('button', { name: 'Delete my account' }));
    const input = screen.getByLabelText('Type "DELETE" to confirm');
    await user.type(input, 'DELETE');

    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeEnabled();
  });
});
