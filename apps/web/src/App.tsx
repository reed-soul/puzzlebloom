import { lazy, Suspense, useLayoutEffect } from 'react';
import { applyHead } from './app/head';
import { RouterProvider, useRouter } from './app/router';
import { ThemeProvider } from './app/ThemeProvider';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Parents } from './pages/Parents';
import { Themes } from './pages/Themes';
import { Footer } from './shell/Footer';
import { Nav } from './shell/Nav';
import './styles/fonts.css';
import './styles/shell.css';
import './styles/pages.css';
import './styles/studio.css';

// The game is the only heavy chunk. The garden paints without it.
const SudokuGame = lazy(() =>
  import('@puzzlebloom/game-sudoku').then((module) => ({ default: module.SudokuGame })),
);

function Routes() {
  const { path, navigate } = useRouter();
  const isPlaying = path.startsWith('/play/');
  const known = path === '/' || path === '/themes' || path === '/parents' || path === '/play/sudoku';

  // Layout effect, not effect: the title and canonical should be right before
  // the new page paints, the same way the theme is.
  useLayoutEffect(() => {
    applyHead(path, { notFound: !known });
  }, [known, path]);

  const page = (() => {
    if (path === '/') return <Home />;
    if (path === '/themes') return <Themes />;
    if (path === '/parents') return <Parents />;
    if (path === '/play/sudoku') {
      return (
        <Suspense fallback={<p className="pb-page-note">Unpacking the grid…</p>}>
          <SudokuGame onExit={() => navigate('/')} />
        </Suspense>
      );
    }
    return <NotFound />;
  })();

  return (
    <>
      <a className="pb-skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">{page}</main>
      {isPlaying ? null : <Footer />}
    </>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <ThemeProvider>
        <Routes />
      </ThemeProvider>
    </RouterProvider>
  );
}
