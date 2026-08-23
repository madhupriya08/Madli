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
        // Phase 4 (§4): Node processes here pick up HTTPS_PROXY automatically;
        // Chromium does not by default, which is why Phase 3 saw 13 browser
        // requests hang for the full test timeout instead of failing fast —
        // the underlying host was policy-denied either way, just silently.
        // Routing the browser through the same proxy turns that into the
        // same fast, clean CONNECT-403 Node already gets, so a genuinely
        // blocked host is diagnosed in seconds, not ~5 minutes of timeouts.
        // `bypass` is required: without it, the *local* dev server
        // (localhost:5173, this suite's own webServer) also gets routed
        // through the proxy, which rejects plain-HTTP/absolute-form
        // requests outright — a real failure mode hit once in this phase
        // before adding this bypass (PHASE_4_QA_REPORT.md §4).
        proxy: process.env.HTTPS_PROXY
          ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }
          : undefined,
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
