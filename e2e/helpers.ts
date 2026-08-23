import type { Page } from '@playwright/test';

// Dev-only test accounts (supabase/README.md "Test accounts" +
// PHASE_3_HANDOFF.md for the second admin account). Rotate/delete before
// anything production-adjacent.
export const TEST_ACCOUNTS = {
  user: { email: 'user.test@dev.madli.test', password: 'MadliDev!2026' },
  owner: { email: 'owner.test@dev.madli.test', password: 'MadliDev!2026' },
  admin: { email: 'admin.superadmin@dev.madli.test', password: 'MadliDev!2026' },
  adminPartialGrant: { email: 'admin.moderation@dev.madli.test', password: 'MadliDev!2026' },
} as const;

/** Logs in through the real consumer login form (S13), waiting for the real Supabase round trip. */
export async function loginAsConsumer(
  page: Page,
  account: (typeof TEST_ACCOUNTS)['user'] | (typeof TEST_ACCOUNTS)['owner'],
) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

/** Logs in through the real admin login form (S41). */
export async function loginAsAdmin(
  page: Page,
  account: (typeof TEST_ACCOUNTS)['admin'] | (typeof TEST_ACCOUNTS)['adminPartialGrant'],
) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 15_000 });
}
