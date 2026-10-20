# PuzzleBloom

A small garden of calm puzzle games for children — starting with Sudoku.

Every game here is static files. No accounts, no ads, no chat, no server, no
telemetry. Puzzles are generated on the device the child is holding and never
leave it. The product goal is narrow and deliberate: **be a place where the
answer to "can I play something?" is simply yes.**

**Live: [puzzlebloom.taoliapp.com](https://puzzlebloom.taoliapp.com)**

![The garden](docs/screenshots/garden.png)

---

## Why this exists

Most games built for children are built to be returned to — a streak to protect,
a chest to open, a friend's score to beat. Those mechanics work, which is the
problem: they teach a child to keep playing rather than to finish.

A puzzle has the opposite shape. It ends, it is satisfying at the moment it is
solved, and then there is nothing left to collect. Everything in this repo
follows from that.

The other half is art direction. Cartoon creatures are not decoration here —
they are the accessibility feature. Nine numerals are nine abstract squiggles to
a five-year-old; nine faces with their own ears and horns are nine *characters*.
The same board can be played with either.

| Numerals | Creatures | Hints that explain |
| --- | --- | --- |
| ![Numbers](docs/screenshots/sudoku-numbers.png) | ![Creatures](docs/screenshots/sudoku-creatures.png) | ![Hint](docs/screenshots/sudoku-hint.png) |

---

## What is in the box

```
puzzlebloom/
├─ apps/web/                  the site: router, pages, theme provider, styles
├─ games/sudoku/              the first game (React)
├─ packages/
│  ├─ sudoku-engine/          generator, solver, logical grading, teaching hints
│  ├─ theme-core/             theme model, built-in moods, contrast guard, share links
│  └─ ui/                     locked icon set, buttons, segmented control, creature glyphs
├─ e2e/                       Playwright: the seams the unit tests cannot reach
├─ docs/                      spec, ADRs, screenshots
├─ wrangler.toml              the Cloudflare Pages project (the live host)
└─ vercel.json                the fallback host's config; Cloudflare reads
                              public/_headers natively
```

pnpm workspaces. No bundler plugins beyond React, no CSS framework, no state
library, no router dependency — the router is 90 lines in
`apps/web/src/app/router.tsx`.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm lint         # biome: lint and format, one tool, no plugin zoo
pnpm typecheck    # tsc --noEmit across the app, the packages and the e2e specs
pnpm test         # 189 engine tests + 42 palette guards
pnpm test:e2e     # Playwright, against the production build
pnpm verify       # all of the above, in the order CI runs them
```

Node 22.12+ (`.nvmrc`; Node 20 reached end of life in April 2026). The pnpm
version is pinned in `package.json`, so a laptop and CI use the same binary.

Playwright does not test the dev server. It builds, serves `dist` through
`vite preview`, and drives that — because the CSP, the worker chunk and the font
preloads only exist after a build, and those are half of what it is checking.

## How it is put together

**The engine is the only thing worth trusting.** `packages/sudoku-engine` is a
port of [HeyPuter/everything's Sudoku](https://github.com/HeyPuter/everything/tree/main/src/sudoku)
(MIT — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)), kept verbatim
except for types. It guarantees two things the UI leans on:

- every puzzle has **exactly one** solution;
- every puzzle is solvable by **logic alone**, using the eleven techniques in
  `techniques.js` — which is why the hint button always has something true to
  say, and never has to read the answer key.

Generation runs in a Web Worker; Expert grids take a few hundred milliseconds
and would otherwise freeze the tab.

**Themes are ten colours and nothing else.** Every tint, border and cell state
is a `color-mix()` of those ten, computed in CSS. That is why a theme a child
makes in the studio still looks designed rather than assembled — and why adding
a mood costs twelve lines.

Three of the ten exist because one colour cannot do three jobs:

| role | job | constraint |
| --- | --- | --- |
| `brand` | links, focus rings, the selected cell | 4.5:1 as text, so its chroma is capped |
| `accent` | the loud colour: primary button, sun, bands | allowed to own ~26% of the screen |
| `sky` | the wide decorative wash behind everything | no text on it, so its chroma is uncapped |

`accentInk` is the fourth and the one that unlocks the rest: a bright fill can
only carry a label if the label is allowed to be dark, and that pairing is
measured (9.7:1 on Meadow) rather than guessed. `deriveAccentInk()` computes it,
so the studio never asks a child to pick it.

The reasoning, the measurements and what is still unbuilt are in
[DESIGN-REVIEW-v0.2.md](docs/DESIGN-REVIEW-v0.2.md).

![Theme studio](docs/screenshots/theme-studio.png)

Themes are stored in `localStorage` and can be shared as a link: the whole
palette is packed into `?theme=` as base64url, validated on arrival. No backend.

**Nothing is fetched from anyone else.** Baloo 2 and Nunito are self-hosted as
four `woff2` variable subsets — 135 kB in total, 71 kB on first paint — with
`font-display: swap` and a preload for the two Latin faces. With no CDN, no font
host and no analytics, the CSP is `'self'` for scripts, styles and fonts: there
is no third party left to allow. `e2e/garden.spec.ts` fails if a single request
leaves the origin.

**Dark moods get their own cell tints.** Mixing 7% white into a dark surface is
invisible, so `:root[data-mood='dark']` raises the fill. See
[tokens.css](packages/theme-core/src/tokens.css).

## Accessibility

- Full keyboard play: tab onto the board, arrows move, `1–9` place, `Backspace`
  clears, `N` notes, `H` hint, `⌘/Ctrl+Z` undo.
- Every cell announces its row, column and contents; the board is a real
  `role="grid"` of buttons.
- The theme studio measures WCAG contrast for eight pairs and offers a one-tap
  repair instead of letting pale text through. A palette that regresses fails
  the build — 42 assertions guard chroma, contrast and the share-link format.
- Motion is never the only signal: a finished row also changes the cells, a
  wrong digit is announced by `aria-live`, and everything above collapses under
  `prefers-reduced-motion`.
- Creatures carry their identity in silhouette, not only in colour, so they
  survive colour blindness and greyscale.
- Route changes and theme changes use the View Transitions API, gated on
  `prefers-reduced-motion`.

## Adding a game

1. Create `games/<id>/` with a package that exports a manifest and a component.
2. Add the manifest to `apps/web/src/games/registry.ts`.
3. Add one route in `apps/web/src/App.tsx` (lazy import).

The landing page, the "growing" shelf and styling all follow automatically.
Keep the game's manifest out of the package index if the game is heavy — that
mistake pulls the whole game into the first paint (there is a comment about it
in `registry.ts`).

## Deploying

The build is ~400 kB of static files: any host that serves files works. It runs
on **Cloudflare Pages**, because the repo already speaks its dialect —
`apps/web/public/_headers` (the CSP, immutable caching) is read as-is — and
because a static bundle has no traffic to meter. The reasoning, with both
vendors' 2026 quotas side by side, is in
[ADR-005](docs/adr/ADR-005-deploy-target.md).

**Direct upload** — what the live site does. The build happens locally or in CI
and Pages only stores the result, so there is no build environment to configure:

```bash
pnpm deploy          # build:seo + wrangler pages deploy + IndexNow ping
```

**Git integration** — connect the repo in the dashboard instead, and Pages
builds on every push:

| Setting | Value |
| --- | --- |
| Build command | `pnpm run build:seo` |
| Build output directory | `apps/web/dist` |
| Root directory | leave at `/` (the pnpm filter builds the workspace) |
| Environment variable | `PNPM_VERSION=12.4.2` |

Node comes from `.nvmrc`. The `PNPM_VERSION` line is not optional *in this
path*: the v3 build image ships pnpm 10.11.1 and does not read `packageManager`
from `package.json`, so without it the install runs on a pnpm older than the
lockfile expects.

**The custom domain** is one CNAME, because the zone lives at Aliyun DNS rather
than at Cloudflare:

```
puzzlebloom   CNAME   puzzlebloom.pages.dev    (DNS only, no proxy)
```

…plus the same hostname added to the Pages project, which is what issues the
certificate. Any other host works the same way.

**Vercel** — import the repo; `vercel.json` already sets the build command,
output directory, cache headers and CSP. It stays supported, but
it is the fallback: free Hobby is capped at 100 GB of transfer and 1M requests a
month, and when it hits the cap the project **pauses** until the window resets.
Hobby is also licensed for non-commercial use only.

**GitHub Pages** does not fit: it serves no custom headers, so the CSP would
have to move into a `<meta>` tag and lose `frame-ancestors`.

## Search engines

The live site is registered with both engines that matter, and the parts that
can live in the repository do:

| | |
| --- | --- |
| Google Search Console | property `https://puzzlebloom.taoliapp.com/`, verified by DNS, `sitemap.xml` submitted |
| Bing Webmaster Tools | verification meta tag in `apps/web/index.html`, sitemap submitted |
| IndexNow | key at `apps/web/public/<key>.txt`; `pnpm indexnow` pings Bing and friends after every deploy |

Everything else — title, description, canonical, Open Graph, JSON-LD, the
sitemap, the 404 page — is generated, not typed twice:

```
apps/web/site.json          one table: url, name, and title/description/priority per route
  ├── src/app/head.ts       applies it at run time, on every client-side navigation
  └── scripts/seo.mjs       renders each route in a browser after the build and
                            writes dist/<route>/index.html, plus sitemap.xml,
                            robots.txt and 404.html
```

The prerender is why a crawler that does not run JavaScript still sees four
different documents rather than four copies of a shell — and why `/no-such-page`
can answer a real `404` instead of `200` with the app inside it. Edit
`site.json`, not the HTML.

Two related scripts run on demand:

```bash
node scripts/og.mjs       # redraws apps/web/public/og.png (1200×630) in the site's own type
pnpm indexnow             # re-ping Bing after a content change
```

The reasoning — prerender instead of a meta-framework, one table instead of
three, a real 404 — is in [ADR-006](docs/adr/ADR-006-seo.md).

## Status

| | |
| --- | --- |
| Sudoku | shipped — 4 levels, daily puzzle, hints that explain, creatures mode |
| Nonogram | in the greenhouse |
| Memory Garden | in the greenhouse |
| Tangram | in the greenhouse |

## Licence

MIT. The Sudoku engine is MIT, copyright the HeyPuter/everything contributors;
that attribution lives in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
must stay if you fork this.

Built by a parent, for one small person and everyone like her.
