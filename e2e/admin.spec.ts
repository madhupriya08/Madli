import { test, expect } from '@playwright/test';
import { loginAsConsumer, TEST_ACCOUNTS } from './helpers';

// Phase 7 §6/§8: the ranking-override page (/admin/ranking) and the
// location-history access page (/admin/location-history) this file used to
// exercise were both removed on explicit request — see
// src/screens/registry.ts. This is the one test from this file that was
// never about either of those pages.
test.describe('Admin login — access control', () => {
  test('an account without the admin role sees the gate, not the data', async ({ page }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(TEST_ACCOUNTS.user.email);
    await page.getByLabel('Password').fill(TEST_ACCOUNTS.user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('This account does not have admin access.')).toBeVisible({
      timeout: 10_000,
    });
  });
});
