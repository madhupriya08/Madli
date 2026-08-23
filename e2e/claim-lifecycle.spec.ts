import { test, expect } from '@playwright/test';
import { loginAsConsumer, loginAsAdmin, TEST_ACCOUNTS } from './helpers';

// A real business claim, start to finish: submit as User → admin marks
// called → admin approves → the same User account gains real edit access
// (owns_verified_claim flips true) → an allowed field edit persists → a
// direct attempt at a protected field (bypassing the UI, which never offers
// one) is rejected by the real trigger.
//
// Uses "Simply South" (not claimed by any seeded fixture data). Phase 3 left
// this non-idempotent across repeat runs (a second run collided with the
// business_claims_active_unique constraint at the submit step). Phase 4
// fixes that for real CI reliability: a `finally` block deletes the claim
// row it created, using the admin session's real DELETE grant
// (business_claims_delete_admin RLS policy) — same clean slate every run,
// regardless of whether the test passed or failed partway through.
const PLACE_SLUG = 'restaurants/simply-south';

function extractAccessToken(storageState: Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>) {
  const authEntry = storageState.origins
    .flatMap((o) => o.localStorage)
    .find((item) => item.name.includes('-auth-token'));
  return authEntry ? (JSON.parse(authEntry.value).access_token as string) : undefined;
}

function decodeJwtSub(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
  return payload.sub as string;
}

test.describe('Business claim lifecycle', () => {
  test('submit, admin call + approve, owner edits an allowed field, protected field stays blocked', async ({
    page,
    request,
    browser,
  }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

    await loginAsConsumer(page, TEST_ACCOUNTS.user);

    // Fetched early (before any claim actions) so cleanup in `finally` can
    // run even if the test fails partway through.
    const userAccessToken = extractAccessToken(await page.context().storageState());
    expect(userAccessToken).toBeTruthy();
    const userId = decodeJwtSub(userAccessToken!);
    const placeRes = await request.get(
      `${supabaseUrl}/rest/v1/places?slug=eq.${encodeURIComponent(PLACE_SLUG)}&select=id`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    );
    const [{ id: placeId }] = await placeRes.json();

    let adminContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    let adminLoggedIn = false;
    try {
      await page.goto(`/places/${encodeURIComponent(PLACE_SLUG)}`);
      await page.getByRole('button', { name: 'Is this your business?' }).click();
      await expect(page).toHaveURL(/\/claim\//);

      await page.getByLabel('Google Maps link').fill('https://maps.google.com/?q=Simply+South');
      await page.getByLabel('Contact phone number').fill('9876543210');
      await page.getByRole('button', { name: 'Submit claim' }).click();
      await expect(page).toHaveURL(/\/status$/);
      await expect(page.getByText('pending')).toBeVisible();

      // --- Admin side: mark called, then approve ---
      adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      await loginAsAdmin(adminPage, TEST_ACCOUNTS.admin);
      adminLoggedIn = true;
      await adminPage.goto('/admin/claims');
      const row = adminPage.getByRole('row', { name: /Simply South/ });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.getByRole('button', { name: 'Mark called' }).click();
      await row.getByRole('button', { name: 'Approve' }).click();
      await expect(row.getByText('verified')).toBeVisible({ timeout: 10_000 });

      // --- Owner side: real edit access, an allowed field persists ---
      await page.reload();
      await expect(page.getByText('Verified — you can now edit this listing.')).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole('button', { name: 'Edit listing' }).click();
      await expect(page).toHaveURL(/\/edit$/);

      const newPhone = `040 555 ${Math.floor(1000 + Math.random() * 9000)}`;
      await page.getByLabel('Phone').fill(newPhone);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('Listing updated.')).toBeVisible({ timeout: 10_000 });

      await page.reload();
      await expect(page.getByLabel('Phone')).toHaveValue(newPhone);

      // --- Direct attempt at a protected field, bypassing the UI (which
      // never offers one) — confirms the real trigger, not just that the
      // form omits it. ---
      const patchRes = await request.patch(`${supabaseUrl}/rest/v1/places?id=eq.${placeId}`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        data: { locals: 999999 },
      });
      expect(patchRes.status()).toBe(403);
      const body = await patchRes.json();
      expect(body.message).toMatch(/ranking-relevant column change rejected/);
    } finally {
      // Clean slate for the next run, whether this test passed or failed
      // partway through — real DELETE via the admin's real RLS grant, not a
      // service-role bypass.
      if (!adminLoggedIn) {
        adminContext ??= await browser.newContext();
        await loginAsAdmin(await adminContext.newPage(), TEST_ACCOUNTS.admin);
      }
      const adminAccessToken = extractAccessToken(await adminContext!.storageState());
      if (adminAccessToken) {
        await request.delete(
          `${supabaseUrl}/rest/v1/business_claims?place_id=eq.${placeId}&user_id=eq.${userId}`,
          { headers: { apikey: anonKey, Authorization: `Bearer ${adminAccessToken}` } },
        );
      }
      await adminContext!.close();
    }
  });
});
