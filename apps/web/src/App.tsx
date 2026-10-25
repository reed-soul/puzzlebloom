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

// Each game is a heavy chunk of its own. The garden paints without any of them.
const SudokuGame = lazy(() =>
  import('@puzzlebloom/game-sudoku').then((module) => ({ default: module.SudokuGame })),
);
const NonogramGame = lazy(() =>
  import('@puzzlebloom/game-nonogram').then((module) => ({ default: module.NonogramGame })),
);
const TangramGame = lazy(() =>
  import('@puzzlebloom/game-tangram').then((module) => ({ default: module.TangramGame })),
);
const MemoryGarden = lazy(() =>
  import('@puzzlebloom/game-memory-garden').then((module) => ({ default: module.MemoryGame })),
);
const BalanceGame = lazy(() =>
  import('@puzzlebloom/game-balance').then((module) => ({ default: module.BalanceGame })),
);
const FrogRoadGame = lazy(() =>
  import('@puzzlebloom/game-frog-road').then((module) => ({ default: module.FrogRoadGame })),
);
const BloomGame = lazy(() =>
  import('@puzzlebloom/game-bloom').then((module) => ({ default: module.BloomGame })),
);

function Routes() {
  const { path, navigate } = useRouter();
  const isPlaying = path.startsWith('/play/');
  const known =
    path === '/' ||
    path === '/themes' ||
    path === '/parents' ||
    path === '/play/sudoku' ||
    path === '/play/nonogram' ||
    path === '/play/tangram' ||
    path === '/play/memory-garden' ||
    path === '/play/balance' ||
    path === '/play/frog-road' ||
    path === '/play/bloom';

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
    if (path === '/play/nonogram') {
      return (
        <Suspense fallback={<p className="pb-page-note">Counting out the clues…</p>}>
          <NonogramGame onExit={() => navigate('/')} />
        </Suspense>
      );
    }
    if (path === '/play/tangram') {
      return (
        <Suspense fallback={<p className="pb-page-note">Cutting the seven pieces…</p>}>
          <TangramGame onExit={() => navigate('/')} />
        </Suspense>
      );
    }
    if (path === '/play/memory-garden') {
      return (
        <Suspense fallback={<p className="pb-page-note">Turning the cards over…</p>}>
          <MemoryGarden onExit={() => navigate('/')} />
        </Suspense>
      );
    }
    if (path === '/play/balance') {
      return (
        <Suspense fallback={<p className="pb-page-note">Setting up the scale…</p>}>
          <BalanceGame onExit={() => navigate('/')} />
        </Suspense>
      );
    }
    if (path === '/play/frog-road') {
      return (
        <Suspense fallback={<p className="pb-page-note">Unfolding the road…</p>}>
          <FrogRoadGame onExit={() => navigate('/')} />
        </Suspense>
      );
    }
    if (path === '/play/bloom') {
      return (
        <Suspense fallback={<p className="pb-page-note">Scattering the seeds…</p>}>
          <BloomGame onExit={() => navigate('/')} />
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
