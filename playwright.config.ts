import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Loads the same .env.local Phase 1's tests/helpers.ts reads from, so
// process.env.VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are available to specs
// that call the REST API directly (e.g. e2e/admin.spec.ts, e2e/failure-paths.spec.ts).
loadEnv({ path: '.env.local' });

// Phase 3 E2E suite — against the real running dev server and the real
// live Supabase project (wybpprdunzrzyzsbiarv), not mocked. See
// PHASE_3_COMPLETION_REPORT.md for the real result of actually running this
// suite, including any environment constraints hit along the way.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // This sandbox's pre-installed Chromium (see environment docs) — do
        // not run `playwright install`.
        launchOptions: { executablePath: '/opt/pw-browsers/chromium' },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
