/**
 * The document head, owned in one place.
 *
 * A three-route SPA still has to present three different documents to a
 * crawler, which means title, description, canonical and structured data have
 * to change on navigation — and they have to be *already correct in the HTML*
 * for anything that does not run JavaScript.
 *
 * Both halves are handled from the same table, `site.json`:
 *
 *   build time   `scripts/seo.mjs` renders each route with a headless browser
 *                and writes the result to `dist/<route>/index.html`, so the
 *                served HTML carries that route's head before React boots.
 *   run time     this module applies the same table on every client-side
 *                navigation, so a visitor arriving from a link and a visitor
 *                clicking through end up with identical metadata.
 *
 * One table, two consumers, no drift.
 */

import site from '../../site.json';
import { GAMES, type GameManifest } from '../games/registry';

type MetaKey = 'name' | 'property';

function upsertMeta(key: MetaKey, id: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${id}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(key, id);
    document.head.append(element);
  }
  element.setAttribute('content', content);
}

const removeMeta = (key: MetaKey, id: string): void => {
  document.head.querySelector(`meta[${key}="${id}"]`)?.remove();
};

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.append(element);
  }
  element.setAttribute('href', href);
}

/** `'/play/sudoku'` → `https://…/play/sudoku`; the root keeps its slash. */
export function absoluteUrl(path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${site.url}${clean}/`;
}

export function pageMeta(path: string): { title: string; description: string } {
  const page = site.pages[path as keyof typeof site.pages];
  // An unknown route is the 404 page. It gets the site's own description rather
  // than a made-up one, and `applyHead` marks it noindex.
  return (
    page ?? {
      title: `Page not found | ${site.name}`,
      description: `A small garden of quiet puzzle games for children.`,
    }
  );
}

/**
 * Structured data. Deliberately small: the entities a search engine can actually
 * use here are the site and the games it ships. Inventing `FAQPage` or `Rating`
 * markup for content that does not exist is how sites get manual actions.
 *
 * The application node is generated from the registry rather than written out
 * here, so a game gets one by existing. The home page lists every playable game;
 * a game's own page lists just that one. Both read their description from
 * `site.json`, which is also what the prerender writes into the document, so the
 * markup and the page can never disagree.
 */
function applicationNode(game: GameManifest): object {
  const page = site.pages[game.route as keyof typeof site.pages];
  return {
    '@type': 'WebApplication',
    '@id': `${absoluteUrl(game.route)}#application`,
    name: `${site.name} ${game.title}`,
    url: absoluteUrl(game.route),
    applicationCategory: 'GameApplication',
    applicationSubCategory: 'Puzzle',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
    audience: { '@type': 'Audience', audienceType: 'children' },
    inLanguage: site.language,
    isPartOf: { '@id': `${site.url}/#website` },
    screenshot: `${site.url}${site.ogImage}`,
    description: page?.description ?? game.blurb,
  };
}

function structuredData(path: string, title: string, description: string): object[] {
  const url = absoluteUrl(path);

  const webSite = {
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: `${site.url}/`,
    name: site.name,
    inLanguage: site.language,
    description: site.pages['/'].description,
  };

  const webPage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: site.language,
    isPartOf: { '@id': `${site.url}/#website` },
  };

  if (path === '/') return [webSite, ...GAMES.map(applicationNode), webPage];

  const game = GAMES.find((candidate) => candidate.route === path);
  return game ? [webPage, applicationNode(game)] : [webPage];
}

export interface HeadOptions {
  /** True on any path the site does not know: the 404 page. */
  notFound?: boolean;
}

export function applyHead(path: string, options: HeadOptions = {}): void {
  const notFound = options.notFound === true;
  const { title, description } = pageMeta(path);
  const canonical = absoluteUrl(path);
  const image = `${site.url}${site.ogImage}`;

  document.title = title;
  document.documentElement.lang = site.language;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', notFound ? 'noindex, follow' : 'index, follow');
  // A 404 has no canonical URL to name. Pointing at itself would invite the
  // engine to index the misspelling; pointing at the home page would be a lie.
  // The same reasoning removes og:url, which would otherwise advertise the
  // misspelling as a shareable address.
  if (notFound) {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    removeMeta('property', 'og:url');
  } else {
    upsertLink('canonical', canonical);
  }

  upsertMeta('property', 'og:site_name', site.name);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  if (!notFound) upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:width', '1200');
  upsertMeta('property', 'og:image:height', '630');
  upsertMeta('property', 'og:image:alt', `${site.name} — ${site.tagline}`);
  upsertMeta('property', 'og:locale', site.locale);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertMeta('name', 'twitter:image:alt', `${site.name} — ${site.tagline}`);

  // The 404 page describes no entity, so it gets no structured data. Emitting a
  // WebPage node for a URL that does not exist is exactly the kind of thing a
  // search engine has to guess about.
  const existing = document.getElementById('pb-structured-data');
  if (notFound) {
    existing?.remove();
    return;
  }

  const graph = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': structuredData(path, title, description),
  });
  const script = (existing as HTMLScriptElement | null) ?? document.createElement('script');
  if (!existing) {
    script.id = 'pb-structured-data';
    script.type = 'application/ld+json';
    document.head.append(script);
  }
  script.textContent = graph;
}

/** Paths that get their own prerendered HTML, in sitemap order. */
export const ROUTES = Object.keys(site.pages);

export { site };
