---

name: puzzlebloom-build-deploy
description: Build the PuzzleBloom site and ship it to Cloudflare Pages. Use when building, prerendering or debugging the artifact, when adding a page or route, when editing site.json, response headers, wrangler.toml or .github/workflows/ci.yml, when deploying, or when production is serving something the repo does not explain. Covers what `build:seo` must produce, the two paths to production, and the failures that have really happened here.
agent_created: true
---

# PuzzleBloom: build and deploy

## The shape of it

A static site on Cloudflare Pages, direct upload: the build happens on a laptop
or in CI and Pages only stores the result. Production is
`https://puzzlebloom.taoliapp.com`, project `puzzlebloom`, declared in
`wrangler.toml` alongside `pages_build_output_dir`. Because both live there, no
deploy command needs arguments — passing a directory by hand is how a deploy
ships something nobody tested.

## The chain

| Command          | What it does                                       | When                              |
| ---------------- | -------------------------------------------------- | --------------------------------- |
| `pnpm dev`       | Vite dev server, SPA, nothing prerendered          | changing UI                       |
| `pnpm build`     | `vite build` only — `dist` is a bare SPA shell     | never deploy this                 |
| `pnpm build:seo` | build → prerender every route → check the artifact | before anything ships             |
| `pnpm verify`    | lint, headers, types, unit tests, `build:seo`      | before committing something risky |
| `pnpm test:e2e`  | `build:seo`, then Playwright against `dist`        | routing or layout changes         |
| `pnpm test:live` | the same suite against production (`PB_BASE_URL`)  | after a deploy                    |
| `pnpm deploy`    | `build:seo` → `wrangler pages deploy` → IndexNow   | manual ship                       |

### What `build:seo` must produce

`vite build` writes one shell. `scripts/seo.mjs` then renders each route in a
real browser and writes it back as a static file, because a single-page app
shows a crawler one document no matter which URL was requested. Obligations:

| Path                           | Why it has to exist                                     |
| ------------------------------ | ------------------------------------------------------- |
| `dist/<route>/index.html`      | real HTML per route, title and JSON-LD already inside   |
| `dist/404.html`                | unknown URLs answer 404 instead of the shell with a 200 |
| `dist/sitemap.xml`             | one `<loc>` per route, trailing-slash form              |
| `dist/robots.txt`              | explicit `Allow` for AI crawlers, `Disallow: /404.html` |
| `dist/_headers`, `dist/og.png` | copied from `public/`; absent means no headers, no card |

### The artifact gate

`scripts/check-artifact.mjs` runs at the end of `build:seo` and will not let a
broken `dist` exist. It compares the directory against `site.json`: every route
has its own document with its own title, canonical and JSON-LD; exactly one
`<h1>`; a 404 that is noindex and carries no canonical; a sitemap listing every
route; no `127.0.0.1`; a clean `<html lang>`.

This exists because the failure it catches is silent. When the prerender dies,
`vite build` has already left a populated `dist` that uploads without complaint
and quietly serves one document for every URL — the exact thing the whole build
exists to prevent. Do not bypass the gate. If it fails, the build is incomplete,
not the check.

`DIST=/some/other/dir node scripts/check-artifact.mjs` points it elsewhere,
which is how it was tested against a deliberately broken copy.

## Adding a page

`site.json` is the only list of routes. The prerender, the sitemap and the head
all derive from `Object.keys(site.pages)`, so a page exists by being in that
table. Four edits, no build configuration:
1. `apps/web/site.json` — the pages entry. Title ≤ 62 characters, description
   ≤ 160, plus `changeFrequency` and `priority`.
2. `apps/web/src/App.tsx` — add the path to `known` and a branch to the page
   chain. `known` is what decides 404 versus indexable.
3. `e2e/seo.spec.ts` — the `ROUTES` table: path with its trailing slash, title,
   canonical, and the `<h1>` the page renders.
4. `apps/web/src/shell/Nav.tsx` — only if it belongs in the navigation.

Then `pnpm verify`. Nothing else is needed: `seo.mjs` iterates the table, so the
page is prerendered and enters the sitemap by existing.

Skipping step 1 fails in the one direction that is hard to notice. Dev keeps
working, because the Vite server answers any path with the shell; production
404s, because no file was written for it. Skipping step 2 is the reverse: a
prerendered file whose React tree resolves to `NotFound`.

## The OG image

`node scripts/og.mjs` redraws `apps/web/public/og.png` — 1200×630, using the
site's own typefaces and palette. Re-run it when the wordmark, the tagline or
the default theme changes. It is not part of `build:seo`: the PNG is a source
asset and is committed, so a normal build never needs a browser for it.

## Looking at the real thing locally

`pnpm preview` is `vite preview`, which answers every unknown URL with the shell
and a 200 — it cannot show you a 404, which is half of what this build produces.
For the host's actual behaviour:

```bash
PORT=4173 node scripts/serve-dist.mjs
```

That is the same server the E2E suite runs against: files first, `404.html` with
status 404 for everything else.

## Shipping

The default branch is `master`. Two ways in, and only one of them is automatic:

| Trigger          | What actually runs                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Push to `master` | CI `build`, then a `deploy` job that downloads the `dist` artifact the E2E suite just ran against. It never rebuilds. |
| `pnpm deploy`    | `build:seo` → `wrangler pages deploy` → `scripts/indexnow.mjs`                                                        |

Pull requests never deploy. Merging is the only thing that puts bytes in front
of users. Deploys are serialised and not cancellable: a half-uploaded deployment
is worse than a queued one.

### The branch name is load-bearing in three places

Renaming it is not a `git branch -m`. Cloudflare's `production_branch` must
equal the default branch, and if it does not, nothing fails: `wrangler` uploads,
the deploy reports success, and the deployment lands as a **preview**. The
custom domain keeps serving the previous bytes while CI goes green.

Three places move together, and the third one is this file:
- `.github/workflows/ci.yml` — `on.push.branches` **and** both
  `github.ref == 'refs/heads/…'` comparisons (the artifact upload and the deploy
  job guard).
- The Pages project's `production_branch` (dashboard, or `PATCH` on
  `/accounts/:id/pages/projects/puzzlebloom`).
- The table above.

## Rules that exist because each one broke once

- **`wrangler` is a devDependency.** Do not reach for `npx wrangler@…`. The npx
  form deploys whatever version npm resolved that day, and on 2026-10-24 the
  download was the precise step that failed when the disk filled, taking the
  whole deploy path down with it.
- **Do not migrate the deploy to `cf`.** `cf pages deploy` exists, but for a
  legacy Pages project its handler contains no upload code at all — it prints
  guidance and exits 1. See `docs/adr/ADR-008-wrangler-remains-deployer.md`.
- **`_headers` and `vercel.json` change together.** They describe the same
  response headers in two dialects, for two hosts. `pnpm run check:headers`
  fails the build when they drift; it caught a real drift that had gone
  unnoticed for weeks.
- **Internal links carry a trailing slash.** Cloudflare Pages 308s `/themes` to
  `/themes/`, and canonical tags plus the sitemap already used the slash form.
  `hrefFor()` in `apps/web/src/app/router.tsx` keeps anchors consistent with it.

## After shipping

```bash
bash .workbuddy/skills/puzzlebloom-build-deploy/scripts/verify-deploy.sh
```

Sixteen checks against the live host: every route from `site.json`, a real 404,
trailing-slash links, the security headers, immutable assets, the sitemap, and
no leaked localhost. A few seconds. Run it after every manual deploy and after
any change to `ci.yml`.

## Rolling back

There is no `wrangler pages deployment rollback`. Revert and let CI redeploy:

```bash
git revert <sha> && git push
```

For an immediate rollback that cannot wait for a build, use the Pages dashboard
on the previous deployment — but follow it with the revert anyway, or the next
merge reintroduces the bad state.

## When something looks wrong

Read `references/incidents.md`. Each failure is recorded with the symptom it
actually produced, because in every case the symptom pointed somewhere other
than the cause.
