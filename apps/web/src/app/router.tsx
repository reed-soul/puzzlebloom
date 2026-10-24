/**
 * A fifty-line router.
 *
 * The site has five pages and no nested layouts. A routing library would add a
 * dependency, a bundle and a mental model to solve a problem that does not
 * exist here yet — and when it does exist, swapping this out is an afternoon.
 * Links are real <a href> elements, so middle-click, copy-link and crawlers all
 * behave; only plain left clicks are intercepted.
 */

import {
  type AnchorHTMLAttributes,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { withViewTransition } from './viewTransition';

interface Location {
  path: string;
  search: string;
}

interface RouterValue extends Location {
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

const read = (): Location => ({
  path: window.location.pathname.replace(/\/+$/, '') || '/',
  search: window.location.search,
});

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(read);

  useEffect(() => {
    const onPop = () => setLocation(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const current = `${window.location.pathname}${window.location.search}`;
    if (to === current) return;
    withViewTransition(() => {
      if (options?.replace) window.history.replaceState(null, '', to);
      else window.history.pushState(null, '', to);
      setLocation(read());
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside RouterProvider');
  return value;
}

/**
 * The URL a browser is actually served from.
 *
 * Cloudflare Pages answers `/themes` with a 308 to `/themes/`, and the
 * canonical tag names the trailing-slash form. An internal link that omitted
 * the slash would send every crawler through a redirect that exists only
 * because we asked for it. `read()` strips the slash again when matching, so
 * both forms still reach the same page — this only decides what the anchor
 * advertises.
 */
function hrefFor(to: string): string {
  const cut = to.search(/[?#]/);
  const path = cut === -1 ? to : to.slice(0, cut);
  const rest = cut === -1 ? '' : to.slice(cut);
  if (!path.startsWith('/')) return to;
  return `${path.replace(/\/+$/, '')}/${rest}`.replace(/^\/\//, '/');
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={hrefFor(to)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
