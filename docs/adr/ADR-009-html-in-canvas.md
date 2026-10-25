# ADR-009: HTML-in-Canvas as a progressive enhancement layer

- **Status:** Accepted (2026-10-25)
- **Context:** [ADR-007](ADR-007-web3d.md), [ADR-008](ADR-008-wrangler-remains-deployer.md)
- **Supersedes:** nothing · **Relates to:** ADR-007's revision on device assumptions

## Context

Chrome shipped the HTML-in-Canvas API: Chrome 138 behind
`--enable-blink-features=CanvasDrawElement`, Chrome 148 Origin Trial, Chrome
155+ with the standardised `content="drawable"` attribute. The API lets a 2D
canvas render live DOM subtrees — `canvas[content="drawable"]` lays out its
descendants, `drawable` marks independent paint roots, `ctx.drawElementImage()`
draws them, and hit-testing plus the accessibility tree follow the drawn
geometry automatically.

The user's standing selection principle: always favour the newest technology,
evaluate new browser capabilities eagerly, and assume current devices and
current browsers. Firefox and Safari have not committed to implementing — which
this ADR records as a **fallback boundary, not a blocker**: the site's declared
audience runs current browsers, so the question is not whether to use the new
capability but how to use it without punishing engines that lack it.

## Decision

Number Balance gets a canvas-rendered physical beam as a **progressive
enhancement over an intact DOM implementation**:
1. The game's DOM stays exactly as it is — the CSS beam, pans, frogs and
   controls remain the complete, playable game. Every engine feature and every
   e2e test passes against the DOM alone.
2. A feature probe (`canvas.content === 'drawable'` after setting the
   attribute) decides at runtime. No UA sniffing, no flags in user space.
3. When the probe passes, a `<canvas>` layer draws the beam with real
   dynamics — the angle follows an under-damped spring from the engine's tilt
   value, so the beam overshoots and settles like a physical object instead of
   lerping between two angles. The DOM beam is hidden (`aria-hidden`,
   `inert`), and the drawable subtrees keep their accessibility: the API
   exposes them to the a11y tree at the drawn geometry, which is precisely the
   problem canvas-rendered UI has had for a decade.
4. When the probe fails, the canvas layer never mounts. The DOM beam plays,
   with its CSS transition. Nothing degrades, nothing is missing.

## Why this and not canvas-only

The pedagogy is the point of this game, and the pedagogy lives in the DOM
structure: a numeral is readable text, a frog count is countable elements, the
equation is a real sentence. Rebuilding those as canvas pixels would trade the
one thing the game exists for. Rendering the _presentation_ of that structure
through the new API keeps both: the structure for engines and assistive
technology, the dynamics for browsers that can draw DOM into canvas.

## Consequences

- Playwright tests the enhanced path by launching Chromium with
  `--enable-blink-features=CanvasDrawElement`; the same suite runs unflagged to
  cover the DOM path. WebKit (the mobile project) exercises the DOM path by
  default — which is also its real-world path today.
- The enhancement is contained in one component (`BalanceCanvas.tsx`); removal
  is a single import.
- When the API ships stable in a Chrome release, the flag dependency in tests
  drops away and the probe begins passing for real users without a deploy.
- If Safari or Firefox implement, the DOM stays as-is and their users gain the
  canvas beam with zero changes — the probe, not a vendor list, decides.
