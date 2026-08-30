import { test, expect } from '@playwright/test';
import { loginAsConsumer, TEST_ACCOUNTS } from './helpers';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

test.describe('Failure paths', () => {
  test('network failure — Supabase unreachable at boot shows the real fatal-error screen, not a blank page', async ({
    page,
  }) => {
    // src/main.tsx's loadLiveConfig().catch(renderFatalError) is the one path
    // that runs before the app ever mounts — the only honest way to exercise
    // it is to actually block the network the way a real outage would.
    await page.route('**/rest/v1/**', (route) => route.abort('failed'));
    await page.goto('/');
    await expect(page.getByText("Madli couldn't load")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        'Failed to reach Supabase for reference data (places, categories, areas, config).',
      ),
    ).toBeVisible();
  });

  test('invalid credentials — a wrong password surfaces a real error, not a silent failure', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_ACCOUNTS.user.email);
    await page.getByLabel('Password').fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('expired session — a corrupted/expired token degrades to Guest instead of crashing', async ({
    page,
  }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);
    await page.goto('/bookmarks');
    await expect(page.getByRole('tab', { name: 'Places' })).toBeVisible();

    // Corrupt the real stored Supabase session in place — both the access
    // and refresh token — so a fresh getSession()/refresh on reload fails the
    // way a genuinely expired session would, without waiting out a real
    // token's actual lifetime.
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('-auth-token'));
      if (!key) throw new Error('no stored auth token found to corrupt');
      const stored = JSON.parse(localStorage.getItem(key)!);
      stored.access_token = 'corrupted.invalid.token';
      stored.refresh_token = 'corrupted-refresh-token';
      stored.expires_at = Math.floor(Date.now() / 1000) - 3600;
      localStorage.setItem(key, JSON.stringify(stored));
    });

    await page.reload();
    // PersonaContext's applySession falls back to Guest on failure rather
    // than crash (src/dev/PersonaContext.tsx) — the bookmarks list degrades
    // to its real empty state rather than showing stale/wrong data.
    await expect(page.getByText('Nothing saved yet')).toBeVisible({ timeout: 10_000 });
  });

  test('missing resource — a place slug and a plan id that do not exist both show a real not-found state', async ({
    page,
  }) => {
    await loginAsConsumer(page, TEST_ACCOUNTS.user);

    await page.goto('/places/restaurants%2Fthis-place-does-not-exist');
    await expect(page.getByText("We can't find that place")).toBeVisible({ timeout: 10_000 });

    await page.goto('/plans/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText("We can't find that plan")).toBeVisible({ timeout: 10_000 });
  });

  test('edge function error — share-preview rejects invalid input and an unknown plan token, for real, over HTTP', async ({
    request,
  }) => {
    const missingSlug = await request.get(`${SUPABASE_URL}/functions/v1/share-preview?type=place`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    expect(missingSlug.status()).toBe(400);
    const missingSlugBody = await missingSlug.json();
    expect(JSON.stringify(missingSlugBody)).toMatch(/type=place requires slug/);

    const badToken = await request.get(
      `${SUPABASE_URL}/functions/v1/share-preview?type=plan&token=not-a-real-token`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
    );
    expect(badToken.status()).toBe(404);
    const badTokenBody = await badToken.json();
    expect(badTokenBody.error).toMatch(/plan not found or token invalid/);
  });
});
