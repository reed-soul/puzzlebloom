/**
 * Draws `apps/web/public/og.png` — the 1200×630 card that shows up when the
 * link is pasted into a chat, a search result or a social post.
 *
 * It is a script rather than a checked-in design file for the same reason the
 * themes are code: the card uses the site's own typefaces and palette, and a
 * pretty picture that disagrees with the product is worse than no picture.
 * Re-run it after changing the wordmark, the tagline or the default theme:
 *
 *     node scripts/og.mjs
 *
 * The result is committed, so a normal build does not need a browser.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'apps/web/public');
const site = JSON.parse(await readFile(path.join(ROOT, 'apps/web/site.json'), 'utf8'));

// Mochi Meadow, the default theme, copied rather than imported: this script runs
// outside the workspace's TypeScript graph, and four hex values are cheaper than
// a build step.
const C = {
  bg: '#ECF7E4',
  surface: '#FDFEFC',
  sky: '#A9E1EF',
  ink: '#122B1C',
  brand: '#007D43',
  accent: '#FAB72A',
  accentInk: '#151E0F',
};

/** A 3×3 slice of a board, with one cell turned into a creature. */
const CELLS = ['5', '', '3', '', '7', '', '2', '', 'creature'];
const LEDE = 'Sudoku that explains why a number goes where it does.';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  @font-face {
    font-family: 'Baloo 2';
    src: url('/fonts/baloo2-var-latin.woff2') format('woff2-variations');
    font-weight: 400 800;
    font-display: block;
  }
  @font-face {
    font-family: 'Nunito';
    src: url('/fonts/nunito-var-latin.woff2') format('woff2-variations');
    font-weight: 200 1000;
    font-display: block;
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: ${C.bg};
    color: ${C.ink};
    font-family: 'Nunito', system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* The sky band: one soft wash in the corner, the same device the home page
     opens with, so the card and the first screen are recognisably the same. */
  .sky {
    position: absolute;
    inset: -180px -120px auto auto;
    width: 760px; height: 640px;
    background: radial-gradient(circle at 62% 38%, ${C.sky} 0%, ${C.sky} 46%, transparent 71%);
    opacity: .9;
  }
  .sun {
    position: absolute;
    top: 34px; right: 56px;
    width: 78px; height: 78px;
    border-radius: 50%;
    background: ${C.accent};
    box-shadow: 0 0 0 14px color-mix(in oklab, ${C.accent} 26%, transparent);
  }
  .hill {
    position: absolute;
    left: -80px; bottom: -150px;
    width: 1400px; height: 300px;
    border-radius: 50% 50% 0 0 / 60% 60% 0 0;
    background: ${C.brand};
    opacity: .16;
  }

  .sheet {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 344px;
    gap: 48px;
    align-items: center;
    height: 100%;
    padding: 76px 84px;
  }

  .eyebrow {
    font-weight: 800;
    font-size: 17px;
    letter-spacing: .17em;
    text-transform: uppercase;
    color: ${C.brand};
    margin-bottom: 18px;
  }
  h1 {
    font-family: 'Baloo 2', sans-serif;
    font-weight: 800;
    font-size: 96px;
    line-height: .92;
    letter-spacing: -.028em;
    margin-bottom: 20px;
  }
  h1 .leaf { color: ${C.brand}; }
  .lede {
    font-size: 27px;
    line-height: 1.34;
    font-weight: 600;
    max-width: 560px;
    margin-bottom: 30px;
  }
  .chips { display: flex; gap: 10px; flex-wrap: wrap; }
  .chip {
    font-size: 17px;
    font-weight: 800;
    padding: 8px 15px;
    border-radius: 999px;
    background: ${C.surface};
    border: 2px solid ${C.ink};
    box-shadow: 0 3px 0 ${C.ink};
  }
  .chip--warm { background: ${C.accent}; color: ${C.accentInk}; }

  .board {
    width: 344px; height: 344px;
    padding: 22px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 12px;
    background: ${C.surface};
    border: 3px solid ${C.ink};
    border-radius: 34px;
    box-shadow: 0 14px 0 ${C.ink};
    transform: rotate(-2.5deg);
  }
  .cell {
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: ${C.bg};
    font-family: 'Baloo 2', sans-serif;
    font-weight: 800;
    font-size: 58px;
    color: ${C.ink};
  }
  .cell--given { background: transparent; }
  .cell--blank {
    background: color-mix(in oklab, ${C.bg} 55%, ${C.surface});
  }
  .cell--creature { background: ${C.sky}; }
  .creature { width: 86px; height: 86px; }
</style></head>
<body>
  <div class="sky"></div>
  <div class="sun"></div>
  <div class="hill"></div>

  <div class="sheet">
    <div>
      <p class="eyebrow">${site.tagline}</p>
      <h1>Puzzle<span class="leaf">Bloom</span></h1>
      <p class="lede">${LEDE}</p>
      <div class="chips">
        <span class="chip chip--warm">no ads</span>
        <span class="chip">no accounts</span>
        <span class="chip">no streaks</span>
      </div>
    </div>

    <div class="board">
      ${CELLS.map((cell) => {
        if (cell === 'creature') {
          // The same face the board draws for digit 7: ears, eyes, a flat mouth.
          return `<div class="cell cell--creature" aria-hidden="true">
            <svg class="creature" viewBox="0 0 100 100">
              <ellipse cx="50" cy="55" rx="30" ry="29" fill="${C.brand}"/>
              <path d="M30 36 L26 14 L46 27 Z" fill="${C.brand}"/>
              <path d="M70 36 L74 14 L54 27 Z" fill="${C.brand}"/>
              <circle cx="40" cy="52" r="5" fill="${C.accentInk}"/>
              <circle cx="60" cy="52" r="5" fill="${C.accentInk}"/>
              <path d="M42 68 q8 7 16 0" fill="none" stroke="${C.accentInk}" stroke-width="4"
                    stroke-linecap="round"/>
            </svg>
          </div>`;
        }
        return `<div class="cell ${cell ? 'cell--given' : 'cell--blank'}">${cell}</div>`;
      }).join('\n      ')}
    </div>
  </div>
</body></html>`;

const MIME = { '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://127.0.0.1');
  if (pathname === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
    return;
  }
  const file = path.join(PUBLIC, pathname);
  if (!existsSync(file)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  response.end(await readFile(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.screenshot({ path: path.join(PUBLIC, 'og.png'), type: 'png' });
  console.log('  wrote apps/web/public/og.png (1200×630)');
} finally {
  await browser.close();
  server.close();
}
