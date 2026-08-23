import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Phase 2 frontend test suite (Vitest + React Testing Library). Deliberately
// separate from the root vitest.config.ts, which is Phase 1's backend RLS/
// function suite against tests/ — that file and directory are not touched.
//
// Phase 3: src/lib/supabaseClient.ts throws if VITE_SUPABASE_URL/ANON_KEY are
// missing (a deliberate real-app safeguard against a silent hardcoded
// fallback) — these dummy values just let modules that import it load during
// unit tests. `createClient()` makes no network call at construction time;
// any test that needs a real network response mocks supabaseClient/auth
// directly instead of relying on these reaching the real project.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
