# ADR-008 — Deploy stays on `wrangler pages deploy`; `cf` has no path for this project

**Status:** Accepted · 2026-10-24
**Supersedes:** nothing · **Relates to:** [ADR-005](ADR-005-deploy-target.md)

## Background

On 2026-09-28 Cloudflare released `cf`, an agent-first CLI generated from its
own OpenAPI schema, covering more than 3,000 operations against Wrangler's
roughly 280. It ships as `1.0.0-beta.N` — beta.21 when this was measured — and
Cloudflare has said that once the beta ends it will publish a final major
version of Wrangler pointing users at `cf`, then keep Wrangler on maintenance
for 18 months.

That timeline makes "should this repo's deploy move to `cf`" a fair question. It
deploys with `npx wrangler@4 pages deploy`, driven by `wrangler.toml`.

## Investigation

Measured against the tool, not against the announcement.

`cf pages deploy [directory]` does exist, and its help text gives the positional
as "Pages build output directory **(not deployed by cf)**". It takes no
`--project-name`, no `--branch`, no `--commit-dirty` — only `--dry-run`.

`packages/cli/src/commands/pages/deploy/command.ts` contains no upload code at
all. The handler checks whether a Wrangler Pages cache exists and, in both
branches, prints guidance and throws `CliExit(1)`:

> Legacy Pages is not supported in `cf`. Please use `npx wrangler pages deploy`
> for this project.

`.changeset/pages-deploy-guidance.md` states the same rule in release notes:
existing legacy Pages projects are directed to `wrangler pages deploy`; new
projects are directed to `cf deploy` for **Pages on Workers**, "without
attempting a deployment".

`cf pages deploy` is therefore a signpost, not a deployer — and it points back
at the tool this repo already uses.

## Decision

**Keep `pnpm deploy` on `npx wrangler@4 pages deploy`.** This project is a
legacy Pages direct-upload project: `wrangler.toml` names the project and
`pages_build_output_dir`. `cf` has no code path for that shape, by design.

This is not a judgement against `cf`. It is the observation that for this
project shape, Cloudflare's own answer to "use `cf` instead" is "use Wrangler".

## Consequences

- **The deprecation clock has not started.** Wrangler's 18-month maintenance
  window opens when the beta ends and a final major version ships. Nothing
  expires today, and this decision does not need revisiting until that date
  exists.
- **The real migration, when it comes, is architectural.** `cf deploy` targets
  Pages _on Workers_: `wrangler.toml` gives way to `cloudflare.config.ts`, and
  the build moves onto the Cloudflare Vite plugin and Rolldown. That changes the
  hosting model, not just the command, and it warrants its own ADR rather than a
  swap inside `package.json`.
- **What to watch:** the beta's end date; whether `cf` ever grows a legacy Pages
  path (the changeset suggests it will not); and whether Wrangler's final major
  version breaks `pages deploy` inside the maintenance window.
- **If this decision is wrong, it costs one line.** The failure mode is loud:
  `pnpm deploy` either uploads or it does not. There is no silent degradation
  to guard against, which is why this needs a record rather than a test.
