## Security Scan — forge:forge — 2026-04-14

**SHA**: source scan (no gitCommitSha) | **Installed**: local source | **Last updated**: 2026-04-14
**Scope**: source directory | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 0 critical | 2 warnings (carry-forward, accepted) | 4 info

### Changed files in this version (delta from v0.8.2)
- `forge/.claude-plugin/plugin.json` — version bump only
- `forge/migrations.json` — new migration entry for 0.8.2→0.8.3
- `forge/tools/collate.cjs` — added `--purge-events` flag with path-traversal guard
- `forge/meta/workflows/meta-retrospective.md` — updated to use `collate --purge-events`
- `forge/meta/workflows/meta-fix-bug.md` — updated to use `collate --purge-events`

All other files are unchanged from prior scans and carry forward clean status.

### Findings

#### [WARNING] hooks/check-update.js:77 (carry-forward)
- **Check**: A — outbound network call
- **Issue**: Outbound HTTPS GET on SessionStart, throttled 24h, destination is `raw.githubusercontent.com/Entelligentsia/forge` version manifest. No user data transmitted.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe — justified version check. No action required.

#### [WARNING] commands/update.md:853 lines (carry-forward)
- **Check**: B — long file
- **Issue**: Above 500-line threshold. Reviewed in full across prior scans; no hidden instructions.
- **Excerpt**: File ends with `## On error` / `/forge:report-bug` guidance.
- **Recommendation**: Safe — length justified by workflow complexity. No action required.

#### [INFO] tools/collate.cjs:516-528 — new `rmSync` call
- **Check**: A/D — destructive file operation
- **Issue**: `fs.rmSync(eventsDir, { recursive: true, force: true })` deletes a directory tree. Path is constructed from user-supplied CLI argument `SPRINT_ARG`. **During this scan, a path traversal vulnerability was identified and fixed in the same version**: without a containment check, a `SPRINT_ARG` value of `../../etc` would resolve outside the store root. The fix adds `path.resolve` + `startsWith(eventsBase + path.sep)` guard that exits with code 1 before any deletion if the resolved path escapes the events directory.
- **Excerpt**: `if (!eventsDir.startsWith(eventsBase + path.sep) && eventsDir !== eventsBase) { ... process.exit(1); }`
- **Recommendation**: Fixed in this version. Guard verified — traversal paths (`../../../etc`, `../../passwd`) are blocked; legitimate IDs (`FORGE-S06`, `BUG-001`) are allowed. No further action required.

#### [INFO] meta-retrospective.md — `node` subprocess instruction
- **Check**: B — command execution in workflow
- **Issue**: New Finalize step instructs the generated workflow to run `node "$FORGE_ROOT/tools/collate.cjs" {sprintId} --purge-events`. `$FORGE_ROOT` is the plugin root resolved from `CLAUDE_PLUGIN_ROOT` (trusted), `{sprintId}` is the current sprint ID from the project store. Operation is project-local, preceded by COST_REPORT generation.
- **Excerpt**: `Run node "$FORGE_ROOT/tools/collate.cjs" {sprintId} --purge-events`
- **Recommendation**: Safe — deterministic tool call replacing prior ad-hoc file deletion prose. Path traversal guard in collate.cjs limits blast radius to the store events directory.

#### [INFO] meta-fix-bug.md — `node` subprocess instruction
- **Check**: B — command execution in workflow
- **Issue**: Same pattern as retrospective — calls `node "$FORGE_ROOT/tools/collate.cjs" {bugId} --purge-events`. Bug IDs are not sprint IDs so COST_REPORT generation is skipped; only the purge runs. Same path traversal guard applies.
- **Excerpt**: `Run node "$FORGE_ROOT/tools/collate.cjs" {bugId} --purge-events`
- **Recommendation**: Safe — same rationale as retrospective finding above.

### Clean Areas
- `hooks/` (all three .js files) — unchanged, clean
- `tools/` (all other 6 `.cjs` files) — unchanged, clean
- All `meta/` files except the two workflow changes reviewed above — unchanged, clean
- `commands/` — unchanged from v0.8.2, clean (update.md warning carry-forward)
- `init/` — unchanged, clean
- `schemas/` — unchanged, clean
- No binary files, compiled artifacts, or misleading extensions
- No zero-width Unicode in any changed file
- No credential reads, eval, persistence mechanisms, or shell init writes anywhere

### Verdict

**SAFE TO USE**

102 files scanned. One latent path traversal vulnerability in the new `--purge-events` code was identified and remediated during this scan — the fix ships in the same version (0.8.3). All other findings are carry-forwards (accepted) or informational notes on the new deterministic tool invocations. No critical issues remain.
