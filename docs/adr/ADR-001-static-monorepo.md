# ADR-001 — Monorepo, static-first, no backend

**Status:** Accepted · 2026-10-20

## Background

The product will hold many small games. Each one wants its own logic, tests and
releases, but they share a shell, a theme system and a design kit. The audience
is children, which turns every "just add a server" idea into a compliance
problem: accounts for under-13s mean COPPA and GDPR-K, and a chat box means
moderation. None of that is needed to serve a puzzle.

## Decision

A pnpm workspace with three layers:
- `apps/web` — the only deployable. Static output.
- `games/*` — one package per game, exporting a manifest and a component.
- `packages/*` — engine, theme, UI kit. Framework-light, no side effects.

No server, no database, no auth. State lives in `localStorage`. Generation runs
in a Web Worker in the browser. Deployment target is any static host (Vercel,
Cloudflare Pages).

## Consequences

**Good.** Zero hosting cost beyond static files. Nothing to breach. The parent
page's promises are true by construction rather than by policy. Each game can be
tested in isolation, and a broken game cannot take down the shell.

**Bad.** No cross-device sync, no shared leaderboards, no content that needs
authoring server-side. If those become requirements, this ADR gets superseded
rather than quietly bent — a backend added "just for saves" would invalidate the
entire trust story the product is sold on.

## Related

ADR-002 (themes as tokens, so the UI has no styling dependency), ADR-003 (hints
generated locally, so no answer service is needed).
