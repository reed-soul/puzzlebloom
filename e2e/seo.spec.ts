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
    title: 'PuzzleBloom — calm sudoku for kids, no ads, no accounts',
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

test('the home page describes the site and the application, and nothing invented', async ({ page }) => {
  await page.goto('/');

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);

  const graph = JSON.parse(blocks[0])['@graph'] as Array<Record<string, unknown>>;
  expect(graph.map((node) => node['@type'])).toEqual(['WebSite', 'WebApplication', 'WebPage']);

  const application = graph.find((node) => node['@type'] === 'WebApplication');
  expect(application).toMatchObject({
    applicationCategory: 'GameApplication',
    isAccessibleForFree: true,
    url: 'https://puzzlebloom.taoliapp.com/play/sudoku/',
  });
  // Structured data claiming a rating or a review this site does not have is how
  // a small site earns a manual action. The absence is the assertion.
  expect(application).not.toHaveProperty('aggregateRating');
  expect(application).not.toHaveProperty('review');
});

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
  expect(locations).toHaveLength(4);

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
  await expect(page).toHaveTitle(/calm sudoku for kids/);

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
