import { ThemeProvider } from '@puzzlebloom/ui/theme';
import { type ComponentType, type LazyExoticComponent, lazy, Suspense, useLayoutEffect } from 'react';
import { applyHead } from './app/head';
import { RouterProvider, useRouter } from './app/router';
import { GAMES } from './games/registry';
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

type GamePage = LazyExoticComponent<ComponentType<{ onExit?: () => void }>>;

// Each game is a heavy chunk of its own. The garden paints without any of them.
const GAME_PAGES: Record<string, GamePage> = {
  sudoku: lazy(() => import('@puzzlebloom/game-sudoku').then((m) => ({ default: m.SudokuGame }))),
  nonogram: lazy(() => import('@puzzlebloom/game-nonogram').then((m) => ({ default: m.NonogramGame }))),
  tangram: lazy(() => import('@puzzlebloom/game-tangram').then((m) => ({ default: m.TangramGame }))),
  'memory-garden': lazy(() =>
    import('@puzzlebloom/game-memory-garden').then((m) => ({ default: m.MemoryGame })),
  ),
  balance: lazy(() => import('@puzzlebloom/game-balance').then((m) => ({ default: m.BalanceGame }))),
  'frog-road': lazy(() => import('@puzzlebloom/game-frog-road').then((m) => ({ default: m.FrogRoadGame }))),
  bloom: lazy(() => import('@puzzlebloom/game-bloom').then((m) => ({ default: m.BloomGame }))),
  // The only chunk in the site that carries a renderer of its own: three.js is
  // ~150 kB gzipped and lands here, in this lazy chunk, and nowhere else.
  shadows: lazy(() => import('@puzzlebloom/game-shadows').then((m) => ({ default: m.ShadowsGame }))),
  sliding: lazy(() => import('@puzzlebloom/game-sliding').then((m) => ({ default: m.SlidingGame }))),
  maze: lazy(() => import('@puzzlebloom/game-maze').then((m) => ({ default: m.MazeGame }))),
  simon: lazy(() => import('@puzzlebloom/game-simon').then((m) => ({ default: m.EchoBloomGame }))),
  'connect-four': lazy(() =>
    import('@puzzlebloom/game-connect-four').then((m) => ({ default: m.FourFlowersGame })),
  ),
  'word-search': lazy(() =>
    import('@puzzlebloom/game-word-search').then((m) => ({ default: m.WordMeadowGame })),
  ),
  'lights-out': lazy(() => import('@puzzlebloom/game-lights-out').then((m) => ({ default: m.FireflyGame }))),
  peg: lazy(() => import('@puzzlebloom/game-peg').then((m) => ({ default: m.PegPondGame }))),
  flow: lazy(() => import('@puzzlebloom/game-flow').then((m) => ({ default: m.FlowPathsGame }))),
  'tic-tac': lazy(() => import('@puzzlebloom/game-tic-tac').then((m) => ({ default: m.TriMarksGame }))),
  'bloom-guess': lazy(() =>
    import('@puzzlebloom/game-bloom-guess').then((m) => ({ default: m.BloomGuessGame })),
  ),
  reversi: lazy(() => import('@puzzlebloom/game-reversi').then((m) => ({ default: m.LilyPadsGame }))),
  jigsaw: lazy(() => import('@puzzlebloom/game-jigsaw').then((m) => ({ default: m.PieceGardenGame }))),
};

const UNPACKING: Record<string, string> = {
  sudoku: 'Unpacking the grid…',
  nonogram: 'Counting out the clues…',
  tangram: 'Cutting the seven pieces…',
  'memory-garden': 'Turning the cards over…',
  balance: 'Setting up the scale…',
  'frog-road': 'Unfolding the road…',
  bloom: 'Scattering the seeds…',
  shadows: 'Setting out the lanterns…',
  sliding: 'Laying out the tiles…',
  maze: 'Growing the hedges…',
  simon: 'Warming the petals…',
  'connect-four': 'Planting the flowers…',
  'word-search': 'Sowing the letters…',
  'lights-out': 'Catching the fireflies…',
  peg: 'Setting the lily pads…',
  flow: 'Laying the paths…',
  'tic-tac': 'Drawing the marks…',
  'bloom-guess': 'Hiding a garden word…',
  reversi: 'Floating the pads…',
  jigsaw: 'Cutting the pieces…',
};

function Routes() {
  const { path, navigate } = useRouter();
  const isPlaying = path.startsWith('/play/');
  const game = GAMES.find((candidate) => candidate.route === path);
  const known = path === '/' || path === '/themes' || path === '/parents' || Boolean(game);

  // Layout effect, not effect: the title and canonical should be right before
  // the new page paints, the same way the theme is.
  useLayoutEffect(() => {
    applyHead(path, { notFound: !known });
  }, [known, path]);

  const page = (() => {
    if (path === '/') return <Home />;
    if (path === '/themes') return <Themes />;
    if (path === '/parents') return <Parents />;
    if (game) {
      const Page = GAME_PAGES[game.id];
      if (!Page) return <NotFound />;
      return (
        <Suspense fallback={<p className="pb-page-note">{UNPACKING[game.id] ?? 'Opening the garden…'}</p>}>
          <Page onExit={() => navigate('/')} />
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
