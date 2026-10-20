import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Absolute base: routes are real paths (/play/sudoku), not a hash router, so
  // the app must be served from the domain root on Vercel or Cloudflare Pages.
  base: '/',
  build: {
    target: 'es2022',
    // The Sudoku engine is one lazy chunk; keeping it out of the entry bundle
    // is what makes the garden's first paint cheap.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
