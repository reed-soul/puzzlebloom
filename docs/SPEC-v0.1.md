# Spec — PuzzleBloom v0.1

Locked 20 Oct 2026. Everything below is the contract this repo is built against.
When something disagrees with this file, this file wins or gets amended.

---

## 1. Product

**One line.** A static site of calm puzzle games for children aged 6–14, starting
with Sudoku, themed so a child can make it theirs.

**Who.** A child playing alone on a phone or tablet, and a parent deciding
whether to hand the device over. Both audiences are addressed on every screen.

**Problem being solved.** Puzzle apps for children are either ad-filled or
competitive. A parent who wants "no ads, no chat, no strangers, nothing violent"
currently has to pick between quality and safety.

## 2. Scope — shipped in v0.1

| #   | Feature             | Acceptance summary                                                          |
| --- | ------------------- | --------------------------------------------------------------------------- |
| F1  | Garden landing page | Lists shipped and upcoming games; shows trust promises                      |
| F2  | Sudoku, four levels | Gentle / Curious / Tricky / Brainy, matching engine tiers 1–4               |
| F3  | Daily puzzle        | Same board for everyone on a given local date                               |
| F4  | Hints that explain  | Names the technique, points at cells, states the reason; optional "Show me" |
| F5  | Pencil marks        | Per-cell notes, auto-cleared from peers on placement                        |
| F6  | Undo / redo         | Total: restores pencil marks wiped by a placement                           |
| F7  | Pause               | Blurs the board, stops the clock, also triggers on tab hide                 |
| F8  | Creatures mode      | Digits 1–9 rendered as nine distinct glyph creatures                        |
| F9  | Resume              | Unfinished board restored on reload                                         |
| F10 | Theme system        | 5 built-in moods + studio; applies instantly site-wide                      |
| F11 | Custom themes       | Create, name, save, delete, share by link, contrast-audited                 |
| F12 | Parents page        | Promises, age guidance, data disclosure, wipe button                        |

## 3. Out of scope — deliberately

| Not doing                        | Why                                                                                           | Revisit                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Accounts, cloud saves            | Requires a backend and COPPA/GDPR-K obligations; the value is not worth it at this stage      | If cross-device sync is requested by real users         |
| Online play, leaderboards        | Introduces strangers and moderation into a product whose whole promise is the absence of both | Never in this product shape                             |
| Ads, IAP                         | Contradicts the positioning                                                                   | Never                                                   |
| Analytics                        | The parent page claims there are none; keeping the claim true is cheaper than instrumenting   | Consent-based, privacy-first counter if growth needs it |
| More than four difficulty levels | Engine defines four tiers; a fifth would be a label, not a promise                            | v0.2                                                    |
| Localisation                     | English-first for the overseas audience; strings are inline in components                     | v0.3 via a dictionary layer                             |
| PWA / offline install            | Works offline after first load already; installability is a separate project                  | v0.2                                                    |

## 4. Stack (locked versions)

| Layer    | Choice                                                 | Why                                                            |
| -------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Runtime  | Node ≥ 20                                              | pnpm workspaces, Vite 8                                        |
| Language | TypeScript 7 (`strict`, `allowJs` for the engine port) | Types at the boundary, JS left untouched where it is proven    |
| UI       | React 19                                               | Only for the app + game; theme is CSS                          |
| Build    | Vite 8                                                 | Static output, worker bundling, no SSR needed                  |
| Styling  | Hand-written CSS + custom properties                   | A theme system expressed as CSS variables needs no framework   |
| Icons    | `packages/ui/src/icons.tsx` — 24 in-house SVG icons    | One grid, one stroke weight; no emoji, no icon dependency      |
| Engine   | `packages/sudoku-engine` (MIT port)                    | Unique-solution generation + logic grading + explainable hints |
| Storage  | `localStorage` only                                    | No server                                                      |

## 5. Routes

| Path           | Page         | Notes                               |
| -------------- | ------------ | ----------------------------------- |
| `/`            | Garden       | Static, no engine loaded            |
| `/play/sudoku` | Game         | Lazy chunk; engine + worker         |
| `/themes`      | Theme studio | Reads `?theme=` for shared palettes |
| `/parents`     | Parent notes | Static prose                        |

## 6. Stored data

| Key                      | Contents                                                     | Cleared by                             |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------- |
| `pb:sudoku:save:v1`      | Current board, puzzle + solution, notes, elapsed, hint count | Playing a new puzzle; parent page wipe |
| `pb:sudoku:stats:v1`     | Cleared count, per-level count, best time per level          | Parent page wipe                       |
| `pb:sudoku:creatures:v1` | Numerals vs creatures preference                             | Parent page wipe                       |
| `pb:theme-active:v1`     | Active theme id                                              | Parent page wipe                       |
| `pb:themes:v1`           | Custom themes (max 24)                                       | Parent page wipe                       |

Nothing is transmitted. There is no `fetch` to any third party in the bundle
except the Google Fonts stylesheet.

## 7. Acceptance criteria (EARS)

| ID    | Criterion                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01 | While the game loads, if a valid save exists and is unsolved, the system must restore it with its elapsed time.                                              |
| AC-02 | When a digit is placed in a cell whose row, column or box already holds it, the system must mark every involved cell as a conflict without losing the entry. |
| AC-03 | When the player asks for a hint, the system must return a step whose `explain` text names a technique from the ladder, or report an existing mistake first.  |
| AC-04 | If the board is complete and consistent, the system must stop the clock and show the completion card exactly once.                                           |
| AC-05 | When the theme studio changes a colour, the system must repaint the whole site within one frame without a reload.                                            |
| AC-06 | If a theme pair falls below WCAG AA, the studio must report it and offer a repair that raises it above the threshold.                                        |
| AC-07 | When a theme link is opened, the system must apply the incoming palette and offer to keep it, ignoring malformed or non-hex payloads.                        |
| AC-08 | When the tab is hidden during play, the system must pause the clock.                                                                                         |
| AC-09 | The board must be operable by keyboard alone, including digit entry, notes and hints.                                                                        |
| AC-10 | A built production bundle must contain no inline script (CSP `script-src 'self'`).                                                                           |

## 8. Verification

```bash
pnpm typecheck                  # 0 errors
pnpm test                       # 189 passing
pnpm build                      # static bundle
pnpm preview                    # http://localhost:4173

# then, per release:
#  - load /play/sudoku, switch to Brainy, confirm givens drop to ~22–26
#  - ask for a hint on a wrong digit → mistake message, no jargon like r4c7
#  - /themes → change a colour → save → reload → theme persists
#  - /play/sudoku in Night Owl → cell tints remain distinguishable
```

## 9. Known constraints

- The engine is fixed to 9×9. A 4×4 "first grid" for pre-readers would need a
  size-parameterised engine; the creature mode covers that need for now.
- No SSR. Meta tags are static in `index.html`; per-page titles are not yet set.
- Bundled Google Fonts request is the only third-party network call. Self-host
  the two families if the CSP is ever tightened to `default-src 'self'`.

## 10. Change log

| Date       | Change      | Reason      |
| ---------- | ----------- | ----------- |
| 2026-10-20 | v0.1 locked | First build |
