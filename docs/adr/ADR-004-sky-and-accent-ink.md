# ADR-004 — Split the accent from the label, and add a decorative colour

**Status:** Accepted · 2026-10-21
**Amends:** [ADR-002](ADR-002-theme-as-nine-colours.md)

## Background

ADR-002 settled the shape of a theme: a handful of base colours, everything else
derived. That held up. What it did not settle is **how saturated a theme is
allowed to be**, and the first shipped palette quietly answered "not very".

Measured in OKLCH, the five built-in moods topped out at chroma **0.123–0.156**
while children's brands sit around **0.198**. Pixel measurement of the home page
was worse than the palette suggested: mean chroma **0.0141**, with **98%** of the
screen below C 0.05. The site was calm, coherent and completely unmemorable.

The cause was structural, not aesthetic. One colour cannot be all three of:
- readable text on a near-white surface (needs to be dark → capped chroma)
- a filled button behind white text (needs to be mid-dark → capped chroma)
- a large, bright block of colour (needs high chroma)

`accent` was being asked to do all three, so the binding constraint — 4.5:1 white
text — dragged the whole palette down to the quietest of its jobs.

## Decision

Add two roles and give the accent a job it can actually win.

| role             | obligation                                          | chroma                |
| ---------------- | --------------------------------------------------- | --------------------- |
| `bg` / `surface` | 4.5:1 body text                                     | low                   |
| `brand`          | 4.5:1 as text (links, focus, selection)             | capped                |
| `accent`         | owns ~26% of the viewport; **label is `accentInk`** | uncapped              |
| `accentInk`      | 4.5:1 on `accent`                                   | derived, never chosen |
| `sky`            | decorative wash; only `ink` ever sits on it         | uncapped              |

Two rules follow, and they are the whole ADR:
1. **A bright fill is only legal if it ships with its own label colour.**
   `deriveAccentInk()` tries the theme's `ink`, then `#141412`, then pure black
   or white — for any sRGB fill one of black/white clears 4.58:1, so a label can
   never be illegible no matter what a child picks.
2. **Decoration gets its own colour so it can be loud without owing anyone
   contrast.** `sky` carries the largest single area on the site (a gradient on
   `body`, from the top of the document to ~1520px) and has no text obligation
   beyond `ink`, which is near-black anyway.

Colour count per theme goes from eight to ten (eleven with `brandSolid` /
`brandInk` on the dark moods). The studio exposes eight wells: `accentInk` is
derived, `brandSolid`/`brandInk` only appear in dark moods.

The wire format appends `sky` and `accentInk` at the end. Nothing is inserted, so
a share link made before this change still decodes to the same colours; the two
missing roles are derived on the way in.

## Consequences

**Good.** Area-weighted chroma went from 0.0141 to 0.0376 (2.7×), and the 99th
percentile from 0.093 to 0.160 — into the children's-brand band — with every one
of the eight contrast pairs still passing in all five moods. The palette is
guarded by 42 assertions in `packages/theme-core/tests/palette.test.ts`, so it
cannot drift back to pastel one hex at a time.

**Bad.** Two more colours to reason about, and a new failure mode: `accent` with
a wrong `accentInk` is worse than a dull accent. Mitigated by deriving it and
auditing it, but a hand-edited theme can still get it wrong — the studio shows
the pair and offers the repair.

**Also bad.** Chroma floors are now asserted in tests, which means a future mood
that is deliberately restrained will fail the build. That is intentional: the
floor exists because restraint was the failure mode. A genuinely muted mood
should be argued for in a new ADR, not slipped in.

## Alternatives rejected

**Saturate `bg`.** Would have raised area-weighted chroma fastest and cheapest.
Rejected because every card, table and keypad would sit on a coloured field, and
the site would read as a toy shop rather than a garden.

**Let the accent be the button fill and accept white text.** That is what v0.1
did, and it is why the accent was stuck at C 0.14.

**Keep eight colours and derive `sky` from `surface`.** Tried; a wash mixed from
the paper colour is grey by definition, so it cannot do the job the accent
cannot.

## Related

- [DESIGN-REVIEW-v0.2.md](../DESIGN-REVIEW-v0.2.md) — the measurements and the
  prioritised list this decision came out of.
- [ADR-002](ADR-002-theme-as-nine-colours.md) — the derivation model this
  extends. Its count is superseded; its reasoning is not.
