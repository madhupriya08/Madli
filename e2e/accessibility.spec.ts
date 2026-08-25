import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockBoot } from './mockBoot';
import { screenRegistry } from '../src/screens/registry';

// Phase 4 §9/§6: an automated accessibility scan across the *whole* screen
// catalogue — the completeness gap every prior phase disclosed and never
// closed (only each screen's default state was ever click-through-verified,
// and only by inspection, not a real render). This scans the default state
// of all 52 screens for real, in a real browser, via mockBoot's network
// interception (see that file for why: this sandbox can't reach the real
// Supabase project at all, and the app fails fast rather than boot on
// missing reference data, by design).
//
// Persona is set via the dev harness's own quick-switch (a real, disclosed
// dev-only feature — see src/dev/PersonaContext.tsx), then navigation uses
// the harness's own "All screens" links (real in-app SPA navigation via
// react-router's navigate(), which preserves React state) rather than
// page.goto() a second time, which would trigger a full reload and reset
// persona back to Guest.
function personaFor(roles: string): 'guest' | 'user' | 'owner' | 'admin' {
  if (roles.includes('Admin')) return 'admin';
  if (roles.includes('Owner')) return 'owner';
  if (roles.includes('User')) return 'user';
  return 'guest';
}

function resolvePath(path: string): string {
  return path.replace(/:\w+/g, 'restaurants%2Fhotel-shadab');
}

test.describe('Accessibility — automated axe-core scan across the screen catalogue', () => {
  for (const screen of screenRegistry) {
    test(`${screen.id} ${screen.name} (default state) — no serious/critical axe violations`, async ({
      page,
    }) => {
      await mockBoot(page);
      await page.goto('/');
      await expect(page.getByText(`All screens (${screenRegistry.length})`)).toBeVisible({
        timeout: 10_000,
      });

      const persona = personaFor(screen.roles);
      if (persona !== 'guest') {
        await page
          .getByRole('button', {
            name: persona.charAt(0).toUpperCase() + persona.slice(1),
            exact: true,
          })
          .click();
      }

      const resolved = resolvePath(screen.path);
      await page.locator(`aside a[href="${resolved}"]`).click();
      // networkidle alone doesn't guarantee React has actually committed a
      // render for a pure client-side route change (no network activity is
      // involved at all) — wait for real DOM content too, or a screen that
      // bounces back via navigate(-1) (e.g. a "claim not found" guard) can
      // get scanned mid-transition and produce a false "blank document"
      // result rather than a real finding.
      await page.waitForSelector('#root > *', { timeout: 10_000 });
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .exclude('aside') // the dev harness itself is not part of the app's own UI
        .analyze();
      const notable = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (notable.length > 0) {
        console.log(`${screen.id} (${screen.name}) violations:`, JSON.stringify(notable, null, 2));
      }
      expect(notable, `${screen.id} (${screen.name})`).toEqual([]);
    });
  }
});
