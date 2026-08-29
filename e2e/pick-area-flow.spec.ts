import { test, expect } from '@playwright/test';
import { mockBoot } from './mockBoot';

// The location-flow rework: S8 and S9 merged into one required "Pick your
// area" step that now runs between every auth choice and Home, instead of a
// cold OS prompt with a typed fallback screen behind it. Exercised in a real
// browser — Supabase is mocked at the network layer (mockBoot); routing, the
// area list, the GPS button, and Home's area-scoped content are all real.

test('Splash offers all three auth choices at equal weight', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/splash');
  await expect(page.getByRole('button', { name: 'Sign up free' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Look around as a guest' })).toBeVisible();
});

test('guest: Splash sends you through the required area step before Home', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/splash');
  await page.getByRole('button', { name: 'Look around as a guest' }).click();
  await expect(page).toHaveURL(/\/area$/);
  // Not `getByText('Pick your area')` — the dev harness's own "All screens"
  // rail (only present under the harness dev server this suite runs
  // against) repeats every screen name, including this one, so that text
  // matches twice. The GPS button is unique to the real screen content.
  await expect(page.getByRole('button', { name: 'Use my current location' })).toBeVisible();
});

test('the area list shows all eight neighbourhoods with coverage depth, and filters live', async ({
  page,
}) => {
  await mockBoot(page);
  await page.goto('/area');

  await expect(page.getByText('Jubilee Hills', { exact: true })).toBeVisible();
  await expect(page.getByText('418 places · deep coverage')).toBeVisible();
  await expect(page.getByText('Alwal', { exact: true })).toBeVisible();
  await expect(page.getByText('31 places · not enough to rank')).toBeVisible();

  await page.getByPlaceholder('Search a neighbourhood').fill('kon');
  await expect(page.getByText('Kondapur', { exact: true })).toBeVisible();
  await expect(page.getByText('Jubilee Hills', { exact: true })).toHaveCount(0);
});

test('a guest has no "Set as my home area" toggle', async ({ page }) => {
  await mockBoot(page);
  await page.goto('/area');
  await expect(page.getByText('Jubilee Hills', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Home' })).toHaveCount(0);
});

test('selecting an area continues through the local/visitor ask, then to Home leading with the area name', async ({
  page,
}) => {
  await mockBoot(page);
  await page.goto('/area');
  await page.getByText('Madhapur', { exact: true }).click();

  // S53 (Local or visitor) runs once, right after settling on an area —
  // entirely optional, so skipping it still reaches Home.
  await expect(page).toHaveURL(/\/local-or-visitor$/);
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('Madhapur · Change')).toBeVisible();
});

test('geolocation only fires on the button tap, never on mount, and resolves to the nearest area', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Deterministic stand-in for the real OS prompt: a point right next to
    // the Jubilee Hills seed centroid (17.4325, 78.4074).
    Object.defineProperty(window.navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          (window as unknown as { __geoCalls: number }).__geoCalls =
            ((window as unknown as { __geoCalls?: number }).__geoCalls ?? 0) + 1;
          success({
            coords: { latitude: 17.433, longitude: 78.41 },
          } as GeolocationPosition);
        },
      },
      configurable: true,
    });
  });
  await mockBoot(page);
  await page.goto('/area');

  // Nothing has fired yet just from loading the screen.
  const callsBeforeTap = await page.evaluate(
    () => (window as unknown as { __geoCalls?: number }).__geoCalls ?? 0,
  );
  expect(callsBeforeTap).toBe(0);

  await page.getByRole('button', { name: 'Use my current location' }).click();

  await expect(page).toHaveURL(/\/local-or-visitor$/);
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('Jubilee Hills · Change')).toBeVisible();
});

test('a denied prompt is not an error — no alert appears, the list stays usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: 'User denied Geolocation' } as GeolocationPositionError);
        },
      },
      configurable: true,
    });
  });
  await mockBoot(page);
  await page.goto('/area');
  await page.getByRole('button', { name: 'Use my current location' }).click();

  // Still on S8 — no navigation, no alert.
  await expect(page).toHaveURL(/\/area$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
  // The fallback was already the answer, not a new screen: same list.
  await expect(page.getByText('Jubilee Hills', { exact: true })).toBeVisible();
});
