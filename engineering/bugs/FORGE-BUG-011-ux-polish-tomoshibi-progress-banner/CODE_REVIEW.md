# CODE REVIEW — FORGE-BUG-011: UX polish — tomoshibi uppercase prefix, progress IPC personality, ensure-ready banner collapse

🌿 *Forge Supervisor*

**Task:** FORGE-BUG-011
**Iteration:** 2

---

**Verdict:** Approved

---

## Review Summary

Iteration 1 returned Revision Required for a single blocker: the v0.19.0 security
scan report was missing. That blocker is now resolved. The full scan report has
been filed, the scan index was updated, and the README security table was
rotated to show exactly three rows (v0.19.0 prepended, v0.15.0 rolled off).
All iteration-1 implementation findings remain intact — no inadvertent
regressions were introduced while producing the scan artefacts.

---

## Iteration 2 — Blocker Resolution

### 1. `docs/security/scan-v0.19.0.md` — PRESENT

- File exists: 109 lines, 11,724 bytes.
- Not a summary stub — it is the full scan report in the canonical format used
  by prior scans. It contains `### Summary` (166 files scanned, 0 critical,
  3 warnings, 4 info), per-finding sections with Check/Issue/Excerpt/
  Recommendation blocks, a `### New in v0.19.0` delta paragraph citing the
  `preflight-gate.cjs` fix (commit `3576f59`), a comprehensive `### Clean Areas`
  enumeration covering all hooks/tools/commands/schemas, and a terminal
  `### Verdict` block stating `**SAFE TO USE**`.
- The three warnings are carry-forwards from v0.18.1 (check-update `/tmp` cache,
  version-check HTTPS GET, `FORGE_SKIP_WRITE_VALIDATION` bypass) — all accepted
  with prior justification. No new findings introduced by the v0.19.0 delta.

### 2. `docs/security/index.md` — v0.19.0 ROW PREPENDED

```
| 0.19.0 | 2026-04-19 | [scan-v0.19.0.md](scan-v0.19.0.md) | 166 files — 0 critical, 3 warnings, 4 info — SAFE TO USE |
| 0.18.1 | 2026-04-19 | [scan-v0.18.1.md](scan-v0.18.1.md) | 166 files — 0 critical, 3 warnings, 4 info — SAFE TO USE |
| 0.18.0 | 2026-04-19 | [scan-v0.18.0.md](scan-v0.18.0.md) | ... |
```

New row at top of table (line 8), row ordering preserved below. Link target
resolves to the sibling file written under check 1. Summary counts match the
scan report exactly.

### 3. `README.md` Security table — EXACTLY 3 ROWS, v0.19.0 AT TOP

Lines 288–294:

```
| Version | Date | Report | Summary |
|---------|------|--------|---------|
| 0.19.0 | 2026-04-19 | [scan-v0.19.0.md](docs/security/scan-v0.19.0.md) | 166 files — 0 critical, 3 warnings, 4 info — SAFE TO USE |
| 0.18.1 | 2026-04-19 | [scan-v0.18.1.md](docs/security/scan-v0.18.1.md) | 166 files — 0 critical, 3 warnings, 4 info — SAFE TO USE |
| 0.18.0 | 2026-04-19 | [scan-v0.18.0.md](docs/security/scan-v0.18.0.md) | 166 files — 0 critical, 1 warning, 2 info — SAFE TO USE |

[Full scan history →](docs/security/index.md)
```

Exactly three data rows (v0.15.0 correctly rolled off per CLAUDE.md invariant).
"Full scan history" link preserved.

---

## Implementation Re-verification (Spot Check)

- `forge/tools/store-cli.cjs` lines 749–760: stdout summary block still
  present. `fs.appendFileSync` precedes `process.stdout.write(summary + '\n')`
  with the persona emoji resolved via the lazy `require('./banners.cjs')`
  try/catch fallback. Unchanged since iteration 1.
- `forge/tools/ensure-ready.cjs` lines 248–274: `_renderAnnouncement(p, opts)`
  remains a pure single-line function; exported at line 273 with
  `_renderAnnouncement,   // exported for testing`; CLI `--announce` path at
  line 351 writes `_renderAnnouncement(...) + '\n'` to stdout. Unchanged.
- `forge/.claude-plugin/plugin.json` `version` field reads `"0.19.0"`. Confirmed
  via `node -e "console.log(require('...').version)"`.
- `node --test forge/tools/__tests__/*.test.cjs` → **tests 500, pass 500,
  fail 0** (duration 448 ms). No regressions.

---

## Cross-check — `git diff --name-only` since iteration 1

Newly present files matching the expected list:

- `docs/security/scan-v0.19.0.md` (new, untracked — as expected)
- `docs/security/index.md` (modified — row prepended, as expected)
- `README.md` (modified — security table updated, as expected)

No other source files under `forge/` were touched between iterations — the
scan artefacts were the only work done. The working tree otherwise matches the
iteration-1 approved state (store-cli.cjs, ensure-ready.cjs, test files,
tomoshibi.md, integrity.json, plugin.json, migrations.json, CHANGELOG.md
all unchanged since iteration 1).

---

## Verdict Rationale

Iteration 1's single blocker is cleanly resolved. The scan report is full,
verdict is SAFE TO USE, index and README tables are updated per the
CLAUDE.md release checklist (step 6). All previously-approved implementation
work is intact. 500/500 tests pass. Nothing else requires attention.

**Verdict:** Approved
