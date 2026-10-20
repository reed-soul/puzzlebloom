# ADR-003 — Hints teach the reason, never the answer

**Status:** Accepted · 2026-10-20

## Background

Every puzzle app has a hint button. Most of them fill in a cell, which converts
the hint into "skip this part", teaches nothing, and makes the difficulty label a
lie. For a product whose only differentiator is that it is good for a child, a
hint that ends thinking is the wrong feature — but a hint that refuses to help is
worse.

## Decision

A hint is a sentence about *why*, produced by the same technique ladder that
graded the puzzle:

- it names the technique (`Naked single`, `Pointing pair`, `X-Wing`);
- it points at the cells it read and the cells it concerns;
- it states the reason in one sentence a nine-year-old can follow;
- revealing the placement is a **second, separate** tap (`Show me`).

The generator only ships puzzles this ladder can finish, so there is always a
true next step to describe — the hint never has to fall back on reading the
solution grid. If the board already contains a wrong digit, that is reported
first, because no further logic is sound from a broken position.

Engine output uses solver notation (`r4c7`). The UI rewrites coordinates to
`row 4, column 7` on the way out; the engine stays literal, the child reads
English.

## Consequences

**Good.** Hints are always correct and always finite. The technique counts that
grade a puzzle are the same ones a hint quotes, so the label, the experience and
the explanation agree. Hints used are counted and shown on the completion card,
which is the only "score" in the product.

**Bad.** Hints are longer to read than a filled cell, which is a real cost for
the youngest players — the creatures mode and the Gentle level exist to keep the
reading load down. Hint text is English-only in v0.1 (see the localisation item
in the spec's out-of-scope table).

## Related

`packages/sudoku-engine/src/game/hints.js`, `packages/sudoku-engine/src/engine/techniques.js`,
`games/sudoku/src/HintPanel.tsx`.
