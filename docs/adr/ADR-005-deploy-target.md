# ADR-005 — Cloudflare Pages is the deploy target; Vercel stays as the fallback

**Status:** Accepted · 2026-10-21
**Supersedes:** nothing · **Relates to:** [ADR-001](ADR-001-static-monorepo.md), [ADR-008](ADR-008-wrangler-remains-deployer.md)

## Background

The build is 400 kB of static files: an HTML shell, three JS chunks, two CSS
files, four fonts. Nothing runs on a server. "Which host" is therefore not a
question about capability — every host on the list can serve this — but about
**what happens on the day it gets shared further than expected**.

The repo arrived with both configs. `apps/web/public/_headers` is Cloudflare's
native dialect; `vercel.json` restates the same three rules — immutable
`/assets` + `/fonts`, the CSP, the security headers — in Vercel's. Only
`vercel.json` was wired to a CLI, so Vercel had become the implicit default
without anyone deciding it.

Measured in October 2026, from both vendors' own docs:

|                     | Vercel Hobby                                   | Cloudflare Pages Free          |
| ------------------- | ---------------------------------------------- | ------------------------------ |
| Transfer            | 100 GB/month, hard cap                         | **unlimited**                  |
| Requests            | 1M CDN requests/month                          | **unlimited static requests**  |
| When over           | the project **pauses** until the window resets | n/a                            |
| Builds              | 100 deployments/day, **1 concurrent**          | 500 builds/month, 1 concurrent |
| Structural caps     | 200 projects, 50 domains/project               | 20,000 files/site, 25 MiB/file |
| Licence             | **non-commercial personal use only**           | no such clause                 |
| Custom domain + TLS | free                                           | free                           |
| Native config       | `vercel.json` (restatement)                    | `_headers` (already in repo)   |

Two of those rows decide it. A traffic spike on Vercel does not cost money, it
turns the site **off** for up to 30 days — for a link a parent might paste into
a class group chat, "the site is down until the 1st" is the worst failure mode
available. And Hobby's non-commercial clause means the day this project accepts
a sponsor or runs an ad, it needs Pro at $20/month.

## Decision

**Cloudflare Pages is the primary target.** `vercel.json` stays in the repo as
a supported alternative — it costs nothing to keep and keeps the Vercel path
honest — but the README leads with Cloudflare and the recommended flow is the
dashboard's git integration, not a CLI.Two build settings are load-bearing:
- `PNPM_VERSION=12.15.0` — the v3 build image ships pnpm 10.11.1 and, per its own
  limitations list, does **not** read `packageManager` from `package.json`. Left
  unset, the install runs on an older pnpm than the lockfile was written by.
- Node comes from `.nvmrc` (26.12.1); with the image's default a major behind,
  this pin is load-bearing, not cosmetic.

## Consequences

**Good.** No traffic ceiling and no invoice, which is the correct shape for a
static bundle — bandwidth costs Cloudflare approximately nothing and the free
tier says so. The CSP already lives in `_headers`, so the security posture
survives the move without translation. Workers are there at 100k requests/day
free if a game ever needs a function.

**Neutral.** 500 builds/month against a project that deploys a handful of times
a week. One concurrent build on both platforms. No preview bot comments on PRs
(the Vercel integration has that; Cloudflare's preview URLs do not).

**Accepted cost.** Cloudflare's dashboard is plainer, and its build logs are
less good than Vercel's. Diagnosing a failed build is slower here. That is a
cost paid by whoever pushes, not by whoever visits.

**Out of scope, but recorded.** `*.pages.dev` and `*.vercel.app` are both
unreliable from mainland China, which is where this project's actual readers
live. Neither free subdomain is a delivery plan; a custom domain is the
minimum, and hosting the origin inside the mainland would need ICP filing. This
ADR picks between two free hosts, not between "reachable" and "not".

**Not chosen.** GitHub Pages: the repo is public now so it qualifies, but it
serves no custom headers, so the CSP would have to move into a `<meta>` tag and
lose `frame-ancestors`. Netlify: its free tier moved to a 300-credit model in
2025 and has no advantage here.

## Deployment record — 2026-10-21

Landed the same day, and one detail turned out differently from the paragraph
above: the first deploy was **direct upload**, not git integration.

```
pnpm deploy                       # build + wrangler pages deploy
→ puzzlebloom.pages.dev           (production, branch main)

puzzlebloom.taoliapp.com  CNAME  puzzlebloom.pages.dev
```

The zone stays at Aliyun DNS — it carries mail, an apex host and four other
apps, so moving nameservers to Cloudflare would be a much larger change than
this decision needs. A CNAME plus the hostname registered on the Pages project
is sufficient; Cloudflare issues the certificate for the custom hostname even
though the zone is elsewhere.

Direct upload also means `PNPM_VERSION` is moot for now: no build runs on
Cloudflare's image. The setting stays documented because the moment someone
connects the repo for push-to-deploy, it becomes load-bearing again.

Verified live: `/` and a deep SPA route (`/play/sudoku`) both return 200 HTML,
the CSP arrives as written in `_headers`, and fonts carry the immutable cache
header. `Strict-Transport-Security` was added at the same time, without
`includeSubDomains` — the parent domain also carries mail and other apps, and
pinning those to HTTPS is not this host's call.
