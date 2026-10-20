# ADR-002 — A theme is nine colours, and CSS derives the rest

**Status:** Accepted · 2026-10-20 · **Amended by** [ADR-004](ADR-004-sky-and-accent-ink.md)
(the derivation model stands; the colour count is now ten)

## Background

The positioning is "cartoon that a child can make their own". That means a
theme editor in the hands of a child, and it means themes must be shareable
without a backend. Two naive designs both fail:

1. **A theme is a full token set** (30+ values). A child changes six colours and
   the other twenty-four no longer match; the result looks broken, and the
   support surface is every combination.
2. **A theme is a stylesheet.** Sharing one means shipping arbitrary CSS from a
   stranger's clipboard into the DOM.

## Decision

A theme is exactly eight base colours: `bg`, `surface`, `ink`, `brand`,
`accent`, `danger`, `success`, plus `brandSolid`/`brandInk` for the dark moods
where one colour cannot be both readable text and a filled button.

Everything else — every tint, border, shadow and all nine board cell states — is
a `color-mix()` expression over those colours in `tokens.css`. Applying a theme
writes nine custom properties onto `<html>`.

Sharing packs the eight colours as base64url JSON in `?theme=`; on arrival the
payload is validated against a hex allow-list before it touches the DOM.

## Consequences

**Good.** A child's six-colour theme is coherent by construction. Adding a mood
is twelve lines. Switching is one style write, so it repaints instantly and
cannot leave a component out of sync. No CSS is ever accepted from a URL.

**Bad.** `color-mix()` requires a modern browser (Chrome 111+, Safari 16.2+).
Dark moods need explicit overrides where a small white mix is invisible — see
`:root[data-mood='dark']`. Contrast is not guaranteed by construction, which is
why the studio audits and repairs rather than trusting the picker.

## Related

The contrast guard (`packages/theme-core/src/contrast.ts`) is part of this
decision, not a separate nicety: a free colour picker without a measurement is a
promise the product cannot keep.
