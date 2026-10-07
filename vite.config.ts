import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The production build is mounted under the /hrd/ URL prefix, so every asset
// and router path is resolved relative to that base. The same base is mirrored
// by the router basename in src/main.tsx.
export default defineConfig({
  base: '/hrd/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
