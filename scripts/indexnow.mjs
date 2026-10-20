/**
 * Tells IndexNow — and therefore Bing — that the site changed.
 *
 * Bing's crawler is not slow, it is *scheduled*, and a site this small is not on
 * a schedule worth waiting for. IndexNow inverts the arrangement: a POST with the
 * URLs gets them queued in minutes. Submission also feeds Yandex, Naver and
 * Seznam, which share the protocol.
 *
 * Google does not participate. There the equivalent is the sitemap in Search
 * Console, which is why both exist.
 *
 * The key is not a secret — it is public by design, served from
 * `/<key>.txt` so the receiver can confirm that whoever posted the URLs
 * controls the host.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'apps/web/public');
const site = JSON.parse(await readFile(path.join(ROOT, 'apps/web/site.json'), 'utf8'));

const keyFile = (await readdir(PUBLIC)).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) {
  console.error('  ! no IndexNow key file in apps/web/public — expected a 32-character hex name');
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, '');
const keyLocation = `${site.url}/${keyFile}`;

const urls = Object.keys(site.pages).map((route) =>
  route === '/' ? `${site.url}/` : `${site.url}${route}/`,
);

/**
 * The receiver fetches the key before it accepts anything, so posting before the
 * deployment is live means a 403 and a wasted run. Cloudflare needs a few
 * seconds to publish; this waits for the file rather than sleeping blindly.
 */
async function keyIsLive() {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const response = await fetch(keyLocation, { cache: 'no-store' });
      if (response.ok && (await response.text()).trim() === key) return true;
    } catch {
      // Network hiccup or the deployment is mid-flight; try again.
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
}

if (!(await keyIsLive())) {
  console.error(`  ! ${keyLocation} does not serve the key yet. Deploy first, then run this again.`);
  process.exit(1);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site.url).host, key, keyLocation, urlList: urls }),
});

// 200 is "accepted", 202 is "accepted, key still being validated". Everything
// else is a real problem and should break the deploy rather than pass quietly.
if (response.status !== 200 && response.status !== 202) {
  console.error(`  ! IndexNow answered ${response.status}: ${await response.text()}`);
  process.exit(1);
}

console.log(`  IndexNow accepted ${urls.length} urls (HTTP ${response.status})`);
