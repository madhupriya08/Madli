import { test, expect } from '@playwright/test';
import { loginAsConsumer, TEST_ACCOUNTS } from './helpers';

// Happy path: a signed-in user pairs a real eat pick with the day's real
// explore pick (S20 bridge tap), saves it as a plan, mints a real share
// token (fn_create_plan_share_token), and a completely separate anonymous
// browser context — no login, no cookies, no localStorage — opens that link
// and sees the same plan in full: no cap, no lock, per the real
// x-share-token RLS policy on `plans` (src/data/plans.ts).
test.describe('Shared plan — guest opens a link with no account', () => {
  test('save a plan, share it, and a guest sees it fully with no account', async ({
    page,
    browser,
  }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);

    await page.goto('/results/eat');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('heading', { level: 3 }).first().click();
    await expect(page).toHaveURL(/\/places\//);

    await page.getByRole('button', { name: 'Pair with an Explore pick' }).click();
    await expect(page).toHaveURL(/\/bridge$/);
    const saveButton = page.getByRole('button', { name: 'Save the pair as a plan' });
    await saveButton.click();
    await expect(page.getByRole('button', { name: 'Saved as a plan' })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/bookmarks');
    await page.getByRole('tab', { name: 'Plans' }).click();
    const planCard = page.getByText('Saved plan').first();
    await expect(planCard).toBeVisible({ timeout: 10_000 });
    await planCard.click();
    await expect(page).toHaveURL(/\/plans\//);

    // Real RPC mints a real, permanent token — grant clipboard so the button's
    // real write succeeds, then read the real value straight out of it
    // instead of trusting the toast copy alone.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Share this plan' }).click();
    await expect(page.getByText('Share link copied.', { exact: false })).toBeVisible({
      timeout: 10_000,
    });
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toMatch(/\/plans\/.+\?shared=1$/);

    // A fresh, fully anonymous context — no storage state carried over at all.
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(shareUrl);

    await expect(guestPage.getByText('Shared link — no account needed, never expires')).toBeVisible(
      { timeout: 10_000 },
    );
    await expect(guestPage.getByText("We can't find that plan")).not.toBeVisible();
    await expect(guestPage.getByText('Map placeholder — both stops')).toBeVisible();
    await guestContext.close();
  });
});
