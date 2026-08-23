import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ClaimRequestFormScreen } from './ClaimRequestFormScreen';

// The two "accepts..." cases below submit successfully — mocked here the
// same way any component test mocks an external service, so the assertion
// is about the form's own validation gate, not a real network round trip.
// The real submission path (a real business_claims insert, then the full
// call → admin-marks-called → admin-approves lifecycle) was independently
// verified against the live project — see PHASE_3_COMPLETION_REPORT.md §4.
vi.mock('../../data/businessClaims', () => ({
  submitBusinessClaim: vi.fn().mockResolvedValue({
    id: 'claim-test',
    placeId: '00000000-0000-0000-0000-0000000000f1',
    businessName: 'Hotel Shadab',
    contactName: 'You',
    claimedRole: 'Owner',
    contactPhone: '9876543210',
    mapsLink: 'https://maps.google.com/?q=hotel+shadab',
    ageLabel: '',
    status: 'pending',
    calledAt: null,
  }),
}));

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
