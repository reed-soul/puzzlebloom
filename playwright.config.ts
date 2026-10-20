/**
 * End-to-end tests.
 *
 * These cover the four things unit tests structurally cannot: that the app
 * boots, that routes resolve, that a puzzle can actually be played with a mouse
 * and a keyboard, and that the theme round-trips through localStorage. The
 * engine and the palette have their own unit tests; this file is about the
 * seams between them.
 *
 * It runs against the **production build**, not the dev server, because half of
 * what it is checking — the CSP, the worker chunk, the font preloads — only
 * exists after a build.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // One cheap mobile run: the board and keypad reflow completely below 900px,
    // and that reflow is where a layout regression would actually appear.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `pnpm --filter @puzzlebloom/web preview --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
  },
});
