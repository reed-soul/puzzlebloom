/**
 * Serves `apps/web/dist` the way the static host does, for the end-to-end suite.
 *
 * `vite preview` was the previous choice, and it was the wrong one: preview is
 * an SPA server, so it answers `200` plus the shell for any unknown URL. That is
 * precisely the bug the prerender pass removed, and a test server that cannot
 * reproduce a 404 cannot tell us whether the real host still returns one.
 *
 * So this is thirty lines of `node:http`: files first, `index.html` for a
 * directory, `404.html` with status 404 for everything else. That is Cloudflare
 * Pages, minus TLS.
 */

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps/web/dist');
const PORT = Number(process.env.PORT ?? 4173);

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

const isFile = (candidate) =>
  stat(candidate).then(
    (info) => info.isFile(),
    () => false,
  );

const send = (response, status, file, extra = {}) =>
  readFile(file).then((body) => {
    response.writeHead(status, {
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      ...extra,
    });
    response.end(body);
  });

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://127.0.0.1');
  let target;
  try {
    target = path.join(DIST, decodeURIComponent(pathname));
  } catch {
    return send(response, 400, path.join(DIST, '404.html'));
  }
  // Nothing outside the build directory, however creative the URL is.
  if (!target.startsWith(DIST)) return send(response, 404, path.join(DIST, '404.html'));

  if (await isFile(target)) {
    // A real file.
    return send(response, 200, target);
  }
  // A directory: `/parents/` and `/parents` both land on its index file, which
  // is what the host does after its trailing-slash redirect.
  if (await isFile(path.join(target, 'index.html'))) {
    return send(response, 200, path.join(target, 'index.html'));
  }
  return send(response, 404, path.join(DIST, '404.html'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serving apps/web/dist on http://127.0.0.1:${PORT}`);
});
