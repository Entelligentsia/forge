## Security Scan — forge:forge — 2026-04-15

**SHA**: source scan (no gitCommitSha) | **Installed**: local source | **Last updated**: 2026-04-15
**Scope**: source directory | **Install path**: /home/boni/src/forge/forge/

### Summary
105 files scanned | 0 critical | 2 warnings (carry-forward, accepted) | 5 info

### Changed files in this version (delta from v0.8.3)
- `forge/.claude-plugin/plugin.json` — version bump to 0.9.0
- `forge/migrations.json` — new migration entry for 0.8.10→0.9.0
- `forge/schemas/sprint.schema.json` — added `goal` and `features` fields (T01)
- `forge/tools/store.cjs` — added `writeCollationState`, `purgeEvents`, `listEventFilenames` methods (T02)
- `forge/tools/collate.cjs` — replaced facade bypasses with store methods (T03)
- `forge/tools/validate-store.cjs` — removed embedded schemas, fixed facade bypass (T04)
- `forge/tools/store-cli.cjs` — **NEW** deterministic store custodian CLI (T05)
- `forge/meta/skills/meta-store-custodian.md` — **NEW** store custodian skill (T06)
- `forge/meta/tool-specs/store-cli.spec.md` — **NEW** tool spec (T06)
- `forge/meta/workflows/meta-*.md` — 16 files updated to use store custodian (T07)
- `forge/commands/migrate.md` — updated to use store custodian references (T08)

All other files are unchanged from prior scans and carry forward clean status.

### Findings

#### [WARNING] hooks/check-update.js:77 (carry-forward)
- **Check**: A — outbound network call
- **Issue**: Outbound HTTPS GET on SessionStart, throttled 24h, destination is `raw.githubusercontent.com/Entelligentsia/forge` version manifest. No user data transmitted.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe — justified version check. No action required.

#### [WARNING] commands/update.md:870 lines (carry-forward)
- **Check**: B — long file
- **Issue**: Above 500-line threshold. Reviewed in full across prior scans; no hidden instructions.
- **Excerpt**: File ends with `## On error` / `/forge:report-bug` guidance.
- **Recommendation**: Safe — length justified by workflow complexity. No action required.

#### [INFO] tools/store-cli.cjs — new file (747 lines)
- **Check**: A/D — new deterministic tool
- **Issue**: New CLI tool wraps store.cjs facade for all store operations. Uses only Node.js built-ins (`fs`, `path`) and the internal `store.cjs` module. Top-level try/catch with `process.exit(1)` on error. `--dry-run` flag honoured on all write commands. Includes `--force` flag on `update-status` that bypasses transition checks — emits a warning to stderr when used. No network calls, no credential reads, no eval, no shell spawning.
- **Excerpt**: `process.on('uncaughtException', (error) => { console.error('Fatal store-cli error:', error); process.exit(1); });`
- **Recommendation**: Safe — follows established tool patterns. The `--force` flag on `update-status` is a deliberate escape hatch for recovery scenarios; the stderr warning provides audit visibility.

#### [INFO] tools/store.cjs — new `purgeEvents` method
- **Check**: A/D — destructive file operation
- **Issue**: `fs.rmSync(eventsDir, { recursive: true, force: true })` deletes a directory tree. Path is constructed from `sprintId` parameter resolved against the store root. **Path traversal guard present**: `path.resolve` + `startsWith(eventsBase + path.sep)` check throws before deletion if the resolved path escapes the events directory.
- **Excerpt**: `if (!eventsDir.startsWith(eventsBase + path.sep) && eventsDir !== eventsBase) { throw new Error(...); }`
- **Recommendation**: Safe — traversal guard verified. Same pattern as collate.cjs `--purge-events` guard reviewed in v0.8.3.

#### [INFO] meta/skills/meta-store-custodian.md — new skill
- **Check**: B — skill/command file
- **Issue**: New skill instructs LLM workflows to use `store-cli.cjs` as the sole gateway for store mutations. Contains invocation patterns table. No prompt injection patterns, no hidden instructions, no permission escalation. The `--force` flag usage on `update-status` is documented for recovery only.
- **Recommendation**: Safe — well-structured, no injection vectors.

#### [INFO] tools/store-cli.cjs:648 — `fs.unlinkSync` on sidecar merge
- **Check**: A/D — file deletion
- **Issue**: After merging sidecar fields into the canonical event, the sidecar file is deleted via `fs.unlinkSync(scPath)`. The `scPath` is constructed from `sidecarPath(sprintId, eventId)` which resolves to `.forge/store/events/{sprintId}/_{eventId}_usage.json` — a fixed, well-scoped path within the store directory. The `sprintId` and `eventId` come from CLI arguments, but the path is always within the events subdirectory.
- **Excerpt**: `fs.unlinkSync(scPath);`
- **Recommendation**: Safe — deletion target is always a `_-`prefixed sidecar file within the store events directory. No traversal risk given the fixed path structure.

### Clean Areas
- `hooks/` (all three .js files) — unchanged from v0.8.3, clean
- `tools/estimate-usage.cjs`, `tools/generation-manifest.cjs`, `tools/manage-config.cjs`, `tools/seed-store.cjs` — unchanged, clean
- `schemas/` (all 5 schema files + sdlc-config.schema.json) — sprint.schema.json additions are additive (`goal`, `features` fields), `additionalProperties: false` preserved
- `init/` — unchanged, clean
- `meta/personas/` — unchanged, clean
- `meta/templates/` — unchanged, clean
- `vision/` — unchanged, clean
- No binary files, compiled artifacts, or misleading extensions
- No zero-width Unicode in any changed file
- No credential reads, eval, persistence mechanisms, or shell init writes anywhere
- No npm dependencies introduced — all `require()` calls are Node.js built-ins or internal `store.cjs`

### Verdict

**SAFE TO USE**

105 files scanned. Zero critical findings. Two carry-forward warnings (version-check HTTPS call and long update.md command file) accepted in all prior scans. Five informational findings — new store-cli.cjs, new purgeEvents method with traversal guard, new store-custodian skill, and a scoped file deletion on sidecar merge — all verified as safe. The Store Custodian architectural addition maintains the same security posture as prior releases.