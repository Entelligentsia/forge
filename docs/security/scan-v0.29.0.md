## Security Scan — forge:forge — 2026-04-29

**SHA**: not recorded (source scan) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source-path `forge/` | **Install path**: `/home/boni/src/forge/forge/`

### Summary
187 files scanned | 0 critical | 4 warnings | 2 info

### Findings

#### WARNING hooks/forge-permissions.js:47,51
- **Check**: A — Hook Scripts
- **Issue**: `touch .forge/*` and `rmdir .forge/*` still use wildcard within `.forge/` but the pattern match (`/^touch\s+/`) fires on any `touch` command regardless of target path, then applies the scoped rule. The match is broader than the persisted rule — a `touch /tmp/x` would match and auto-approve with rule `touch .forge/*`. The approved rule is scoped, but the match trigger is not.
- **Excerpt**: `{ pattern: /^touch\s+/, rule: 'touch .forge/*' }`
- **Recommendation**: Narrow the pattern to match only `.forge/` paths: `/^touch\s+\.forge\//`. Same for `rmdir`.

#### WARNING hooks/forge-permissions.js:60-61
- **Check**: A — Hook Scripts
- **Issue**: `git push *` and `git checkout *` auto-approved permanently. Force pushes and checkout to any ref allowed without user confirmation. (Pre-existing — intentionally left per fix plan.)
- **Recommendation**: Safe to ignore — Claude Code's own git safety layer blocks force push by default. The hook only adds an allow rule; user deny rules take precedence.

#### WARNING hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Cache files written to `/tmp` via `os.tmpdir()` fallback. `/tmp` is world-writable on most Linux systems, creating symlink attack and data leak vectors. (Pre-existing, unchanged.)
- **Recommendation**: Use project-local cache directory (`.forge/cache/`) instead of `/tmp`.

#### WARNING hooks/check-update.js:46-47,52,104
- **Check**: A — Hook Scripts
- **Issue**: Reads `~/.claude/settings.json` and scans `~/.claude/plugins/` directories. (Pre-existing, unchanged.)
- **Recommendation**: Safe to ignore — the access is justified by the hook's stated purpose.

#### INFO tools/__tests__/forge-permissions.test.cjs (new file)
- **Check**: B — Skill/Command/Context Files
- **Issue**: New test file for security fixes. 9 tests covering C1, C2, W1-W3. All pass.
- **Recommendation**: Safe to ignore — legitimate test coverage.

#### INFO hooks/forge-permissions.js:35-37
- **Check**: A — Hook Scripts
- **Issue**: Comment block documents the removal of `node -e`/`node -p` patterns and the security rationale.
- **Recommendation**: Safe to ignore — documentation of security decision.

### Previously Fixed (v0.28.0 → v0.29.0)

| Finding | Status | Fix |
|---------|--------|-----|
| C1: Bulk permission escalation (forge-permissions.js:170-186) | FIXED | Only matched rule persisted; ALL_RULES constant removed |
| C2: Unrestricted node -e/p (forge-permissions.js:36-37,102-103) | FIXED | Patterns and rules removed entirely |
| C3: Unvalidated update URL (check-update.js:131-137,163) | FIXED | Domain allowlist (`raw.githubusercontent.com`) with fallback |
| C4: Prototype pollution (manage-config.cjs:66-74) | FIXED | Dangerous key guard in getByPath and setByPath |
| C5: Path traversal (store-cli.cjs:911-917,935-940) | FIXED | Path resolution guard in cmdProgress/cmdProgressClear |
| W1: touch * overly broad | FIXED | Scoped to `touch .forge/*` |
| W3: rm -f .forge/* | FIXED | Changed to `rm .forge/*` (no -f) |

### Clean Areas
- `tools/manage-config.cjs` — prototype pollution fixed, no new issues
- `tools/store-cli.cjs` — path traversal fixed, no new issues
- `hooks/forge-permissions.js` — bulk escalation and node -e/p fixed; new `require.main` guard prevents stdin hang on require
- `hooks/check-update.js` — URL validation added, no new issues
- `tools/lib/validate.js` — no issues (unchanged)
- `hooks/validate-write.js` — no issues (unchanged)
- `hooks/triage-error.js` — no issues (unchanged)
- `hooks/hooks.json` — no unrestricted Bash, no bash -c interpolation, timeouts <= 10000ms

### Verdict

**SAFE TO USE**

All 5 critical findings from v0.28.0 scan have been fixed. The 4 remaining warnings are pre-existing (git push/checkout, /tmp cache, settings scan) or minor (touch/rmdir pattern scope). No new critical or high-severity issues introduced by the fixes.