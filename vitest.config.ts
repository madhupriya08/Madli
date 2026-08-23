import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Scoped to this suite only — without this, Vitest's default include
    // glob also picks up src/**/*.test.tsx (needs jsdom + the frontend's own
    // config, see vitest.frontend.config.ts) and e2e/**/*.spec.ts (Playwright
    // specs, which crash when collected by a runner other than Playwright's
    // own). Found by actually running `npm test` for the first time in
    // Phase 3 — see PHASE_3_COMPLETION_REPORT.md §3.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    // Tests run against one shared, real, hosted Supabase project rather than
    // a per-test transactional sandbox, so file-level parallelism is disabled
    // to avoid cross-file races on shared fixture rows (e.g. two files both
    // calling fn_log_ranked_visit for the same test user/category).
    fileParallelism: false,
  },
});
