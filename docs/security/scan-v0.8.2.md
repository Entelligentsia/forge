## Security Scan — forge:forge — 2026-04-14

**SHA**: source scan (no gitCommitSha) | **Installed**: local source | **Last updated**: 2026-04-14
**Scope**: source directory | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 0 critical | 2 warnings | 3 info

### Changed files in this version (delta from v0.8.1)
- `forge/.claude-plugin/plugin.json` — version bump only
- `forge/migrations.json` — new migration entry for 0.8.1→0.8.2
- `forge/meta/workflows/meta-retrospective.md` — added collate + purge to Finalize step
- `forge/meta/workflows/meta-fix-bug.md` — added cost summary + purge to Finalize step

All other files are unchanged from the v0.8.1 scan and carry forward clean status.

### Findings

#### [WARNING] hooks/check-update.js:77 (carry-forward)
- **Check**: A — Hook Scripts (outbound network call)
- **Issue**: Outbound HTTPS GET on SessionStart, throttled to once per 24h. URL read from `plugin.json → updateUrl`, fallback to `raw.githubusercontent.com/Entelligentsia/forge/main/…`. Only the `version` field of the response is consumed. No user data transmitted.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe — justified version-check call to the official Forge release manifest. No action required.

#### [WARNING] commands/update.md:853 lines (carry-forward)
- **Check**: B — Skill/Command files (long file)
- **Issue**: Above the 500-line advisory threshold. Reviewed in full in v0.8.1 scan; no hidden instructions or injection patterns found. Length is justified by the multi-step migration workflow.
- **Excerpt**: File ends cleanly with `## On error` and `/forge:report-bug` guidance.
- **Recommendation**: Safe — no action required.

#### [INFO] New content in meta-retrospective.md — event purge instruction
- **Check**: B — Skill/Command files
- **Issue**: New Finalize step instructs the generated workflow to delete `.forge/store/events/{sprintId}/`. This is a local destructive file operation scoped to the project's own `.forge/` directory. Instruction is preceded by a collate call to materialise the durable COST_REPORT.md before deletion.
- **Excerpt**: `Purge .forge/store/events/{sprintId}/ — delete the entire sprint event directory.`
- **Recommendation**: Safe — operation is project-local, preceded by data preservation (collate), and consistent with the plugin's stated purpose of managing sprint lifecycle state.

#### [INFO] New content in meta-fix-bug.md — event purge instruction
- **Check**: B — Skill/Command files
- **Issue**: New Finalize step instructs the generated workflow to delete `.forge/store/events/{bugId}/` and write a cost summary to a bug artifact in `engineering/bugs/`. Both operations are project-local file I/O within paths owned by the user's project.
- **Excerpt**: `Purge .forge/store/events/{bugId}/ — delete the entire bug event directory.`
- **Recommendation**: Safe — project-local operation, data preserved in bug artifact before deletion.

#### [INFO] hooks/hooks.json — two event types registered (carry-forward)
- **Check**: C — two event hooks
- **Issue**: SessionStart (check-update.js) and PostToolUse/Bash (triage-error.js). Both serve clearly stated purposes.
- **Recommendation**: No action required.

### Clean Areas
- `hooks/triage-error.js` — unchanged, clean
- `hooks/list-skills.js` — unchanged, clean
- `hooks/check-update.js` — unchanged, warning carry-forward (accepted)
- `tools/` (all 7 `.cjs` files) — unchanged, local file I/O only
- `meta/workflows/meta-retrospective.md` — new content reviewed, no injection patterns, no network calls, no credential reads
- `meta/workflows/meta-fix-bug.md` — new content reviewed, no injection patterns, no network calls, no credential reads
- All other `meta/`, `commands/`, `init/`, `schemas/`, `vision/` files — unchanged from v0.8.1 scan
- No binary files, compiled artifacts, or misleading extensions
- No zero-width Unicode in changed files
- No prompt injection in any file

### Verdict

**SAFE TO USE**

102 files scanned. Delta from v0.8.1 is four files: two version/migration bookkeeping files and two meta-workflow files that add local event purge logic. New content reviewed — no injection patterns, no network calls, no credential access. All findings are carry-forwards from prior scans (accepted). Plugin remains safe to use.
