import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Phase 2 frontend build/dev config. Test configuration for the frontend
// lives in vitest.frontend.config.ts (kept separate from the root
// vitest.config.ts, which is Phase 1's backend suite and is not touched here).
export default defineConfig({
  root: '.',
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
});
