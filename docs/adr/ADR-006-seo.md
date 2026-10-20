# ADR-006 — Search discoverability: prerender, one table, a real 404

- **Status:** accepted
- **Date:** 2026-10-21
- **Context:** the site is a three-route single-page app on a static host, and it
  had no SEO layer at all: one `<title>`, no canonical, no sitemap, no structured
  data, and a `_redirects` rule that answered every unknown URL with `200` and
  the app shell.

## The problem, stated precisely

A single-page app presents *one* HTML document to a crawler, whichever route was
asked for. Everything that distinguishes the pages — title, description,
canonical, structured data — would be applied by JavaScript after the fetch.
Google will execute that JavaScript; Bing largely will not, and the social
unfurlers behind every pasted link certainly will not. So without a build step,
three of the four routes are, to most of the web, the same page with different
URLs. That is the definition of a duplicate-content problem, and it also means
the site cannot answer `404`, because a catch-all rewrite makes every URL a hit.

## Decision

**Prerender each route after the build, from one table.**

`apps/web/site.json` holds the URL, name and per-route title, description,
`changefreq` and `priority`. Two consumers read it and nothing else:

```
site.json
  ├── src/app/head.ts   runs in the browser; rewrites the head on every
  │                     client-side navigation, so tab title and URL agree
  └── scripts/seo.mjs   runs after `vite build`; opens each route in Chromium,
                        captures the final DOM, and writes it to
                        dist/<route>/index.html, plus sitemap.xml, robots.txt
                        and 404.html
```

The captured HTML is a normal document with the app's markup already inside it.
React still boots on top and replaces it — no hydration, no mismatch, no
hydration-mismatch bugs to debug — so the visitor experience is unchanged while
a crawler that never runs a script gets a complete page.

**Delete the SPA catch-all.** With every real route now a file, `/*  /index.html
200` was doing nothing except converting 404s into 200s. Cloudflare Pages has
built-in support for a root `404.html` and serves it with a `404` status, so the
file is generated and `_redirects` is gone. Deep links still work: `/parents`
308s to `/parents/`, which is the generated directory index.

**Say only what is true in structured data.** The `@graph` carries `WebSite`,
`WebApplication` (`GameApplication`, `isAccessibleForFree`, an offer at price
zero) and a per-route `WebPage`. There is no `aggregateRating`, no `review`, no
`FAQPage`: inventing those for a site with no ratings and no FAQ is how small
sites earn manual actions. The 404 page emits no JSON-LD at all, and no
canonical — pointing at itself would invite the engine to index the misspelling,
pointing at the home page would be a lie about what the visitor is looking at.

## Why not a meta-framework

Astro, Next, SvelteKit and TanStack Start all solve this properly, and any of
them would have been defensible. They were rejected on proportion: this is three
routes, no server, no per-user content, and no data fetching at build time. A
framework would add a second build system, its own routing model, and an adapter
for the host — to produce exactly the four HTML files the ninety-line script
already produces. The script also has a property a framework does not: it renders
the *real* app, with the *real* CSS and the *real* fonts, so the static file and
the live page cannot drift.

If a fourth route needs data from an API at request time, this decision should be
revisited rather than extended.

## Why both consoles, and what lives where

Google Search Console and Bing Webmaster Tools overlap less than they appear to:
Bing powers DuckDuckGo and (in China-facing contexts) is often the only western
engine that crawls promptly, while Google is the traffic. Both were registered.

Verification went where it survives:

- **Google** — the property verified itself through DNS, because the apex zone
  already carried a Google verification record for a sibling host.
- **Bing** — an `msvalidate.01` meta tag lives in `apps/web/index.html`, in
  version control, rather than in a dashboard upload. It is one line and cannot
  be lost in a rebuild.

**IndexNow** is the part that actually moves the needle for a site this small.
Bing's crawler is not slow, it is *scheduled*, and a new subdomain is not on a
schedule worth waiting for. `scripts/indexnow.mjs` posts the four URLs to
`api.indexnow.org` after each deploy — verified first, because the endpoint
fetches the key file and 403s if the deployment is not live yet. Submission also
covers Yandex, Naver and Seznam, which share the protocol. Google does not
participate; there the sitemap in Search Console is the equivalent.

## Consequences

- A deploy now needs a browser. `pnpm run deploy` is `build:seo && wrangler &&
  indexnow`, and `build:seo` fails loudly with an install hint if Chromium is
  missing. CI installs Playwright *before* the build step for this reason.
- The end-to-end suite runs against `scripts/serve-dist.mjs` rather than
  `vite preview`, because preview cannot answer a 404 and a test server that
  cannot produce the failure mode cannot verify its absence.
- `apps/web/dist/index.html` is ~54 kB instead of 1.7 kB. It gzips to a fraction
  of that, it is served from the edge, and it is the price of being readable
  without JavaScript.
- A new route means three edits in one file (`site.json`) and nothing else. The
  sitemap, the prerendered file, the head and the JSON-LD all follow.
- Tests in `e2e/seo.spec.ts` assert the whole chain with **JavaScript disabled**,
  which is the only honest way to check a prerender: title, canonical, robots,
  `og:image`, exactly one `h1`, a single JSON-LD block with no invented rating,
  a `404` status for unknown URLs, and every sitemap URL answering `200` with a
  canonical that matches its own `<loc>`.
