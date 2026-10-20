/**
 * Post-build SEO pass.
 *
 * The site is a single-page app, and a single-page app presents *one* HTML
 * document to a crawler no matter which route was asked for. Everything that
 * distinguishes the three pages — title, description, canonical, structured
 * data — would be applied by JavaScript after the crawler had already decided
 * what the page was. Bing in particular will not wait.
 *
 * So after `vite build` this script renders each route in a real browser,
 * captures the resulting document, and writes it back to disk as a static file
 * (`dist/parents/index.html`, …). Three consequences:
 *
 *   - the served HTML already carries the right head and the rendered markup;
 *   - React still boots and takes over, so the app behaves exactly as before;
 *   - unknown URLs can now answer 404 instead of 200, because every real route
 *     is a file and the SPA catch-all is no longer needed.
 *
 * It also emits `robots.txt` and `sitemap.xml`, from the same `site.json` the
 * runtime head is built from, so the three can never disagree.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/web/dist');
const site = JSON.parse(await readFile(path.join(ROOT, 'apps/web/site.json'), 'utf8'));

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

/**
 * A deliberately dumb static server. It exists for the ninety seconds this
 * script runs, serves the build the way Cloudflare will (files first, the shell
 * for anything else), and is not part of the product.
 */
function serve(distDir, shell) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    let file = path.join(distDir, url.pathname);

    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!existsSync(file) || !path.extname(file)) file = null;

    if (file) {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      response.end(body);
      return;
    }

    response.writeHead(200, { 'content-type': MIME['.html'] });
    response.end(shell);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/**
 * Two things the captured DOM must not keep.
 *
 * `<html>` — the theme is applied to it at runtime; baking the palette in would
 * flash the wrong one at anyone who saved a different theme.
 *
 * The render origin — Vite's preload helper resolves a lazy chunk against
 * `document.baseURI`, which during the build is `127.0.0.1:<port>`. Left alone,
 * the game page would ship `<link rel="stylesheet" href="http://127.0.0.1…">`
 * to production and render unstyled for everyone.
 */
const normalise = (html, origin) =>
  html.replace(/<html\b[^>]*>/i, `<html lang="${site.language}">`).replaceAll(`${origin}/`, '/');

async function main() {
  const baseFile = path.join(DIST, 'index.html');
  const shell = await readFile(baseFile, 'utf8');
  const { server, port } = await serve(DIST, shell);
  const origin = `http://127.0.0.1:${port}`;
  const capture = (page) => page.content().then((html) => normalise(html, origin));

  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    server.close();
    console.error(
      '\n  ! Chromium is not installed, so no page can be prerendered.\n' +
        '    Run `pnpm exec playwright install chromium` and try again.\n',
    );
    throw error;
  }
  const routes = Object.keys(site.pages);
  const rendered = new Map();

  try {
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

      // The game page is prerendered in its loading state on purpose: a snapshot
      // of a *finished* board would be replaced by a freshly generated puzzle the
      // moment React mounts, which a visitor would see as a flicker. The skeleton
      // is what a real load shows anyway, so the static file matches it.
      const isGame = route.startsWith('/play/');
      if (isGame) await page.route('**/*worker*.js', (r) => r.abort());

      await page.goto(origin + route, { waitUntil: 'networkidle' });
      await page
        .waitForSelector(isGame ? '.pb-play' : 'main h1', { timeout: 10_000 })
        .catch(() => console.warn(`  ! ${route}: expected markup never appeared`));

      rendered.set(route, await capture(page));
      await page.close();
    }

    // A 404 rendered the same way, so the error page is the real app rather than
    // a hand-written apology that drifts from the design.
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${origin}/this-page-does-not-exist`, { waitUntil: 'networkidle' });
    await page.waitForSelector('main', { timeout: 10_000 });
    const notFound = await capture(page);
    await page.close();

    for (const [route, html] of rendered) {
      const target = route === '/' ? baseFile : path.join(DIST, route, 'index.html');
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, html);
      console.log(`  prerendered ${route.padEnd(14)} → ${path.relative(ROOT, target)}`);
    }
    await writeFile(path.join(DIST, '404.html'), notFound);
    console.log(`  prerendered ${'/404'.padEnd(14)} → apps/web/dist/404.html`);
  } finally {
    await browser.close();
    server.close();
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = Object.entries(site.pages)
    .map(([route, meta]) => {
      const loc = route === '/' ? `${site.url}/` : `${site.url}${route}/`;
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${meta.changeFrequency ?? 'monthly'}</changefreq>`,
        `    <priority>${meta.priority ?? 0.5}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );

  // AI answer engines are named explicitly rather than left to the wildcard:
  // being omitted from the list is how a site stops being quotable. This one has
  // nothing private in it — the whole point is that people read it.
  const agents = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'GPTBot',
    'ClaudeBot',
  ];
  const robots = [
    '# Every page is public and meant to be read, quoted and linked.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /404.html',
    '',
    ...agents.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${site.url}/sitemap.xml`,
    '',
  ].join('\n');

  await writeFile(path.join(DIST, 'robots.txt'), robots);
  console.log(`  wrote robots.txt and sitemap.xml (${Object.keys(site.pages).length} urls)`);
}

await main();
