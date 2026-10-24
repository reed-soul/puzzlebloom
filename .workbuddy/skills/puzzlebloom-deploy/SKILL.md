---
name: puzzlebloom-deploy
description: Ship the PuzzleBloom site to Cloudflare Pages and verify what actually went live. This skill should be used when deploying puzzlebloom, when editing .github/workflows/ci.yml, wrangler.toml or the response headers, or when a deployment shipped bytes that do not match the repo. Covers both paths to production, the checks that must pass first, post-deploy verification, and the four failures that have really happened here.
agent_created: true
---

# PuzzleBloom Deploy

## Overview

A static site on Cloudflare Pages, direct upload: the build happens on a laptop
or in CI and Pages only stores the result. Production is
`https://puzzlebloom.taoliapp.com`, project name `puzzlebloom`, declared in
`wrangler.toml` alongside `pages_build_output_dir`.

Because `wrangler.toml` carries both values, no deploy command needs arguments.
Passing a directory by hand is how a deploy ships something nobody tested.

## Two paths to production

| Trigger | What actually runs |
|---|---|
| Push to `main` | CI `build` job, then a `deploy` job that downloads the `dist` artifact the E2E suite just ran against. It never rebuilds. |
| `pnpm deploy` | `build:seo` → `wrangler pages deploy` → `scripts/indexnow.mjs` |
| `pnpm verify` | The same checks, no upload. Use it to prove a tree is shipable without shipping it. |

Pull requests never deploy. Merging is the only thing that puts bytes in front
of users.

## Before shipping

Run `pnpm verify`: lint, `check:headers`, types, unit tests, `build:seo`.

### The half-built `dist` trap

`build:seo` is two stages: `vite build`, then `node scripts/seo.mjs`, which
prerenders every route with a real browser. When the Playwright binaries are
missing, stage one succeeds and stage two dies — leaving `apps/web/dist` as a
bare SPA shell with no prerendered routes, no `sitemap.xml` and no `robots.txt`.

That directory deploys perfectly well. It also destroys the whole point of this
site, which is real HTML per route. Check before any manual deploy:

```bash
ls apps/web/dist/play/sudoku/index.html   # must exist
```

If it is missing, run `pnpm exec playwright install chromium` and rebuild. Never
deploy a `dist` left behind by a failed `build:seo`.

## After shipping

```bash
bash .workbuddy/skills/puzzlebloom-deploy/scripts/verify-deploy.sh
```

Checks the four routes, real-404 behaviour, trailing-slash internal links, the
response headers, immutable asset caching, and that no localhost URL leaked.
A few seconds. Run it after every manual deploy and after any change to
`ci.yml`.

## Rules that exist because each one broke once

- **`wrangler` is a devDependency.** Do not reach for `npx wrangler@…`. The npx
  form deploys whatever version npm resolved that day, and on 2026-10-24 the
  download was the precise step that failed when the disk filled, taking the
  entire deploy path down with it.
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

## Rolling back

There is no `wrangler pages deployment rollback`. Revert and let CI redeploy:

```bash
git revert <sha> && git push
```

CI rebuilds from the reverted tree and ships it. For an immediate rollback that
cannot wait for a build, use the Pages dashboard's rollback on the previous
deployment — but follow it with the revert anyway, or the next merge
reintroduces the bad state.

## When something looks wrong

Read `references/incidents.md`. It records each failure above with the symptom
it actually produced, because every one of them initially looked like something
else.
