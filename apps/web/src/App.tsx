import { lazy, Suspense } from 'react';
import { RouterProvider, useRouter } from './app/router';
import { ThemeProvider } from './app/ThemeProvider';
import { Nav } from './shell/Nav';
import { Footer } from './shell/Footer';
import { Home } from './pages/Home';
import { Themes } from './pages/Themes';
import { Parents } from './pages/Parents';
import { NotFound } from './pages/NotFound';
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
