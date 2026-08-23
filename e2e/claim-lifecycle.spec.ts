import { test, expect } from '@playwright/test';
import { loginAsConsumer, loginAsAdmin, TEST_ACCOUNTS } from './helpers';

// A real business claim, start to finish: submit as User → admin marks
// called → admin approves → the same User account gains real edit access
// (owns_verified_claim flips true) → an allowed field edit persists → a
// direct attempt at a protected field (bypassing the UI, which never offers
// one) is rejected by the real trigger.
//
// Uses "Simply South" (not claimed by any seeded fixture data) so repeat runs
// don't collide with the business_claims_active_unique constraint on a
// pending/verified claim for the same (user, place) pair. Re-running this
// spec a second time against the same project will fail at the submit step
// with a real duplicate-claim conflict — that's expected, not a bug (see
// PHASE_3_COMPLETION_REPORT.md §5 for how this was handled in this run).
const PLACE_SLUG = 'restaurants/simply-south';

test.describe('Business claim lifecycle', () => {
  test('submit, admin call + approve, owner edits an allowed field, protected field stays blocked', async ({
    page,
    request,
  }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);

    await page.goto(`/places/${encodeURIComponent(PLACE_SLUG)}`);
    await page.getByRole('button', { name: 'Is this your business?' }).click();
    await expect(page).toHaveURL(/\/claim\//);

    await page.getByLabel('Google Maps link').fill('https://maps.google.com/?q=Simply+South');
    await page.getByLabel('Contact phone number').fill('9876543210');
    await page.getByRole('button', { name: 'Submit claim' }).click();
    await expect(page).toHaveURL(/\/status$/);
    await expect(page.getByText('pending')).toBeVisible();

    // --- Admin side: mark called, then approve ---
    const adminContext = await page.context().browser()!.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage, TEST_ACCOUNTS.admin);
    await adminPage.goto('/admin/claims');
    const row = adminPage.getByRole('row', { name: /Simply South/ });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Mark called' }).click();
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(row.getByText('verified')).toBeVisible({ timeout: 10_000 });
    await adminContext.close();

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

    // --- Direct attempt at a protected field, bypassing the UI (which never
    // offers one) — confirms the real trigger, not just that the form omits it. ---
    const storageState = await page.context().storageState();
    const authEntry = storageState.origins
      .flatMap((o) => o.localStorage)
      .find((item) => item.name.includes('-auth-token'));
    const accessToken = authEntry ? JSON.parse(authEntry.value).access_token : undefined;
    expect(accessToken).toBeTruthy();

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const placeRes = await request.get(
      `${supabaseUrl}/rest/v1/places?slug=eq.${encodeURIComponent(PLACE_SLUG)}&select=id`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
    );
    const [{ id: placeId }] = await placeRes.json();

    const patchRes = await request.patch(`${supabaseUrl}/rest/v1/places?id=eq.${placeId}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      data: { locals: 999999 },
    });
    expect(patchRes.status()).toBe(403);
    const body = await patchRes.json();
    expect(body.message).toMatch(/ranking-relevant column change rejected/);
  });
});
