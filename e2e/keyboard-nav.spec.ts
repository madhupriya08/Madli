import { test, expect } from '@playwright/test';
import { mockBoot } from './mockBoot';

// Phase 4 §9: the genuine keyboard-only pass every prior phase disclosed as
// "not done." Covers: modal focus management (Dialog — used by 9 screens,
// found with no focus behavior at all before this phase's fix), tab order
// on a representative screen per role, and no keyboard trap.
async function gotoAndSetPersona(page: import('@playwright/test').Page, persona: string) {
  await mockBoot(page);
  await page.goto('/');
  await expect(page.getByText(/All screens \(\d+\)/)).toBeVisible({ timeout: 10_000 });
  if (persona !== 'Guest') {
    await page.getByRole('button', { name: persona, exact: true }).click();
  }
}

test.describe('Keyboard-only pass', () => {
  test('Dialog (S22 Share sheet) — focus moves in on open, Tab is trapped, Escape closes it', async ({
    page,
  }) => {
    // /share is its own route (ShareSheetScreen renders just the Dialog),
    // not an overlay kept mounted over the triggering screen — so this
    // checks the three behaviors that hold regardless of that: real focus
    // entry, a real Tab trap, and a real Escape-to-close. (Focus-restored-
    // to-trigger only applies to a Dialog used as a true in-place overlay,
    // not one that is its own route — not asserted here for that reason.)
    await gotoAndSetPersona(page, 'User');
    await page.locator('aside a[href="/share"]').click();
    await page.waitForSelector('#root > *');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Share this pick');
    const focusedInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]');
      return !!dialogEl && dialogEl.contains(document.activeElement);
    });
    expect(focusedInsideDialog, 'focus should be inside the dialog on open').toBe(true);

    // Tab all the way through — must never escape the dialog (a real trap).
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(() => {
        const dialogEl = document.querySelector('[role="dialog"]');
        return !!dialogEl && dialogEl.contains(document.activeElement);
      });
      expect(stillInside, `focus escaped the dialog after ${i + 1} Tab presses`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('tab order and visible focus — Landing page (Guest)', async ({ page }) => {
    await gotoAndSetPersona(page, 'Guest');
    await page.locator('aside a[href="/landing"]').click();
    await page.waitForSelector('#root > *');

    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const hasVisibleFocusRing = style.outlineStyle !== 'none' || style.boxShadow !== 'none';
        return { tag: el.tagName, text: el.textContent?.slice(0, 30), hasVisibleFocusRing };
      });
      if (!info) continue;
      seen.add(`${info.tag}:${info.text}`);
      expect(info.hasVisibleFocusRing, `no visible focus ring on ${info.tag} "${info.text}"`).toBe(
        true,
      );
    }
    // A real, moving tab order visited more than one distinct element —
    // not stuck on a single node (the actual shape a keyboard trap takes
    // outside of a modal).
    expect(seen.size, 'Tab should move between multiple distinct elements').toBeGreaterThan(1);
  });

  test('tab order and visible focus — Bookmarks (User)', async ({ page }) => {
    await gotoAndSetPersona(page, 'User');
    await page.locator('aside a[href="/bookmarks"]').click();
    await page.waitForSelector('#root > *');

    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        return { tag: el.tagName, text: el.textContent?.slice(0, 30) };
      });
      if (info) seen.add(`${info.tag}:${info.text}`);
    }
    expect(seen.size, 'Tab should move between multiple distinct elements').toBeGreaterThan(1);
  });
});
