import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonaProvider, usePersona, type AdminTier } from '../../dev/PersonaContext';
import { ToastProvider } from '../../components/feedback/ToastProvider';
import { RolesAccountsAuditScreen } from './RolesAccountsAuditScreen';

/**
 * Phase 7 §7: "add a feature to add another admin" (S50). createAdminAccount
 * itself (the real signUp() + fn_admin_create_admin_account two-step) was
 * verified live against the project's real RLS/permission model — see the
 * migration's own comment and the P7 completion notes. This covers the
 * screen: the form only shows for a superadmin session, its own validation,
 * and that a successful submission calls through with the right shape.
 */
const createAdminAccount = vi.fn();
vi.mock('../../data/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/admin')>();
  return {
    ...actual,
    createAdminAccount: (...args: Parameters<typeof actual.createAdminAccount>) =>
      createAdminAccount(...args),
  };
});

function SetAdminPersona({ tier }: { tier: AdminTier }) {
  const { setPersona, setAdminTier } = usePersona();
  return (
    <button
      onClick={() => {
        setPersona('admin');
        setAdminTier(tier);
      }}
    >
      set admin {tier}
    </button>
  );
}

function Harness({ tier }: { tier: AdminTier }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PersonaProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin/roles']}>
            <SetAdminPersona tier={tier} />
            <RolesAccountsAuditScreen />
          </MemoryRouter>
        </ToastProvider>
      </PersonaProvider>
    </QueryClientProvider>
  );
}

describe('RolesAccountsAuditScreen — Phase 7 §7: create another admin', () => {
  beforeEach(() => {
    createAdminAccount.mockReset();
  });

  it('shows the create-admin form for a superadmin session', async () => {
    const user = userEvent.setup();
    render(<Harness tier="superadmin" />);
    await user.click(screen.getByRole('button', { name: 'set admin superadmin' }));

    expect(await screen.findByText('Create another admin')).toBeInTheDocument();
  });

  it('hides the create-admin form for a non-superadmin admin session', async () => {
    const user = userEvent.setup();
    render(<Harness tier="moderation" />);
    await user.click(screen.getByRole('button', { name: 'set admin moderation' }));

    await screen.findByText('Roles, accounts, audit log');
    expect(screen.queryByText('Create another admin')).not.toBeInTheDocument();
  });

  it('rejects an invalid email without calling createAdminAccount', async () => {
    const user = userEvent.setup();
    render(<Harness tier="superadmin" />);
    await user.click(screen.getByRole('button', { name: 'set admin superadmin' }));
    await screen.findByText('Create another admin');

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Temporary password'), 'longenoughpassword');
    await user.type(screen.getByLabelText('Reason'), 'Onboarding a new moderator');
    await user.click(screen.getByRole('button', { name: 'Create admin account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(createAdminAccount).not.toHaveBeenCalled();
  });

  it('rejects a short password without calling createAdminAccount', async () => {
    const user = userEvent.setup();
    render(<Harness tier="superadmin" />);
    await user.click(screen.getByRole('button', { name: 'set admin superadmin' }));
    await screen.findByText('Create another admin');

    await user.type(screen.getByLabelText('Email'), 'newadmin@dev.madli.test');
    await user.type(screen.getByLabelText('Temporary password'), 'short');
    await user.type(screen.getByLabelText('Reason'), 'Onboarding a new moderator');
    await user.click(screen.getByRole('button', { name: 'Create admin account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 8 characters.',
    );
    expect(createAdminAccount).not.toHaveBeenCalled();
  });

  it('requires a written reason: it is what lands in the audit log', async () => {
    const user = userEvent.setup();
    render(<Harness tier="superadmin" />);
    await user.click(screen.getByRole('button', { name: 'set admin superadmin' }));
    await screen.findByText('Create another admin');

    await user.type(screen.getByLabelText('Email'), 'newadmin@dev.madli.test');
    await user.type(screen.getByLabelText('Temporary password'), 'longenoughpassword');
    await user.click(screen.getByRole('button', { name: 'Create admin account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A written reason is required. It goes in the audit log.',
    );
    expect(createAdminAccount).not.toHaveBeenCalled();
  });

  it('submits with the chosen tier and capability grants once the form is valid', async () => {
    createAdminAccount.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Harness tier="superadmin" />);
    await user.click(screen.getByRole('button', { name: 'set admin superadmin' }));
    await screen.findByText('Create another admin');

    await user.type(screen.getByLabelText('Email'), 'newadmin@dev.madli.test');
    await user.type(screen.getByLabelText('Temporary password'), 'longenoughpassword');
    await user.selectOptions(screen.getByLabelText('Admin tier'), 'catalogue');
    await user.click(screen.getByRole('switch', { name: 'Can override ranking' }));
    await user.type(screen.getByLabelText('Reason'), 'Onboarding a new catalogue editor');
    await user.click(screen.getByRole('button', { name: 'Create admin account' }));

    await waitFor(() =>
      expect(createAdminAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newadmin@dev.madli.test',
          password: 'longenoughpassword',
          adminTier: 'catalogue',
          canOverrideRanking: true,
          canAccessLocationHistory: false,
          reason: 'Onboarding a new catalogue editor',
        }),
        expect.anything(),
      ),
    );
  });
});
