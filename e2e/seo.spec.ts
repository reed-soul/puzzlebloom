import { type APIRequestContext, expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * SEO, verified rather than assumed.
 *
 * Everything here is produced by `scripts/seo.mjs` from `apps/web/site.json`,
 * and everything here breaks silently: a wrong canonical or a missing JSON-LD
 * block produces a page that looks perfect and ranks for nothing. Configuring
 * Search Console is a one-off action; these assertions are what keep the
 * configuration true six months from now.
 */

const ROUTES = [
  {
    path: '/',
    title: 'PuzzleBloom — calm puzzle games for kids, no ads, no accounts',
    canonical: 'https://puzzlebloom.taoliapp.com/',
    heading: 'Puzzles that explain themselves.',
  },
  {
    path: '/play/sudoku/',
    title: "Kids' sudoku with hints that explain the reason | PuzzleBloom",
    canonical: 'https://puzzlebloom.taoliapp.com/play/sudoku/',
    heading: 'Sudoku for kids',
  },
  {
    path: '/play/nonogram/',
    title: "Kids' nonogram: count the squares, uncover the picture | PuzzleBloom",
    canonical: 'https://puzzlebloom.taoliapp.com/play/nonogram/',
    heading: 'Nonogram for kids',
  },
  {
    path: '/play/tangram/',
    title: "Kids' tangram: seven pieces, one shape | PuzzleBloom",
    canonical: 'https://puzzlebloom.taoliapp.com/play/tangram/',
    heading: 'Tangram for kids',
  },
  {
    path: '/play/memory-garden/',
    title: "Kids' memory game: turn over two, keep the pair | PuzzleBloom",
    canonical: 'https://puzzlebloom.taoliapp.com/play/memory-garden/',
    // The heading is not drawn on screen — the visible header is a back button,
    // a size and a clock — but it is real, and it is the only `<h1>` in the
    // document, which is what a crawler needs.
    heading: 'Memory Garden for kids',
  },
  {
    path: '/themes/',
    title: 'Theme studio — make the puzzle yours | PuzzleBloom',
    canonical: 'https://puzzlebloom.taoliapp.com/themes/',
    heading: 'Make it yours',
  },
  {
    path: '/parents/',
    title: 'For grown-ups: no ads, no accounts, no streaks | PuzzleBloom',
    canonical: 'https://puzzlebloom.taoliapp.com/parents/',
    heading: 'What this is, and what it refuses to be',
  },
];

for (const route of ROUTES) {
  test(`${route.path} carries its own head without running JavaScript`, async ({ browser }) => {
    // JavaScript off is the honest test of a prerender: whatever is in the file
    // is all a crawler that does not execute scripts will ever see. Bing and
    // most social unfurlers live in this world.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(route.path);

    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://puzzlebloom.taoliapp.com/og.png',
    );
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /^$/);

    // Exactly one: a page with two `<h1>`s gives a crawler no way to tell which
    // sentence the document is about.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(route.heading);

    await context.close();
  });
}

test('the home page describes the site and every game it ships, and nothing invented', async ({ page }) => {
  await page.goto('/');

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);

  const graph = JSON.parse(blocks[0])['@graph'] as Array<Record<string, unknown>>;
  const ofType = (type: string) => graph.filter((node) => node['@type'] === type);

  // Asserted by meaning, not by position. The page now carries one application
  // node per shipped game, and the order of that list is a detail of the
  // registry this test has no business pinning.
  expect(ofType('WebSite')).toHaveLength(1);
  expect(ofType('WebPage')).toHaveLength(1);
  const applications = ofType('WebApplication');
  expect(applications).toHaveLength(4);

  // One application per ready game, each naming its own URL — and the lookup by
  // URL is deliberate, because taking the first `WebApplication` would silently
  // stop testing sudoku the moment the list order changed.
  const byUrl = new Map(applications.map((node) => [node.url as string, node]));
  expect([...byUrl.keys()].sort()).toEqual([
    'https://puzzlebloom.taoliapp.com/play/memory-garden/',
    'https://puzzlebloom.taoliapp.com/play/nonogram/',
    'https://puzzlebloom.taoliapp.com/play/sudoku/',
    'https://puzzlebloom.taoliapp.com/play/tangram/',
  ]);

  // Four nodes with one `@id` is an invalid graph, and it is exactly what
  // generating them from a list invites. The identity has to name the game.
  expect(new Set(applications.map((node) => node['@id'])).size).toBe(4);
  for (const node of applications) expect(node['@id']).toBe(`${node.url}#application`);

  for (const node of applications) {
    expect(node).toMatchObject({
      applicationCategory: 'GameApplication',
      isAccessibleForFree: true,
    });
    // Structured data claiming a rating or a review this site does not have is
    // how a small site earns a manual action. The absence is the assertion.
    expect(node).not.toHaveProperty('aggregateRating');
    expect(node).not.toHaveProperty('review');
  }

  // The sudoku node is word for word what it was before it was generated from
  // the register. Pinned here because a silent change to markup a search engine
  // has already crawled is worse than no change at all.
  expect(byUrl.get('https://puzzlebloom.taoliapp.com/play/sudoku/')).toMatchObject({
    name: 'PuzzleBloom Sudoku',
    description:
      'Free sudoku for children in the browser. Four levels, hints that teach the technique instead of giving the answer, and a creature mode for every digit.',
  });

  // The second node names the second game and its own description rather than
  // inheriting the first one's.
  expect(byUrl.get('https://puzzlebloom.taoliapp.com/play/nonogram/')).toMatchObject({
    name: 'PuzzleBloom Nonogram',
    description:
      'Free nonogram for children in the browser. Two sizes, hand-drawn pictures, crosses for the squares you rule out, and hints that explain the counting. No timer, no score, no ads.',
  });

  // And the third, from the same generated list — the register is the only
  // place a game's identity is written down, so a wrong entry there shows up
  // here rather than in a search result six weeks later.
  expect(byUrl.get('https://puzzlebloom.taoliapp.com/play/tangram/')).toMatchObject({
    name: 'PuzzleBloom Tangram',
    description:
      'Free tangram for children in the browser. Drag the classic seven pieces into a silhouette; any arrangement that covers it exactly counts as solved. Hints that describe, never place.',
  });

  // The fourth took no change to `head.ts`: a game gets a node by existing in
  // the register, and its description comes from `site.json`. That is what this
  // assertion is really checking — that the fourth one arrived the same way.
  expect(byUrl.get('https://puzzlebloom.taoliapp.com/play/memory-garden/')).toMatchObject({
    name: 'PuzzleBloom Memory Garden',
    description:
      "Free memory game for children in the browser. Six, eight or nine pairs of the garden's creatures, face down; a pair that misses stays face up until you turn the next card, so there is nothing to be quick about.",
  });
});

// Both game pages, because "a game page describes itself and only itself" is a
// claim about the generator, and a generator with one case is a coincidence.
for (const game of [
  {
    path: '/play/nonogram/',
    id: 'https://puzzlebloom.taoliapp.com/play/nonogram/#application',
    name: 'PuzzleBloom Nonogram',
  },
  {
    path: '/play/tangram/',
    id: 'https://puzzlebloom.taoliapp.com/play/tangram/#application',
    name: 'PuzzleBloom Tangram',
  },
  {
    path: '/play/memory-garden/',
    id: 'https://puzzlebloom.taoliapp.com/play/memory-garden/#application',
    name: 'PuzzleBloom Memory Garden',
  },
]) {
  test(`${game.path} describes itself and only itself`, async ({ page }) => {
    await page.goto(game.path);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks).toHaveLength(1);

    const graph = JSON.parse(blocks[0])['@graph'] as Array<Record<string, unknown>>;
    const ofType = (type: string) => graph.filter((node) => node['@type'] === type);

    expect(ofType('WebPage')).toHaveLength(1);
    // Its own game, not the garden's whole shelf: a page claiming two
    // applications is a page Google can only pick one answer from.
    const applications = ofType('WebApplication');
    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      '@id': game.id,
      name: game.name,
      url: `https://puzzlebloom.taoliapp.com${game.path}`,
    });
    // The page's own URL, not the other game's: the node is generated from the
    // route that is being rendered, and this is what proves it.
    expect(applications[0].url).toBe(`https://puzzlebloom.taoliapp.com${game.path}`);
  });
}

test('an unknown URL is a 404, not a 200 with the shell', async ({ request }) => {
  const response = await request.get('/no-such-page');
  expect(response.status()).toBe(404);

  const body = await response.text();
  expect(body).toContain('noindex');
  // A 404 must not nominate a canonical URL: pointing at itself invites the
  // engine to index the misspelling, and pointing at the home page would be a
  // lie about what the visitor is looking at.
  expect(body).not.toContain('rel="canonical"');
  expect(body).not.toContain('application/ld+json');
});

test('robots.txt invites crawlers and names the sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Allow: /');
  expect(body).toMatch(/Sitemap: https:\/\/puzzlebloom\.taoliapp\.com\/sitemap\.xml/);
});

test('every sitemap URL is a page that exists and points back at itself', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);

  const locations = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  // One per entry in `site.json`: home, four games, themes, parents.
  expect(locations).toHaveLength(7);

  for (const location of locations) {
    const url = new URL(location);
    // Checked as a string, because the file itself has to name the production
    // origin: a sitemap full of `127.0.0.1` URLs is worthless.
    expect(url.origin, `${location} should be on the canonical origin`).toBe(
      'https://puzzlebloom.taoliapp.com',
    );

    // Fetched by path, so the same assertion works locally and against
    // PB_BASE_URL.
    const result = await fetchPage(request, url.pathname);
    expect(result.status, `${location} should answer 200`).toBe(200);

    // The sitemap and the canonical tag disagreeing is the most common way a
    // small site wastes crawl budget: Google discards one of the two and the
    // other never accumulates the signals it needs.
    expect(
      result.body.match(/<link rel="canonical" href="(.*?)"/)?.[1],
      `${location} should carry a canonical`,
    ).toBe(location);
  }
});

test('a client-side navigation rewrites the head, so the tab and the URL agree', async ({ page }) => {
  const problems = trackProblems(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/calm puzzle games for kids/);

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: /themes/i })
    .click();
  await expect(page).toHaveTitle('Theme studio — make the puzzle yours | PuzzleBloom');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://puzzlebloom.taoliapp.com/themes/',
  );

  expect(problems).toEqual([]);
});

/** Shared by the sitemap walk: fetch a URL and return its status and body. */
async function fetchPage(request: APIRequestContext, url: string): Promise<{ status: number; body: string }> {
  const response = await request.get(url);
  return { status: response.status(), body: await response.text() };
}
