# Third-party notices

PuzzleBloom is MIT licensed. It stands on other people's work, and this file is
where that debt is written down.

## Sudoku engine — HeyPuter/everything

- Source: https://github.com/HeyPuter/everything/tree/main/src/sudoku
- License: MIT (see the upstream repository)
- Copyright: the HeyPuter/everything contributors

**What we took.** The whole of `packages/sudoku-engine/src/engine` and
`packages/sudoku-engine/src/game` is a port of that project's `src/engine` and
`src/game` directories, kept close to the original so upstream fixes stay
portable:

| File                         | Upstream                         | Notes     |
| ---------------------------- | -------------------------------- | --------- |
| `engine/grid.js`             | `src/engine/grid.js`             | unchanged |
| `engine/solver.js`           | `src/engine/solver.js`           | unchanged |
| `engine/random.js`           | `src/engine/random.js`           | unchanged |
| `engine/generator.js`        | `src/engine/generator.js`        | unchanged |
| `engine/techniques.js`       | `src/engine/techniques.js`       | unchanged |
| `engine/generator.worker.js` | `src/engine/generator.worker.js` | unchanged |
| `game/state.js`              | `src/game/state.js`              | unchanged |
| `game/serialize.js`          | `src/game/serialize.js`          | unchanged |
| `game/timer.js`              | `src/game/timer.js`              | unchanged |
| `game/puzzles.js`            | `src/game/puzzles.js`            | unchanged |
| `game/hints.js`              | `src/game/hints.js`              | unchanged |

**What we did not take.** The original `src/main.js` (vanilla DOM shell),
`src/ui/*`, `src/net/puter.js` (cloud saves through Puter), `src/style.css` and
all visual assets were replaced. PuzzleBloom's interface, theme system, routing,
artwork and copy are original work.

The upstream README is kept verbatim at
`packages/sudoku-engine/UPSTREAM-README.md` for attribution and context.

If you fork PuzzleBloom, keep this notice and the MIT copyright line intact.

## 3D renderer — three.js

- Source: https://github.com/mrdoob/three.js
- License: MIT (see the upstream repository)
- Copyright: 2010–2026 the three.js authors
- Version: `three@0.186`

**What we took.** The published npm package, unmodified — no fork, no patched
build. It is **redistributed**: the site bundles it into its own `three` chunk,
so the minified output contains three.js code and the licence has to travel with
it, exactly as with the fonts below.

**What we use it for.** One game. `games/shadows/src/ShadowScene.tsx` is the only
file in the repository that imports it, and it uses the WebGL renderer, an
orthographic camera, one shadow-casting light and the raycaster — the rest of
three.js is along for the ride in that chunk. `@types/three` is a
build-time-only dependency and is not distributed.

## Typefaces — Baloo 2 and Nunito

## Typefaces — Baloo 2 and Nunito

Both are licensed under the SIL Open Font License 1.1 and are **redistributed**
in this repository, so the licence has to travel with the files:

| Font    | Copyright                                                               | Licence text                           |
| ------- | ----------------------------------------------------------------------- | -------------------------------------- |
| Baloo 2 | 2019 The Baloo 2 Project Authors (https://github.com/EkType/Baloo2)     | `apps/web/public/fonts/OFL-Baloo2.txt` |
| Nunito  | 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito) | `apps/web/public/fonts/OFL-Nunito.txt` |

**What we took.** The `woff2` variable subsets in `apps/web/public/fonts/`,
unmodified, as served by Google Fonts. They are self-hosted rather than fetched
from a third party, which is why the site's CSP has no external host to allow.

**What the licence asks.** The files may not be sold on their own, and any
derivative must not use the reserved font names. We do not modify or rename
them, and the full OFL text sits next to the binaries.

## Overnight garden ports (MIT engines, original shells)

Twelve more games landed as clean-room TypeScript engines. Each one follows
classic public-domain rules; the overnight references below are MIT, and we
took the algorithm, not the interface. PuzzleBloom's boards, copy, theme tokens
and creature art are original. None of these games ship a gallows, a timer that
shames, ads, chat, or a multiplayer server.

### Sliding Garden — 15-puzzle

- Source: https://github.com/react-puzzle-games/15-puzzle
- License: MIT
- **What we took.** The idea of scrambling by walking the empty square so every
  deal is solvable. Not the MUI shell.
- **What we wrote.** `packages/sliding-engine` and `games/sliding`.

### Maze Path — recursive-backtracker hedges

- Source: https://github.com/codebox/mazes
- License: MIT
- **What we took.** The depth-first carve (a grid of cells with four walls,
  carved until every cell is reachable). Not the viewer.
- **What we wrote.** `packages/maze-engine` and `games/maze`.

### Echo Bloom — Simon sequences

- Source: https://github.com/TheWilley/Simon
- License: MIT
- **What we took.** Sequence growth and "listen, then copy". Miss handling is
  ours: the same bloom is replayed, with no fail-shame.
- **What we wrote.** `packages/simon-engine` and `games/simon`.

### Four Flowers — Connect Four

- Source: https://github.com/jotaen/connect4-ai
- License: MIT
- **What we took.** Gravity, four-in-a-line scanning, vs-CPU only. The CPU is
  deliberately soft (win, block, then centre) rather than the full minimax.
- **What we wrote.** `packages/connect-four-engine` and `games/connect-four`.

### Word Meadow — word search

- Source: https://github.com/vzsoares/Word-Search-Puzzle-REACT
- License: MIT
- **What we took.** Place a word along a vector, fill the rest with letters.
  The word list is a garden list (nature, animals, colours), not theirs.
- **What we wrote.** `packages/word-search-engine` and `games/word-search`.

### Firefly Lights — Lights Out

- Source: https://github.com/ScriptRaccoon/Lights-Out-Vanilla-JavaScript
- License: MIT
- **What we took.** Plus-shaped toggles (a cell and its four neighbours).
  Puzzles are carved from a dark board so every deal is solvable.
- **What we wrote.** `packages/lights-out-engine` and `games/lights-out`.

### Peg Pond — English peg solitaire

- Source: https://github.com/ggades/peg-solitaire
- License: MIT
- **What we took.** Hop geometry and undo. The board is a 7×7 with the four
  2×2 corners removed; the copy talks of seeds on lily pads.
- **What we wrote.** `packages/peg-engine` and `games/peg`.

### Flow Paths — Numberlink / Flow

- Source: https://github.com/Menna107/Simple-Games (flow-free.html)
- License: MIT
- **What we took.** Drag from a terminal along empty cells; paths may not
  cross. Puzzles are hand-authored fillings, so every deal is solvable.
- **What we wrote.** `packages/flow-engine` and `games/flow`.

### Tri-marks — tic-tac-toe

- Source: https://github.com/awkaiser/react-tictactoe
- License: MIT
- **What we took.** Win lines, open-space enumeration and minimax. Softness is
  ours: one time in three the neighbour picks a random legal mark.
- **What we wrote.** `packages/tic-tac-engine` and `games/tic-tac`.

### Bloom Guess — word guess, no gallows

- Source: https://github.com/naimz82/simple-hangman
- License: MIT
- **What we took.** Masked word, alphabet, lives. Imagery is ours: six petals,
  never a hanging figure, and a kid nature dictionary.
- **What we wrote.** `packages/bloom-guess-engine` and `games/bloom-guess`.

### Lily Pads — Reversi / Othello

- Source: https://github.com/felipeap92/othello-game
- License: MIT
- **What we took.** Flip-along-rays. The multiplayer server was dropped; a
  greedy max-flips neighbour plays the sky stones.
- **What we wrote.** `packages/reversi-engine` and `games/reversi`.

### Piece Garden — permutation jigsaw

- License: original (clean-room). No third-party engine is lifted: kid-safe
  garden art is the bottleneck on MIT jigsaw ports, so the picture is an SVG
  scene sliced by `viewBox`.
- **What we wrote.** `packages/jigsaw-engine` and `games/jigsaw`.
