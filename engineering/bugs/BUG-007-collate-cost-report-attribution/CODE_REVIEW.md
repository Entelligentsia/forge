# CODE REVIEW — BUG-007: collate COST_REPORT.md path fallback + (unknown) attribution

🌿 *Forge Supervisor*

**Task:** BUG-007

---

**Verdict:** Approved

---

## Review Summary

Both fixes are correct, minimal, and backwards-compatible. The `resolveDir` numeric glob fallback (lines 62-78) correctly handles sprint IDs without hyphens by scanning sorted directory entries for a first-integer match, and the `loadSprintEvents` attribution backfill (lines 284-307) correctly parses sidecar filenames with a strict regex guard that prevents misattribution from malformed filenames. Version bump, migration entry, and security scan are all in order.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `fs` and `path` used (lines 8-9) |
| Hook exit discipline (exit 0 on error, not non-zero) | 〇 | No hooks modified in this change |
| Tool top-level try/catch + exit 1 on error | △ | Pre-existing: collate.cjs lacks a top-level try/catch. Not introduced by this change — advisory only |
| `--dry-run` supported where writes occur | 〇 | Pre-existing `DRY_RUN` flag at line 10, not affected by changes |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | `storeRoot`, `engRoot` derived from config (verified in `readConfig()`) |
| Version bumped if material change | 〇 | `0.6.11` to `0.6.12` in `forge/.claude-plugin/plugin.json` |
| Migration entry present and correct | 〇 | `"0.6.11"` key, `regenerate: []`, `breaking: false`, notes accurate |
| Security scan report committed | 〇 | `docs/security/scan-v0.6.12.md` written, README table updated |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | 〇 | Independently verified — exit 0, no output |
| `validate-store --dry-run` exits 0 | 〇 | Per PROGRESS.md — 6 sprints, 21 tasks, 7 bugs |
| No prompt injection in modified Markdown files | N/A | No Markdown files under `forge/` modified |

## Issues Found

None. Both changes match the approved PLAN.md exactly.

## Independent Verification

### Change 1 — `resolveDir` (lines 62-78)

- Exact-match loop preserved unchanged (lines 63-65).
- Numeric glob fallback only triggers when no candidate matches on disk.
- `fs.existsSync(base)` checked before `readdirSync(base)` — safe if base dir does not exist.
- `parseInt(numMatch[0], 10)` avoids octal ambiguity.
- `.sort()` ensures deterministic directory selection.
- Empty `candidates` array would cause `last` to be `undefined` and `last.match(...)` to throw, but all four call sites always pass at least one candidate — acceptable.

### Change 2 — `loadSprintEvents` (lines 284-307)

- `USAGE_RE` pattern (`/^\d{8}T\d{9}Z_[A-Z0-9-]+_[a-z-]+_[a-z_-]+$/`) correctly matches the documented sidecar filename format.
- `f.replace(/(_usage)?\.json$/, '')` strips both `_usage.json` and plain `.json` suffixes.
- `parts[1]` isolates the taskId correctly because task IDs use hyphens (not underscores).
- Backfill is guarded by `if (!ev.taskId || !ev.role)` — existing fields never overwritten.
- `if (!ev) return null` added before backfill logic — prevents null dereference, consistent with downstream `.filter(Boolean)`.
- Non-matching filenames silently skipped — no error thrown.

### Change 3 — `plugin.json`

- Version correctly bumped from `0.6.11` to `0.6.12`.
- `updateUrl` and `migrationsUrl` unchanged and correct for main branch.

### Change 4 — `migrations.json`

- `"0.6.11"` key with `"version": "0.6.12"` — correct chain link.
- `"regenerate": []` — correct, no user-facing regeneration needed.
- `"breaking": false`, `"manual": []` — correct, no manual steps required.
- `"date": "2026-04-12"` — matches today's date.

---

## Approved

### Advisory Notes

1. **Pre-existing: no top-level try/catch in collate.cjs.** The stack checklist requires top-level `try/catch` with `process.exit(1)` for tool files. collate.cjs predates this rule and lacks one. Not introduced by this change, but worth addressing in a future housekeeping task.

2. **Edge case: multiple directories with same first integer.** If `base` contains both `sprint_31_alpha/` and `sprint_31_beta/`, `resolveDir` returns the first alphabetically (`sprint_31_alpha/`). This is deterministic but could be surprising if two directories share the same numeric prefix. In practice, Forge never creates multiple sprint directories with the same number, so this is a theoretical concern only.
