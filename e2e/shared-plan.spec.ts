import { test, expect } from '@playwright/test';
import { loginAsConsumer, TEST_ACCOUNTS } from './helpers';

// Happy path: a signed-in user opens a real place, taps into its bridge
// (nearby-stops) screen, adds a nearby pick to their plan (P5 §4 —
// plan_items, a real arbitrary-length stop list, not the old fixed
// eat_place_id/explore_place_id pair), shares it (mints a real
// fn_create_plan_share_token), and a completely separate anonymous browser
// context — no login, no cookies, no localStorage — opens that link and
// sees the full multi-stop plan: no cap, no lock, per the real
// x-share-token RLS policy on `plans`/`plan_items` (src/data/plans.ts).
//
// Previously this test drove a "Pair with an Explore pick" → "Save the
// pair as a plan" flow that no longer exists anywhere in the app — that UI
// belonged to the old fixed-pair `plans` schema, and BridgeTapScreen was
// rebuilt around live Google "nearby" results with per-stop "Add to plan"
// buttons well before this test was touched. Rewritten to match what is
// actually on screen today.
test.describe('Shared plan — guest opens a link with no account', () => {
  test('add a nearby stop to a plan, share it, and a guest sees it fully with no account', async ({
    page,
    browser,
  }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);

    await page.goto('/results/eat');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('heading', { level: 3 }).first().click();
    await expect(page).toHaveURL(/\/places\//);

    await page
      .getByRole('button', { name: /closest places (to eat afterwards|worth stopping at afterwards)/ })
      .click();
    await expect(page).toHaveURL(/\/bridge$/);

    const addButton = page.getByRole('button', { name: 'Add to plan' }).first();
    const stopCard = addButton.locator('xpath=ancestor::article[1]');
    const stopName = (await stopCard.locator('h3').innerText()).trim();
    await addButton.click();
    await expect(page.getByRole('button', { name: 'Added' }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/bookmarks');
    await page.getByRole('tab', { name: 'Plans' }).click();
    const planCard = page.getByText(new RegExp(`· 1 stop$`)).first();
    await expect(planCard).toBeVisible({ timeout: 10_000 });
    await planCard.click();
    await expect(page).toHaveURL(/\/plans\//);
    await expect(page.getByText(stopName)).toBeVisible();

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
    await expect(guestPage.getByText(stopName)).toBeVisible();
    // Owner-only actions are not offered on the anonymous, read-only view.
    await expect(guestPage.getByRole('button', { name: 'Share this plan' })).not.toBeVisible();
    await expect(guestPage.getByRole('button', { name: 'Add another stop' })).not.toBeVisible();
    await guestContext.close();
  });
});
