import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Phase 2 frontend test suite (Vitest + React Testing Library). Deliberately
// separate from the root vitest.config.ts, which is Phase 1's backend RLS/
// function suite against tests/ — that file and directory are not touched.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
