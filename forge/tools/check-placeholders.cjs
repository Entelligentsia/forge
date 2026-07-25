#!/usr/bin/env node
/**
 * check-placeholders.cjs — post-materialization gate.
 *
 * Fails when a generated file still carries a literal placeholder, in either of
 * the two ways that happens:
 *
 *   1. An unsubstituted `{{KEY}}` — the source used the right form but the key
 *      is missing from `substitute-placeholders.cjs`'s map.
 *   2. A single-brace `{KEY}` for a known substitution key — an authoring
 *      error. `substitute-placeholders.cjs` matches `/\{\{KEY\}\}/` only, so a
 *      single-brace token is never substituted and reaches the subagent as
 *      literal text. This is how `{SYNTAX_CHECK}` and `{BUILD_COMMAND}` shipped
 *      into every materialized implement_plan.md (#47).
 *
 * Runtime passthrough keys (`{{SPRINT_ID}}`, `{{DATE}}`, …) are filled later by
 * collate.cjs and are NOT failures.
 *
 * Usage:
 *   node check-placeholders.cjs <file-or-dir> [more...]
 *
 * Exit codes: 0 clean · 1 placeholders found · 2 usage error.
 */

const fs = require('node:fs');
const path = require('node:path');

const { RUNTIME_PASSTHROUGH_KEYS } = require('./substitute-placeholders.cjs');

/**
 * Substitution keys that must always appear in double-brace form. A
 * single-brace occurrence of one of these is an authoring bug, not prose.
 */
const SUBSTITUTION_KEYS = new Set([
  'PROJECT_NAME',
  'PREFIX',
  'TEST_COMMAND',
  'LINT_COMMAND',
  'BUILD_COMMAND',
  'SYNTAX_CHECK',
  'KB_PATH',
  'ENTITY_MODEL',
  'DATA_ACCESS',
  'KEY_DIRECTORIES',
]);

/**
 * Find literal placeholders in a file's text.
 *
 * @param {string} text
 * @returns {Array<{line: number, token: string, reason: string}>}
 */
function findPlaceholders(text) {
  const found = [];
  const lines = text.split('\n');

  // Prose that describes the token syntax wraps it in an inline code span
  // (e.g. "`{{KEY}}` tokens that survived substitution"). That is a reference,
  // not an unsubstituted value.
  const isBacktickWrapped = (line, m) =>
    line[m.index - 1] === '`' && line[m.index + m[0].length] === '`';

  lines.forEach((line, i) => {
    // Pass 1 — a known substitution key left unsubstituted. Scoped to
    // SUBSTITUTION_KEYS on purpose: workflows legitimately carry template
    // tokens the substitution engine never owns (enhance.md's report skeleton
    // uses {{KEY1}}, {{KEY2}} as illustrative names the agent fills at
    // runtime). Keeping this set in sync with the engine's map is enforced by
    // check-placeholders.test.cjs, not by guessing here.
    for (const m of line.matchAll(/\{\{([A-Za-z][A-Za-z0-9_-]*)\}\}/g)) {
      const key = m[1];
      if (RUNTIME_PASSTHROUGH_KEYS.has(key)) continue;
      if (!SUBSTITUTION_KEYS.has(key)) continue;
      if (isBacktickWrapped(line, m)) continue;
      found.push({
        line: i + 1,
        token: m[0],
        reason: `unsubstituted placeholder — '${key}' should have been filled at materialize time`,
      });
    }

    // Pass 2 — single-brace form of a known substitution key. Guard against
    // matching the inner half of a `{{KEY}}` by requiring a non-brace neighbour.
    for (const m of line.matchAll(/(^|[^{])\{([A-Za-z][A-Za-z0-9_-]*)\}([^}]|$)/g)) {
      const key = m[2];
      if (!SUBSTITUTION_KEYS.has(key)) continue;
      // m[1] is the character before `{`; a backtick there with one after the
      // closing `}` (captured in m[3]) marks a documentation reference.
      if (m[1] === '`' && m[3] === '`') continue;
      found.push({
        line: i + 1,
        token: `{${key}}`,
        reason: `wrong brace form — substitution requires the double-brace {{${key}}} form; a single-brace token is never substituted`,
      });
    }
  });

  return found;
}

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.md')) out.push(p);
    }
  })(target);
  return out;
}

function main(argv) {
  if (argv.length === 0) {
    process.stderr.write('Usage: check-placeholders.cjs <file-or-dir> [more...]\n');
    return 2;
  }

  const findings = [];
  for (const target of argv) {
    let files;
    try {
      files = collectFiles(target);
    } catch (err) {
      process.stderr.write(`check-placeholders: cannot read '${target}': ${err.message}\n`);
      return 2;
    }
    for (const file of files) {
      for (const f of findPlaceholders(fs.readFileSync(file, 'utf8'))) {
        findings.push({ file, ...f });
      }
    }
  }

  if (findings.length === 0) {
    process.stdout.write('〇 No literal placeholders found\n');
    return 0;
  }

  process.stdout.write(`× ${findings.length} literal placeholder(s) found:\n\n`);
  for (const f of findings) {
    process.stdout.write(`  ${f.file}:${f.line}  ${f.token}\n      ${f.reason}\n`);
  }
  process.stdout.write('\nFix the source token or add the key to substitute-placeholders.cjs, then re-materialize.\n');
  return 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { findPlaceholders, SUBSTITUTION_KEYS };
