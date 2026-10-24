/**
 * Refuse to call the build finished when the artifact is incomplete.
 *
 * `build:seo` is two stages: `vite build` writes an SPA shell, then
 * `scripts/seo.mjs` prerenders each route with a real browser and writes the
 * sitemap. When stage two dies — no Chromium, a crashed page, a killed CI job —
 * stage one has already left a `dist` that is populated, deploys without
 * complaint, and silently serves one HTML document for every URL.
 *
 * That failure has happened here once already. It was caught by a person
 * remembering to `ls` a file, which is not a mechanism. This runs at the end of
 * `build:seo`, so a `dist` that would lose the prerender cannot be produced,
 * let alone shipped.
 *
 * It checks the artifact against `site.json` rather than against a list kept
 * here, for the same reason the sitemap does: a second list of routes is a
 * second thing to forget.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.DIST ?? path.join(ROOT, 'apps/web/dist');
const site = JSON.parse(await readFile(path.join(ROOT, 'apps/web/site.json'), 'utf8'));

/** Routes as the server will see them: everything but the root ends in a slash. */
const slugOf = (route) => (route === '/' ? '' : route.replace(/\/+$/, ''));
const canonicalOf = (route) => `${site.url}${slugOf(route)}/`;

let failures = 0;
const ok = (message) => console.log(`  ok    ${message}`);
const bad = (message) => {
  failures += 1;
  console.log(`  FAIL  ${message}`);
};

const read = (file) => readFile(file, 'utf8');
const exists = (file) => existsSync(file);

/**
 * React escapes only `&`, `<` and `>` when it serialises text, but the title
 * comes from `document.title` through a round trip, so normalise the common
 * entities before comparing. A mismatch here is the point of the check: the
 * title in the file must be the one `site.json` asked for.
 */
const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

console.log(`Checking ${path.relative(ROOT, DIST)}`);

console.log('\nPer-route documents');
if (!exists(path.join(DIST, 'index.html'))) {
  bad('index.html is missing — vite build did not run');
}

const routes = Object.keys(site.pages);
const seenTitles = new Set();

for (const route of routes) {
  const file = path.join(DIST, route === '/' ? 'index.html' : `${slugOf(route)}/index.html`);
  const where = path.relative(DIST, file);

  if (!exists(file)) {
    bad(`${where} is missing — this route was never prerendered`);
    continue;
  }

  const html = await read(file);
  const expected = site.pages[route];

  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  if (title !== decode(expected.title)) {
    bad(`${where} title is "${title}", site.json says "${expected.title}"`);
  } else if (seenTitles.has(title)) {
    bad(`${where} shares its title with another route — the prerender served one document for both`);
  } else {
    seenTitles.add(title);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== canonicalOf(route)) {
    bad(`${where} canonical is "${canonical ?? '(none)'}", want "${canonicalOf(route)}"`);
  }

  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    bad(`${where} has no description`);
  }
  if (!/name="robots" content="index, follow"/.test(html)) {
    bad(`${where} is not marked indexable`);
  }
  if (!html.includes('pb-structured-data')) {
    bad(`${where} carries no JSON-LD block`);
  }
  if (html.match(/<h1[\s>]/g)?.length !== 1) {
    bad(`${where} has ${html.match(/<h1[\s>]/g)?.length ?? 0} <h1> elements, want exactly 1`);
  }
}

console.log('\n404 document');
if (!exists(path.join(DIST, '404.html'))) {
  bad('404.html is missing — Pages would answer unknown URLs with the shell and a 200');
} else {
  const html = await read(path.join(DIST, '404.html'));
  if (!/name="robots" content="noindex, follow"/.test(html)) {
    bad('404.html is not marked noindex');
  }
  if (html.includes('rel="canonical"')) {
    bad('404.html names a canonical URL — this is how a misspelling gets indexed');
  }
  if (html.includes('pb-structured-data')) {
    bad('404.html emits structured data for a page that does not exist');
  }
}

console.log('\nSitemap and robots');
const sitemapFile = path.join(DIST, 'sitemap.xml');
if (!exists(sitemapFile)) {
  bad('sitemap.xml is missing');
} else {
  const sitemap = await read(sitemapFile);
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const wanted = routes.map(canonicalOf);
  const missing = wanted.filter((url) => !locs.includes(url));
  if (missing.length > 0) {
    bad(`sitemap is missing ${missing.join(', ')}`);
  } else if (locs.length !== wanted.length) {
    bad(`sitemap lists ${locs.length} URLs, site.json has ${wanted.length}`);
  } else {
    ok(`sitemap lists all ${wanted.length} routes`);
  }
  const bare = locs.filter((loc) => !loc.endsWith('/'));
  if (bare.length > 0) bad(`sitemap URLs without a trailing slash: ${bare.join(', ')}`);
}

const robotsFile = path.join(DIST, 'robots.txt');
if (!exists(robotsFile)) {
  bad('robots.txt is missing');
} else {
  const robots = await read(robotsFile);
  if (!robots.includes(`Sitemap: ${site.url}/sitemap.xml`)) bad('robots.txt names no sitemap');
  if (!robots.includes('Disallow: /404.html')) bad('robots.txt does not disallow /404.html');
}

console.log('\nFiles that are not HTML');
for (const [file, why] of [
  ['_headers', 'the response headers would silently not exist'],
  ['og.png', 'link previews would 404'],
  ['favicon.svg', 'the icon would 404'],
]) {
  if (!exists(path.join(DIST, file))) bad(`${file} is missing — ${why}`);
}

const og = path.join(DIST, 'og.png');
if (exists(og) && (await stat(og)).size < 10_000) {
  bad('og.png is under 10 KB — probably a placeholder, not the rendered card');
}

console.log('\nNothing from the build machine');
const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }),
  );
  return nested.flat();
};

const files = exists(DIST) ? await walk(DIST) : [];
const textFiles = files.filter((file) => /\.(html|css|js)$/.test(file));
const leaks = [];
for (const file of textFiles) {
  const body = await read(file);
  if (body.includes('127.0.0.1') || body.includes('localhost')) {
    leaks.push(path.relative(DIST, file));
  }
}
if (leaks.length > 0) {
  bad(`localhost references in ${leaks.join(', ')} — Vite resolved a lazy chunk against the render origin`);
} else {
  ok(`no localhost in ${textFiles.length} text assets`);
}

// `<html>` must arrive clean. The prerenderer re-writes the tag because the
// theme is applied to it at runtime; a baked `style` or `data-theme` would
// flash one visitor's palette at everybody else.
const home = exists(path.join(DIST, 'index.html')) ? await read(path.join(DIST, 'index.html')) : '';
const htmlTag = home.match(/<html[^>]*>/)?.[0] ?? '';
if (htmlTag !== `<html lang="${site.language}">`) {
  bad(`root <html> tag is ${htmlTag || '(missing)'}, want <html lang="${site.language}">`);
}

console.log('');
if (failures === 0) {
  console.log(`PASS — ${routes.length} routes, artifact is complete`);
  process.exit(0);
}
console.log(`FAIL — ${failures} problem(s); do not deploy this directory`);
process.exit(1);
