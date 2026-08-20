import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
