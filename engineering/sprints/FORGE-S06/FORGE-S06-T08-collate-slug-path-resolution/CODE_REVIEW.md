# CODE REVIEW — FORGE-S06-T08: Update collate path resolution for slug-named directories

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T08

---

**Verdict:** Approved

---

## Review Summary

The implementation correctly extends `collate.cjs` with two complementary fixes: (1) `sprintDir` in the MASTER_INDEX task link generation now uses `sprint.path` (basename) when available, matching the existing COST_REPORT pattern exactly; (2) the `t.path` branch was fixed to use `rel` directly (not `path.dirname(rel)`) for engineering-rooted task paths, eliminating a pre-existing bug where all task links resolved to their sprint directory rather than their task subdirectory. Both fixes are minimal, use only Node.js built-ins, and preserve full backwards compatibility. The version bump (0.7.9→0.7.10), migration entry, security scan, and README update are all in place.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | Pass | Only `fs`, `path`, `./store.cjs` imported — no change |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | Pass | `readConfig()` exits 1; main body exits 1 on sprint not found. No top-level catch — pre-existing pattern accepted (same as prior reviews) |
| `--dry-run` supported where writes occur | Pass | `DRY_RUN` checked before all `writeFile` calls — unchanged |
| Reads `.forge/config.json` for paths (no hardcoded paths) | Pass | `engPath` from config; no hardcoded `'engineering/'` strings in new code |
| Version bumped if material change | Pass | 0.7.9 → 0.7.10 in `forge/.claude-plugin/plugin.json` |
| Migration entry present and correct | Pass | Entry `"0.7.9"` → `"0.7.10"` with `regenerate: []`, `breaking: false` |
| Security scan report committed | Pass | `docs/security/scan-v0.7.10.md` written; README table updated |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | Pass | Exit 0 on `forge/tools/collate.cjs` |
| `validate-store --dry-run` exits 0 | N/A | No schema changes; pre-existing event errors are unrelated |
| No prompt injection in modified Markdown files | N/A | No Markdown files under `forge/commands/`, `forge/meta/`, or `forge/hooks/` modified |

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. **Additional fix beyond task scope**: The implementation also fixed a pre-existing bug in the `t.path` branch where `path.dirname(rel)` incorrectly resolved task directories to their parent sprint directory. This is directly relevant to acceptance criterion 3 ("generates correct MASTER_INDEX.md for slug-named directories") — without this fix, the sprint.path fix for `sprintDir` would have had no visible effect since all S06 tasks have `t.path` set. The fix is minimal (adds a path-prefix check) and does not change behavior for non-engineering-rooted paths.

2. **T07's path format**: FORGE-S06-T07 has `t.path = "forge/tools/seed-store.cjs"` (a plugin source file, not an engineering task directory). The new branch correctly identifies this as non-engineering-rooted and falls through to the existing `path.dirname(rel)` behavior, producing `../forge/tools/INDEX.md`. This link was also present in the old MASTER_INDEX.md before T07 was committed, so the behavior is preserved.

3. **Legacy S01-S05 task links improved**: The fix also corrects task links for S01-S05 tasks whose `t.path` values are `engineering/sprints/FORGE-S01/T01`-style paths. These now resolve to `sprints/FORGE-S01/T01/INDEX.md` instead of the incorrect `sprints/FORGE-S01/INDEX.md`. This is an unplanned improvement but strictly correct.
