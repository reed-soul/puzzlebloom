#!/usr/bin/env node
// Response headers are written twice, in two dialects: `apps/web/public/_headers`
// for Cloudflare Pages and `vercel.json` for the fallback host. ADR-005 keeps
// both and argues the duplication costs nothing.
//
// It had already cost something. By 2026-10-24 the two copies disagreed — the
// Permissions-Policy differed by `interest-cohort=()`, and only `vercel.json`
// carried `X-Frame-Options` — so the fallback was quietly serving a different
// security posture than production. Nobody would have found that by reading
// either file alone.
//
// This check makes "the two stay in sync" enforceable instead of intended.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CF_PATH = 'apps/web/public/_headers';
const VC_PATH = 'vercel.json';

/** `/(.*)` and `/*` name the same rule; compare them as one. */
function normalizePattern(pattern) {
  return pattern.trim().replace(/\(\.\*\)$/, '*');
}

/**
 * Cloudflare's dialect: an unindented line opens a rule, indented lines are
 * `Name: value`, `#` comments anywhere.
 */
function parseCloudflare(text) {
  const rules = new Map();
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (!/^\s/.test(line)) {
      current = normalizePattern(trimmed);
      if (!rules.has(current)) rules.set(current, new Map());
      continue;
    }

    if (current === null) {
      throw new Error(`${CF_PATH}: header line before any path rule: ${trimmed}`);
    }
    const split = trimmed.indexOf(':');
    if (split === -1) {
      throw new Error(`${CF_PATH}: expected "Name: value", got: ${trimmed}`);
    }
    rules.get(current).set(trimmed.slice(0, split).trim().toLowerCase(), trimmed.slice(split + 1).trim());
  }

  return rules;
}

function parseVercel(text) {
  const rules = new Map();

  for (const entry of JSON.parse(text).headers ?? []) {
    const pattern = normalizePattern(entry.source);
    const headers = rules.get(pattern) ?? new Map();
    for (const { key, value } of entry.headers ?? []) {
      headers.set(key.trim().toLowerCase(), String(value).trim());
    }
    rules.set(pattern, headers);
  }

  return rules;
}

const cf = parseCloudflare(readFileSync(join(root, CF_PATH), 'utf8'));
const vc = parseVercel(readFileSync(join(root, VC_PATH), 'utf8'));

const problems = [];

for (const pattern of new Set([...cf.keys(), ...vc.keys()])) {
  const left = cf.get(pattern);
  const right = vc.get(pattern);

  if (!left) {
    problems.push(`${pattern}: present in ${VC_PATH}, missing from ${CF_PATH}`);
    continue;
  }
  if (!right) {
    problems.push(`${pattern}: present in ${CF_PATH}, missing from ${VC_PATH}`);
    continue;
  }

  for (const name of new Set([...left.keys(), ...right.keys()])) {
    const a = left.get(name);
    const b = right.get(name);

    if (a === undefined) {
      problems.push(`${pattern} ${name}: missing from ${CF_PATH}`);
    } else if (b === undefined) {
      problems.push(`${pattern} ${name}: missing from ${VC_PATH}`);
    } else if (a !== b) {
      problems.push(
        `${pattern} ${name}: the two copies disagree\n` +
          `      ${CF_PATH}: ${a}\n` +
          `      ${VC_PATH}: ${b}`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`Header configs have drifted (${problems.length}):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    `\nBoth files describe the same response headers. Fix both, or drop the one\n` +
      `that no longer applies and update ADR-005 to say so.`,
  );
  process.exit(1);
}

const headerCount = [...cf.values()].reduce((sum, headers) => sum + headers.size, 0);
console.log(
  `Headers agree across ${CF_PATH} and ${VC_PATH} ` + `(${cf.size} path rules, ${headerCount} headers).`,
);
