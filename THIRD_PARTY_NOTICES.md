# Third-party notices

PuzzleBloom is MIT licensed. It stands on the shoulders of two projects in
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

## Typefaces — Baloo 2 and Nunito

Both are licensed under the SIL Open Font License 1.1 and are **redistributed**
in this repository, so the licence has to travel with the files:

| Font | Copyright | Licence text |
| --- | --- | --- |
| Baloo 2 | 2019 The Baloo 2 Project Authors (https://github.com/EkType/Baloo2) | `apps/web/public/fonts/OFL-Baloo2.txt` |
| Nunito | 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito) | `apps/web/public/fonts/OFL-Nunito.txt` |

**What we took.** The `woff2` variable subsets in `apps/web/public/fonts/`,
unmodified, as served by Google Fonts. They are self-hosted rather than fetched
from a third party, which is why the site's CSP has no external host to allow.

**What the licence asks.** The files may not be sold on their own, and any
derivative must not use the reserved font names. We do not modify or rename
them, and the full OFL text sits next to the binaries.
