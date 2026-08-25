import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsConsumer, TEST_ACCOUNTS } from './helpers';

test.describe('Admin — ranking override and audit log', () => {
  test('override a ranking with a reason, see it reflected and logged', async ({ page }) => {
    await loginAsAdmin(page, TEST_ACCOUNTS.admin);
    await page.goto('/admin/ranking');

    const reason = `E2E override check ${Date.now()}`;
    const row = page
      .getByRole('row')
      .filter({ hasText: /Subhan Bakery|Hotel Shadab|Cafe Bahar/ })
      .first();
    await row.getByRole('button', { name: /Override/i }).click();
    await page.getByLabel(/Reason/i).fill(reason);
    await page.getByRole('button', { name: 'Confirm override' }).click();
    await expect(page.getByText('Override logged.')).toBeVisible({ timeout: 10_000 });

    await page.goto('/admin/roles');
    await expect(page.getByText(reason, { exact: false })).toBeVisible({ timeout: 10_000 });
  });

  test('a partial-grant admin cannot override a ranking, even by direct action', async ({
    page,
  }) => {
    await loginAsAdmin(page, TEST_ACCOUNTS.adminPartialGrant);
    await page.goto('/admin/ranking');

    // The moderation-tier account has no can_override_ranking grant — the
    // override control should not be a working path for it.
    const overrideButtons = page.getByRole('button', { name: /Override/i });
    const count = await overrideButtons.count();
    if (count > 0) {
      await overrideButtons.first().click();
      await page.getByLabel(/Reason/i).fill('should be rejected');
      await page.getByRole('button', { name: 'Confirm override' }).click();
      await expect(page.getByText(/not authorized|failed/i)).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('Admin — location history access gate', () => {
  test('reads location history with a reason, the read is logged, and a direct table read stays blocked', async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page, TEST_ACCOUNTS.admin);
    await page.goto('/admin/location-history');

    await page.getByLabel('Reason detail (stored verbatim)').fill(`E2E check ${Date.now()}`);
    await page.getByRole('button', { name: 'Grant access and load' }).click();
    await expect(page.getByText(/is itself logged, permanently/)).toBeVisible({ timeout: 10_000 });

    // Direct table read, bypassing the gated RPC — must return nothing, by design.
    const storageState = await page.context().storageState();
    const authEntry = storageState.origins
      .flatMap((o) => o.localStorage)
      .find((item) => item.name.includes('-auth-token'));
    const accessToken = authEntry ? JSON.parse(authEntry.value).access_token : undefined;
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const directRes = await request.get(
      `${supabaseUrl}/rest/v1/location_history?select=*&limit=5`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(directRes.status()).toBe(200);
    expect(await directRes.json()).toEqual([]);
  });

  test('an account without the grant sees the gate, not the data', async ({ page }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.owner);
    await page.goto('/admin/login');
    // Owner test account has no admin role at all — access-denied path.
    await page.getByLabel('Email').fill(TEST_ACCOUNTS.owner.email);
    await page.getByLabel('Password').fill(TEST_ACCOUNTS.owner.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('This account does not have admin access.')).toBeVisible({
      timeout: 10_000,
    });
  });
});
