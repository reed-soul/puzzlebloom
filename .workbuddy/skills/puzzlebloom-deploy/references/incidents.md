# Incidents

Failures that actually happened on this project, most likely to recur first.
Each one is recorded with the symptom it produced, because in every case the
symptom pointed somewhere other than the cause.

## 1. A deploy shipped an SPA shell instead of prerendered HTML

**Symptom.** `pnpm deploy` printed `✓ built in 1.28s` and then died with a
Playwright stack trace: `browserType.launch: Executable doesn't exist at
.../chromium_headless_shell-1248/...`.

**Cause.** `build:seo` is two stages. `vite build` produces the SPA shell;
`node scripts/seo.mjs` then prerenders each route with a real browser. The
browser binaries live in `~/Library/Caches/ms-playwright`, which is a cache
directory — clearing disk space clears it. Stage one had already written
`apps/web/dist`, so the directory existed, looked populated, and contained no
`play/sudoku/index.html`, no `sitemap.xml`, no `robots.txt`.

**Why it is dangerous.** Nothing fails loudly at the point of danger. That
`dist` deploys cleanly and serves a working SPA — the site would simply stop
having real HTML per route, which is the entire basis of its SEO work. A
`wrangler pages deploy` typed by hand at that moment ships it silently.

**How to recognise it.** `ls apps/web/dist/play/sudoku/index.html`. If it is
missing, the `dist` is a half-build. `sitemap.xml` should list 4 URLs.

**Fix.** `pnpm exec playwright install chromium`, then rebuild. Never deploy a
`dist` that a failed `build:seo` left behind.

## 2. The disk filled and took the deploy path with it

**Symptom.** `npx --yes wrangler@4` failed with `ENOSPC`. Retrying produced
`创建 SBPL 临时文件失败 … os error 28` — the sandbox could not create temporary
files, so no shell command could run at all, including the ones that would have
freed space.

**Cause.** The data volume was at 100% with 123 MiB free. `npx` downloads the
package before doing anything; it was the first step that needed to write.

**Fix, short term.** A `wrangler` already present on disk needs no download. On
that day `~/code/imgflow/node_modules/.bin/wrangler` (4.136.3, already
authenticated) deployed without touching the network.

**Fix, permanent.** `wrangler` is now a pinned devDependency, so the deploy path
never downloads anything at deploy time. `pnpm store prune` is not a rescue
either — it reclaimed 24 MiB out of a 228 GiB disk.

## 3. The two header configs drifted apart

**Symptom.** None. That is the incident.

**Cause.** `apps/web/public/_headers` (Cloudflare) and `vercel.json` (the
fallback host) describe the same response headers in two dialects.
`Permissions-Policy` differed by `interest-cohort=()`, and only `vercel.json`
sent `X-Frame-Options` — so the fallback was serving a different security
posture than production, and nothing in the repo was positioned to notice.

**How it was found.** By reading the two files side by side while working on
something else. Not by a test, because there was no test.

**Fix.** Both copies now carry the union, and `scripts/check-headers.mjs` (run
from `verify`) parses both dialects, normalises `/(.*)` to `/*`, and fails on
any rule or header the two do not share.

## 4. Every internal link asked a crawler to take a redirect

**Symptom.** None visible in a browser.

**Cause.** Cloudflare Pages answers `/themes` with a 308 to `/themes/`. The
canonical tags, `og:url` and sitemap entries had always used the slash form, but
every `<a href>` omitted it — so each internal link cost a redirect that existed
only because the markup asked for it.

**Fix.** `hrefFor()` in `apps/web/src/app/router.tsx` renders the canonical
form. The router strips the trailing slash again in `read()`, so both spellings
still resolve to the same page; what changed is what the anchor advertises.

**How to re-check.** `scripts/verify-deploy.sh` fails if any internal link on
the home page lacks the slash.
