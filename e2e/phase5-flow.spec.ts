import { test, expect } from '@playwright/test';
import { mockBoot } from './mockBoot';

// Phase 5: the five changes asked for in this round, exercised in a real
// browser. Supabase is mocked at the network layer (mockBoot) because this
// sandbox cannot reach the live project; everything else — routing, the
// intake steps, the chip row and its clear behaviour — is the real code.

test('a door click goes straight to intake instead of re-asking for location', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/app');
  await page.getByRole('heading', { name: 'Eat', exact: true }).click();
  await expect(page).toHaveURL(/\/intake$/);
});

// S15 is real divergence, not a reflow — desktop shows every step at once,
// mobile walks them one at a time — so the two layouts are asserted
// separately rather than assuming one of them.
test('intake shows all four groups at once on desktop', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/intake');

  await expect(page.getByRole('heading', { name: 'Who is it for?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: "What's the occasion?" })).toBeVisible();
  await expect(page.getByRole('heading', { name: "What's the hard limit?" })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Which area?' })).toBeVisible();

  await expect(page.getByText('Solo', { exact: true })).toBeVisible();
  await expect(page.getByText('Work lunch', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Minutes you have')).toBeVisible();
  await expect(page.getByLabel('Distance (km)')).toBeVisible();
  // The budget cap — the design's third hard constraint, previously absent.
  await expect(page.getByText('Under ₹400 a head', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Neighbourhood')).toBeVisible();
});

test('intake walks who → occasion → hard limit → area on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBoot(page);
  await page.goto('/intake');

  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '4');

  await page.getByText('Couple', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Work lunch', { exact: true })).toBeVisible();
  await page.getByText('Date', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByLabel('Minutes you have')).toBeVisible();
  await expect(page.getByLabel('Distance (km)')).toBeVisible();
  await page.getByText('Under ₹400 a head', { exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByLabel('Neighbourhood')).toBeVisible();
  await expect(page.getByRole('button', { name: 'See picks' })).toBeVisible();
});

test('the filters panel carries the design groups that were missing', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/filters');

  for (const label of ['Vibe', 'Budget', 'Kitchen', 'Distance']) {
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Michelin-style', { exact: true })).toBeVisible();
  await expect(page.getByText('Veg-only kitchen', { exact: true })).toBeVisible();
  await expect(page.getByText('Under 5 km', { exact: true })).toBeVisible();
});

test('applied filters appear as editable chips on results and can be cleared', async ({ page }) => {
  await mockBoot(page);
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'madli.search',
      JSON.stringify({
        door: 'eat',
        who: 'Couple',
        occasion: 'Date',
        vibes: ['Diner'],
        budget: '₹300–600',
        areaText: 'Jubilee Hills',
      }),
    );
  });
  await page.goto('/results/eat');

  for (const label of ['Couple', 'Date', 'Diner', '₹300–600', 'Jubilee Hills']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }

  // exact: the whole chip's accessible name also contains "Remove Diner".
  await page.getByRole('button', { name: 'Remove Diner', exact: true }).click();
  await expect(page.getByText('Diner', { exact: true })).toHaveCount(0);
  // Clearing one chip leaves the others alone.
  await expect(page.getByText('Couple', { exact: true })).toBeVisible();
});

test('signup collects a name and hands off to the location step', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/signup');
  await expect(page.getByLabel('Your name')).toBeVisible();

  // Submitting without a name is refused before any network call.
  await page.getByLabel('Email').fill('person@example.com');
  await page.getByLabel('Password').fill('longenough');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter your name.');
});
