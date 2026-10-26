import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
          // three.js is most of a megabyte and belongs to a renderer, not to a
          // route. Naming it keeps the shadows chunk small enough to read and
          // gives a second three.js game something to share; the cost is one
          // extra parallel request on a cold visit, which HTTP/2 makes cheap.
          if (id.includes('node_modules/three')) {
            return 'three';
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
