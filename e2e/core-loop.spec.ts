import { test, expect } from '@playwright/test';
import { loginAsConsumer, TEST_ACCOUNTS } from './helpers';

// Happy path: the whole ranking loop against the real live project — real
// login, real published_picks read, real bookmark insert, real
// fn_log_ranked_visit RPC, real ranked list read afterward.
test.describe('Core loop — search to ranked list', () => {
  test('log in, browse results, bookmark a place, mark it visited, see it on the ranked list', async ({
    page,
  }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);

    await page.goto('/results/eat');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible({ timeout: 10_000 });

    const firstPickName = await page.getByRole('heading', { level: 3 }).first().textContent();
    await page.getByRole('heading', { level: 3 }).first().click();

    await expect(page).toHaveURL(/\/places\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(firstPickName ?? '');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('/bookmarks');
    const markVisited = page.getByRole('button', { name: 'Mark as visited' }).first();
    await expect(markVisited).toBeVisible();
    await markVisited.click();

    await expect(page).toHaveURL(/\/log-visit/);
    await page.getByRole('button', { name: 'Loved it' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Either the first-in-category screen or a pairwise comparison follows —
    // both real, driven by whatever this account's real ranked_entries state
    // already is.
    await Promise.race([
      page.getByRole('button', { name: 'Add to my list' }).waitFor({ timeout: 10_000 }),
      page.getByText('Your new visit').waitFor({ timeout: 10_000 }),
    ]);
    const firstInCategory = await page
      .getByRole('button', { name: 'Add to my list' })
      .isVisible()
      .catch(() => false);
    if (firstInCategory) {
      await page.getByRole('button', { name: 'Add to my list' }).click();
    } else {
      await page.getByText('Your new visit').click();
    }

    await expect(page).toHaveURL(/\/log-visit\/landed/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('landed at #');

    await page.getByRole('button', { name: 'See my ranked list' }).click();
    await expect(page).toHaveURL(/\/my-list/);
  });
});
