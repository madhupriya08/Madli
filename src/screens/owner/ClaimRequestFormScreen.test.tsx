import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ClaimRequestFormScreen } from './ClaimRequestFormScreen';

// Hotel Shadab — a real fixture place, so useParams()/placeBySlug() resolves.
const SLUG = 'restaurants/hotel-shadab';

describe('ClaimRequestFormScreen — S37 validation', () => {
  it('rejects a Maps link that does not match the expected pattern, with a specific message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClaimRequestFormScreen />, {
      path: '/claim/:slug',
      route: `/claim/${encodeURIComponent(SLUG)}`,
    });

    await user.type(screen.getByLabelText('Google Maps link'), 'https://example.com/not-maps');
    await user.type(screen.getByLabelText('Contact phone number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Submit claim' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "doesn't look like a Google Maps link",
    );
  });

  it('rejects submission when the contact number is missing, even with a valid Maps link', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClaimRequestFormScreen />, {
      path: '/claim/:slug',
      route: `/claim/${encodeURIComponent(SLUG)}`,
    });

    await user.type(
      screen.getByLabelText('Google Maps link'),
      'https://maps.google.com/?q=hotel+shadab',
    );
    await user.click(screen.getByRole('button', { name: 'Submit claim' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A contact number is required.');
  });

  it('accepts a valid Maps link and contact number and submits the claim', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClaimRequestFormScreen />, {
      path: '/claim/:slug',
      route: `/claim/${encodeURIComponent(SLUG)}`,
    });

    await user.type(
      screen.getByLabelText('Google Maps link'),
      'https://maps.google.com/?q=hotel+shadab',
    );
    await user.type(screen.getByLabelText('Contact phone number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Submit claim' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('accepts the shortened goo.gl/maps link form too', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClaimRequestFormScreen />, {
      path: '/claim/:slug',
      route: `/claim/${encodeURIComponent(SLUG)}`,
    });

    await user.type(screen.getByLabelText('Google Maps link'), 'https://goo.gl/maps/abc123');
    await user.type(screen.getByLabelText('Contact phone number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Submit claim' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
