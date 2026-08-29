import { test, expect } from '@playwright/test';
import { mockBoot } from './mockBoot';

// Guest-flow & onboarding round, item 10's explicit instruction: don't call a
// screen done because it renders — actually click through the real guest
// path in a real browser. Supabase is mocked at the network layer
// (mockBoot); routing, the area list, intake/filters, the applied-filter
// chips, the persistent sign-in control, and the place-detail gates below
// are all the real code running in a real Chromium tab.

test('a first-time guest can click all the way from landing to results', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/');

  // Landing page — root route for a signed-out visitor, not buried behind
  // anything else. Both CTAs equally easy to find, no Hyderabad-specific copy.
  await expect(page.getByRole('button', { name: 'Sign up free' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Look around as a guest' })).toBeVisible();
  await expect(page.getByText('Hyderabad')).toHaveCount(0);

  await page.getByRole('button', { name: 'Look around as a guest' }).click();

  // S8 — required area step, no skip.
  await expect(page).toHaveURL(/\/area$/);
  await page.getByText('Jubilee Hills', { exact: true }).click();

  // S53 — local/visitor ask, optional.
  await expect(page).toHaveURL(/\/local-or-visitor$/);
  await page.getByRole('button', { name: 'Skip for now' }).click();

  // S7 — Home, two doors, leading with the area name. A persistent "Sign in"
  // control must be reachable from here without going back to landing.
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('Jubilee Hills · Change')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('heading', { name: 'Eat', exact: true }).click();

  // S15 — intake, three groups, straight in — no re-ask for area. Desktop
  // shows all three at once (no step-by-step "Next"), so every answer is
  // picked directly before the one "See picks" button.
  await expect(page).toHaveURL(/\/intake$/);
  await page.getByText('Solo', { exact: true }).click();
  await page.getByText('Casual', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Time window' })).toBeVisible();
  await page.getByText('Right now', { exact: true }).click();
  await page.getByRole('button', { name: 'See picks' }).click();

  // S16 — filters, then straight to results.
  await expect(page).toHaveURL(/\/filters$/);
  await page.getByText('Under 5 km', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  // S17 — results. Applied filters are visible and each is a real chip
  // (Solo/Casual/Right now/Under 5 km), not silently dropped.
  await expect(page).toHaveURL(/\/results\/eat$/);
  for (const label of ['Solo', 'Casual', 'Right now', 'Within 5 km']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  // The persistent sign-in control follows all the way to results too.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('a guest tapping the bridge card on a real place gets the signup prompt, not a silent pass-through', async ({
  page,
}) => {
  await mockBoot(page);
  // Direct to a real catalogue place with no lat/lng, exercising the map
  // placeholder and the "What to order" lock in the same pass.
  await page.goto('/places/restaurants%2Fmehfil');

  await expect(page.getByText('Map placeholder — open directions')).toBeVisible();
  await expect(page.getByText('6 dishes mentioned — sign up to see them')).toBeVisible();

  await page.getByRole('button', { name: /closest places worth stopping at afterwards/ }).click();

  await expect(page.getByText('This one needs an account')).toBeVisible();
  await expect(page).toHaveURL(/\/places\/restaurants%2Fmehfil$/);

  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await expect(page.getByText('This one needs an account')).toHaveCount(0);
});
