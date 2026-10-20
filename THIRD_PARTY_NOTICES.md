# Third-party notices

PuzzleBloom is MIT licensed. It stands on the shoulders of one project in
particular, and this file is where that debt is written down.

## Sudoku engine — HeyPuter/everything

- Source: https://github.com/HeyPuter/everything/tree/main/src/sudoku
- License: MIT (see the upstream repository)
- Copyright: the HeyPuter/everything contributors

**What we took.** The whole of `packages/sudoku-engine/src/engine` and
`packages/sudoku-engine/src/game` is a port of that project's `src/engine` and
`src/game` directories, kept close to the original so upstream fixes stay
portable:

| File | Upstream | Notes |
| --- | --- | --- |
| `engine/grid.js` | `src/engine/grid.js` | unchanged |
| `engine/solver.js` | `src/engine/solver.js` | unchanged |
| `engine/random.js` | `src/engine/random.js` | unchanged |
| `engine/generator.js` | `src/engine/generator.js` | unchanged |
| `engine/techniques.js` | `src/engine/techniques.js` | unchanged |
| `engine/generator.worker.js` | `src/engine/generator.worker.js` | unchanged |
| `game/state.js` | `src/game/state.js` | unchanged |
| `game/serialize.js` | `src/game/serialize.js` | unchanged |
| `game/timer.js` | `src/game/timer.js` | unchanged |
| `game/puzzles.js` | `src/game/puzzles.js` | unchanged |
| `game/hints.js` | `src/game/hints.js` | unchanged |

**What we did not take.** The original `src/main.js` (vanilla DOM shell),
`src/ui/*`, `src/net/puter.js` (cloud saves through Puter), `src/style.css` and
all visual assets were replaced. PuzzleBloom's interface, theme system, routing,
artwork and copy are original work.

The upstream README is kept verbatim at
`packages/sudoku-engine/UPSTREAM-README.md` for attribution and context.

If you fork PuzzleBloom, keep this notice and the MIT copyright line intact.
