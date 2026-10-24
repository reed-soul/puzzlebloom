# ADR-007 — Web 3D: CSS transforms where the tilt carries meaning, no engine anywhere

- **Status:** accepted, revised same day — see
  [Revision](#revision-same-day--the-target-device-assumption-changed)
- **Date:** 2026-10-24
- **Context:** the question asked was whether the site should adopt Web 3D "so
  that the whole system is better suited to children". Every game shipped or
  planned is a 2D grid, a card table or a flat dissection puzzle, and the
  current build contains no `<canvas>` at all.

## The question is not "does 3D look better to a child"

It does, for about forty seconds. The question that decides anything is
narrower: **does the knowledge being taught live in three dimensions?** If yes,
3D is the content and 2D cannot substitute. If no, 3D is decoration, and the
evidence on decoration in learning material is consistent and unwelcome:
interesting-but-irrelevant detail reduces retention of the relevant part
(Harp & Mayer, 1998), and in the one study we have of a manipulative that
exists in both a plain and an enriched form, the enriched version did not beat
the plain one (Bajwa & Perry, 2021, on a digital balance applet, 148 children
in grades 2–3).

So the decision splits three ways rather than one. That split, and not a
preference for flat design, is what this record settles.

## Measured baseline

|                                          |                                                 |
| ---------------------------------------- | ----------------------------------------------- |
| JS + CSS, gzipped                        | 106 KB (React 67.6 KB, everything else 38.4 KB) |
| Self-hosted variable fonts               | 156 KB, four files                              |
| Third-party origins contacted at runtime | 0                                               |
| `<canvas>` elements in the codebase      | 0                                               |
| `prefers-reduced-motion` handling points | 11, via duration tokens zeroed in `tokens.css`  |

The number that matters is not 106 KB in the abstract. It is that the site's
own logic — the sudoku engine, the theme solver, the router, every component —
is **28 KB gzipped**. That is the entire product, and it loads faster than a
single photograph on most pages on the web. This is the only advantage the
site has that a competitor cannot copy in a weekend.

## Why an engine is the wrong instrument for that advantage

Four costs, in ascending order of how badly they bite.

**1. Payload is not additive, it is multiplicative.** A tree-shaken Three.js
bundle with nothing but `WebGLRenderer`, a scene and a camera lands around
150 KB gzip — five times the site's own code, 1.4 times React. That alone is
survivable. What is not: geometry has to come from somewhere, and the normal
answer is a glTF file with a texture atlas, 500 KB to 2 MB per creature. The
first load goes from ~260 KB to several megabytes. On the hardware children
actually hold — a four-year-old iPad, a hand-me-down Redmi — that is fifteen
seconds of nothing, and the child leaves before the first frame.

**2. It breaks the one security claim that is verifiable.** `_headers` ships
`script-src 'self'`. Compression is where that breaks: Draco, KTX2 and meshopt
decoders are WebAssembly, and instantiating wasm needs `'wasm-unsafe-eval'` in
`script-src`. Three.js itself is CSP-clean; the asset pipeline around it is
not. The way out is to stop shipping compressed assets and generate geometry
procedurally — which is also the aesthetically correct answer here, because
procedural geometry can be recoloured by `theme-core` while a baked glTF
cannot.

**3. 3D does not replace the 2D interface, it doubles it.** Low-end Android
loses the WebGL context routinely: the GPU process is killed when the browser
is backgrounded, and `webglcontextlost` follows. Every serious 3D page
therefore carries a fallback, and for a children's product the fallback has to
be good enough to finish the game in. You build the 2D version either way; 3D
is an additional path with its own bugs, not a replacement.

**4. It escapes the motion policy.** This site's reduced-motion support works
because every duration is a custom property that `tokens.css` sets to `0ms`.
An animation loop driven by `requestAnimationFrame` reads none of those. A 3D
scene would have to re-implement, in imperative code, a policy that is
currently enforced in one place and auditable in one file — and it would be
the only part of the site not covered by the E2E suite that asserts it.

There is also the accessibility ceiling: a canvas is opaque to assistive
technology. The current board is real DOM with real focus, real labels and a
real tab order. That is not a nice-to-have on a site whose audience includes
seven-year-olds on school tablets with accessibility settings switched on.

## Decision

**No 3D engine. Three tiers, chosen by what the knowledge is, not by what the
page could look like.**

### Tier 0 — 2D, with physicality (default, +0 KB)

The sensation of "toy" comes from weight and response, not from perspective: a
button whose hard edge collapses from 2px to 1px when pressed, a shadow with a
consistent light direction, an overshoot of at most 6% on landing. Most of this
is already specified in `DESIGN-PROPOSAL.md` and costs nothing. Sudoku,
nonogram, memory-garden and tangram belong here, permanently. Tangram is
instructive: it is a _flat_ dissection puzzle, and the 3D version of it is a
different puzzle, not a better one.

### Tier 1 — CSS 3D, where the tilt carries meaning (+0 KB)

The castle balance is the one case so far. A scale is not a comparison of two
numbers; it is an **angle**, and the angle is the answer. Two pans, one beam,
`transform-style: preserve-3d`, the beam rotated by θ, each pan counter-rotated
by −θ so it stays level:

```
θ = clamp(k · Σ mᵢ·dᵢ, −14deg, +14deg)
```

Note the sum: mass times distance, not mass. This is the part that a physical
manipulative cannot teach and a wooden toy actively conceals — real scales have
equally spaced notches, so "further out is heavier" is unrepresentable, and the
cheap ones lie outright because the axle has friction and the beam rebounds.
The angle on screen never lies, and level 3 onward can move the frogs between
notches and let a child discover the lever rule by accident. Same component,
two physics: level 1 scores |L−R|, level 3 scores Σm·d.

Six `div`s with `rotateY` compose a cube net, so the nets-of-solids unit does
not need an engine either.

### Tier 2 — A thin WebGL layer, only when the knowledge is itself 3D (+~45 KB, lazy)

Cross-sections of a solid, volume and capacity, stacking-count, shadows and
projection, rotation symmetry. Here 2D cannot do the job and the budget is
justified. Load it per route with `dynamic import` so the home page and the
board never pay for it, and treat the 2D diagram as the default with 3D as the
enhancement, not the reverse.

### Where 3D is tempting and still wrong

The garden. The impulse is a diorama the child can orbit. But a garden is
ambient — nobody plays it — and orbiting is a camera operation, not a game
verb; perspective-taking on the three-mountain task does not stabilise until
roughly 8–10 years, and a free camera spends a six-year-old's attention on
navigation rather than on the thing being looked at. Layered parallax on the
existing SVG (three depth planes, a few pixels of drift on pointer move,
disabled under reduced motion) delivers most of the felt depth for none of the
bytes. Revisit only if the product ever wants a scene that _is_ the game.

## Technology selection, filtered by the constraints children impose

The criterion is not which engine benchmarks best. It is four properties, in
this order: **can degrade, can stop, can stay offline, can be read aloud.**

| Option                           | Verdict                                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS 3D transforms                | Chosen for Tier 1. Zero bytes, themeable, keyboard- and AT-transparent, already covered by the duration tokens                                                                                                       |
| Three.js, `WebGPURenderer`       | Chosen for Tier 2 if it happens. On the declared target WebGPU has shipped and is the preferred API, and Three is the only library with a mature WebGPU renderer _and_ a WebGL2 fallback behind the same scene graph |
| OGL                              | Only for a scene of one or two meshes. It is a WebGL2 wrapper, so on this target it is the legacy path                                                                                                               |
| Babylon.js                       | Rejected, but no longer for its size. It is an engine plus an editor, and there is nothing here to author                                                                                                            |
| WebGPU with no library           | Legitimate for Tier 2 when the scene is fixed and small. WGSL is little to learn and the payload is a few KB; the cost is rebuilding camera and matrix plumbing that Three already has                               |
| WebGL2 for new work              | Not chosen. Apple's own guidance names WebGPU the successor on iOS and iPadOS, so new code on the superseded API needs a reason of its own                                                                           |
| Physics engines (cannon, rapier) | Rejected. A balance is one formula. Rapier is wasm, which reopens the CSP question, and floating-point determinism makes shareable puzzle codes unreliable                                                           |
| glTF + Draco/KTX2                | Rejected for the compressed variants only. They need `'wasm-unsafe-eval'`. Plain glTF is now affordable; procedural geometry is still preferable because `theme-core` can recolour it and a baked atlas cannot       |
| `<model-viewer>`                 | Rejected. It exists to show a product; there is no product here                                                                                                                                                      |

If Tier 2 ships, the runtime rules are not negotiable: `powerPreference:
'low-power'`, device pixel ratio capped at 2, no shadow maps (ambient occlusion
baked into vertex colours), no post-processing, rendering paused via
`IntersectionObserver` and `visibilitychange`, a `device.lost` or
`webglcontextlost` handler that swaps in the 2D diagram, and no rendering at
all when `prefers-reduced-motion: reduce` is set. The pixel-ratio cap is now a
thermal decision rather than a weak-GPU one: a child holds a phone for twenty
minutes, and a 3× backbuffer at 120 Hz is the quickest way to make it warm.

## Conditions that overturn this

This record is wrong the moment one of these is true:
1. A unit ships whose subject is genuinely three-dimensional (nets, sections,
   volume, projection). Then Tier 2 stops being hypothetical, and the answer is a
   WebGPU renderer behind a route-level import, not an engine retrofit.
2. The garden page measurably loses return visits against the board page, and
   the difference survives a parallax-only experiment. Even then the fix is
   depth cues, not a renderer.
3. A first load above 400 KB gzip is accepted for some other reason, at which
   point the payload argument above stops binding and only the accessibility
   and motion-policy arguments remain.

## Consequences

- The "no third-party origins" property holds, so `script-src 'self'` stays
  true and the E2E test that asserts zero off-origin requests keeps its meaning.
- The reduced-motion policy stays enforceable in one file.
- The site cannot show a child a rotating 3D object today. If that turns out to
  be the thing that makes a specific unit teachable, Tier 2 is one lazy import
  away — and it is recorded here so the decision is a threshold, not a taste.
- The balance game, whenever it ships, is specified as CSS 3D with torque
  physics and two scoring modes. That is the concrete deliverable of this ADR.

## Revision, same day — the target device assumption changed

A standing rule was set after this record was written: **old devices are out of
scope, and the target is the current iPhone or iPad.** That was not a detail.
It invalidates roughly half the reasoning above, and this section retracts that
half explicitly rather than quietly editing it out, because the surviving half
is what the decision now rests on and readers need to see which is which.

### Retracted

- **Cost 1, payload as fatal.** 150 KB on 5G against an A-series chip is not
  the difference between playing and leaving. Keep it as a cost; stop treating
  it as a veto. The related claim that "28 KB is the only advantage a
  competitor cannot copy" is withdrawn: on this target, speed is table stakes,
  and the moat is no accounts, no ads, no third-party requests, offline play,
  and a board a screen reader can read.
- **Cost 3, as written.** The cheap-Android GPU-process kill is not the
  scenario. The requirement survives unchanged — iOS still discards contexts
  when a tab is suspended or memory gets tight — but the reason is now
  OS-side resource management rather than weak hardware.
- **Cost 4's framing.** It survives as a fact but not as a defect of 3D
  specifically; any `requestAnimationFrame` loop escapes the duration tokens,
  including a 2D one.
- **"Babylon, rejected for 600 KB."** Size no longer decides anything here.
  It stays rejected for having nothing to author.
- **"WebGPU, rejected."** Fully withdrawn, and this is the largest correction.
  Safari 26.0 shipped WebGPU enabled by default on iOS 26, iPadOS 26 and
  macOS 26 in September 2025, and WebKit's release note says it "supersedes
  WebGL on macOS, iOS, iPadOS, and visionOS and is preferred for new sites and
  web apps". On the declared target, WebGL2 is the legacy API. Every
  recommendation that pointed at a WebGL2 wrapper for new work has been
  replaced above.

### Unaffected, and now load-bearing

These do not depend on the hardware, which is why the decision does not move
much even after half its support is removed:
1. **The content test.** None of the games shipped or planned is 3D-native.
   Tangram is a _flat_ dissection puzzle; the 3D version of it is a different
   puzzle, not a better one.
2. **Decoration does not teach.** Seductive-detail effects and the plain-versus-
   enriched balance-applet comparison are findings about children, not about
   chips.
3. **The orbit camera is not free for a six-year-old.** Perspective-taking
   develops through middle childhood. A faster GPU does not accelerate it.
4. **A canvas is opaque to assistive technology.** Device-independent.
5. **Wasm needs `'wasm-unsafe-eval'`.** A CSP fact, not a capability one. Note
   that a WebGPU renderer needs no wasm at all, so Tier 2 without compressed
   assets leaves `script-src 'self'` intact.

### Consequences

- The E2E matrix changes to match the assumption: the mobile project is now
  `iPhone 17 Pro` on **WebKit**, not `Pixel 7` on Chromium. Testing an Android
  phone for a product whose declared target is an iPhone tests the wrong
  engine — and iOS is WebKit all the way down, including Chrome and Firefox on
  iOS. Chromium stays for the desktop layout.
- Tier 1 acquires a hazard list, because `preserve-3d` is where Safari differs
  from Chromium in ways that matter for a balance beam: a flattening ancestor
  (`overflow: hidden`, `filter`, `opacity < 1`, `clip-path`, `mask`,
  `mix-blend-mode`) silently collapses the 3D, and a rounded card that clips its
  contents is exactly the container such a component wants. The beam must be
  tested in WebKit, not inferred from Chromium.
- Targeting current iOS also means every site added to the Home Screen now
  opens as a standalone web app with no manifest required. For a product whose
  promise is "no account, nothing to install", that is free distribution worth
  using.
- The decision itself — no engine today — is unchanged, but the margin is one
  argument wide instead of four. If a 3D-native unit ever ships, the case for
  building it will be strong and there is nothing left here to argue against
  it except accessibility and the motion policy.
