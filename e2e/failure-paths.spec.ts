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
      page.getByText('Failed to reach Supabase for reference data (places, categories, areas, config).'),
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

  test('duplicate data — resubmitting a claim on an already-verified place is rejected, with a real visible error', async ({
    page,
  }) => {
    // owner.test holds a real, seeded VERIFIED claim on Cafe Bahar
    // (supabase/README.md "Test accounts") — a stable fact of the live
    // project, not something a previous test run has to have left behind, so
    // this is deterministic across runs unlike claim-lifecycle.spec.ts's
    // first-claim path. The "Is this your business?" link is correctly
    // hidden once a place is already verified (PlaceDetailScreen), so this
    // deep-links straight to the claim form the way a stale bookmark or a
    // manually typed URL would.
    //
    // Found while writing this test: ClaimRequestFormScreen previously had no
    // catch at all around the submit call, so a rejected duplicate claim
    // failed as a silent unhandled promise rejection — the button just
    // re-enabled with no explanation. Fixed to show a real error toast (see
    // PHASE_3_COMPLETION_REPORT.md §5).
    await loginAsConsumer(page, TEST_ACCOUNTS.owner);
    await page.goto('/claim/restaurants%2Fcafe-bahar');

    await page.getByLabel('Google Maps link').fill('https://maps.google.com/?q=Cafe+Bahar');
    await page.getByLabel('Contact phone number').fill('9876500000');
    await page.getByRole('button', { name: 'Submit claim' }).click();

    await expect(page.getByText(/already|duplicate|unique|exists/i)).toBeVisible({ timeout: 10_000 });
    // Rejected, so it must not have navigated on to the status screen.
    await expect(page).not.toHaveURL(/\/status$/);
  });

  test('unauthorized action — a non-owner cannot edit a listing by direct URL, and the app says so instead of lying', async ({
    page,
  }) => {
    // Found while writing this test: RLS blocks an unauthorized UPDATE by
    // matching zero rows, not by raising an error, so updateOwnerListing
    // previously reported "Listing updated." on a fully blocked write. Fixed
    // to check rows-affected and throw NotAuthorizedError
    // (PHASE_3_COMPLETION_REPORT.md §5). user.test owns no verified claims at
    // all, so any place's owner-edit form is a legitimate unauthorized target
    // reached the same way a shared/guessed edit URL would be.
    await loginAsConsumer(page, TEST_ACCOUNTS.user);
    await page.goto('/owner/restaurants%2Fcafe-bahar/edit');

    await page.getByLabel('Phone').fill('040 000 0000');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('You are not a verified owner of this listing.')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Listing updated.')).not.toBeVisible();
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
    const missingSlug = await request.get(
      `${SUPABASE_URL}/functions/v1/share-preview?type=place`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } },
    );
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
