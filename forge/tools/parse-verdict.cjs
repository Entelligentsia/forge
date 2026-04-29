'use strict';

// Closed verdict vocabulary. Anything outside this map yields null so the
// orchestrator halts loudly instead of guessing from reviewer prose.
const APPROVED = new Set(['approved', 'approve']);
const REVISION = new Set([
  'revision required',
  'revision',
  'needs revision',
  'changes requested',
]);

const VERDICT_LINE = /^[ \t]*\*\*verdict:\*\*[ \t]*(.+?)[ \t]*$/gim;

function parseVerdict(markdown) {
  if (typeof markdown !== 'string' || markdown.length === 0) return null;

  let lastValue = null;
  let match;
  VERDICT_LINE.lastIndex = 0;
  while ((match = VERDICT_LINE.exec(markdown)) !== null) {
    lastValue = match[1];
  }
  if (lastValue === null) return null;

  const normalised = lastValue
    .trim()
    .replace(/^\[(.*)\]$/, '$1')
    .trim()
    .toLowerCase();

  if (APPROVED.has(normalised)) return 'approved';
  if (REVISION.has(normalised)) return 'revision';
  return null;
}

module.exports = { parseVerdict };

// CLI shim: `node parse-verdict.cjs <path-to-review.md>`
// stdout: "approved" | "revision" | "unknown"
// exit codes: 0 approved, 1 revision, 2 unknown/malformed
if (require.main === module) {
  const fs = require('node:fs');
  const path = process.argv[2];
  if (!path) {
    process.stderr.write('Usage: parse-verdict.cjs <path-to-review.md>\n');
    process.exit(2);
  }
  let contents;
  try {
    contents = fs.readFileSync(path, 'utf8');
  } catch (err) {
    process.stderr.write(`parse-verdict: cannot read ${path}: ${err.message}\n`);
    process.exit(2);
  }
  const verdict = parseVerdict(contents);
  if (verdict === 'approved') {
    process.stdout.write('approved\n');
    process.exit(0);
  }
  if (verdict === 'revision') {
    process.stdout.write('revision\n');
    process.exit(1);
  }
  process.stdout.write('unknown\n');
  process.exit(2);
}
