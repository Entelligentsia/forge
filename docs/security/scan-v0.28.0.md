## Security Scan — forge:forge — 2026-04-29

**SHA**: not recorded (source scan) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source-path `forge/` | **Install path**: `/home/boni/src/forge/forge/`

### Summary
183 files scanned | 5 critical | 17 warnings | 5 info

### Findings

#### CRITICAL hooks/forge-permissions.js:170-186
- **Check**: A — Hook Scripts
- **Issue**: Bulk permission escalation — any single pattern match persists all 30+ permission rules to `.claude/settings.local.json`. A user triggering a benign `ls` match silently receives permanent auto-approve rules for `git push *`, `node -e *`, `rm -f .forge/*`, and every other rule.
- **Excerpt**: `rules: ALL_RULES,  // <-- ALL 30+ rules persisted on first match`
- **Recommendation**: Persist only the matched rule, not the entire rule set. Consider a two-phase approach: first-use shows all pending rules for explicit user approval, then subsequent matches auto-approve only the matched rule.

#### CRITICAL hooks/forge-permissions.js:36-37,102-103
- **Check**: A — Hook Scripts
- **Issue**: `node -e *` and `node -p *` rules grant arbitrary code execution without restriction. Any inline Node.js code is auto-approved permanently.
- **Excerpt**: `{ pattern: /^node\s+-e\s+/, rule: 'node -e *' }`
- **Recommendation**: Restrict `node -e` rules to known safe patterns (e.g., `node -e "console.log(require(...)..."`) or remove unrestricted `node -e *` and require user approval for each invocation.

#### CRITICAL hooks/check-update.js:131-137,163
- **Check**: A — Hook Scripts
- **Issue**: Network call to URL read from local `plugin.json` without domain validation. If that file is tampered with, the hook makes an HTTPS GET request to an attacker-controlled URL.
- **Excerpt**: `return manifest.updateUrl || FALLBACK_UPDATE_URL;  // <-- no URL validation`
- **Recommendation**: Add an allowlist of permitted domains (e.g., `raw.githubusercontent.com`) and reject URLs outside the allowlist.

#### CRITICAL tools/manage-config.cjs:66-74
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: Prototype pollution in `setByPath()`. The function traverses an object using dot-separated keys from CLI arguments without filtering `__proto__`, `constructor`, or `prototype`. Supplying `__proto__.polluted` as key path pollutes `Object.prototype`.
- **Excerpt**: `cur = cur[keys[i]];   // cur becomes Object.prototype when keys[i] === '__proto__'`
- **Recommendation**: Reject `__proto__`, `constructor`, and `prototype` in the keys array before traversal.

#### CRITICAL tools/store-cli.cjs:911-917,935-940
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: Path traversal in `cmdProgress` / `cmdProgressClear`. The `sprintOrBugId` argument from `process.argv` is joined directly into a filesystem path without traversal validation. Unlike `purgeEvents` in `store.cjs` (which has a path-traversal guard), these code paths have no guard.
- **Excerpt**: `const dir = path.join('.forge', 'store', 'events', sprintOrBugId);`
- **Recommendation**: Add the same path-traversal guard used in `store.cjs purgeEvents` (the `startsWith` + `path.sep` check) to `cmdProgress` and `cmdProgressClear`.

#### WARNING hooks/forge-permissions.js:47,51,110,114
- **Check**: A — Hook Scripts
- **Issue**: Overly broad wildcard rules: `touch *`, `rmdir *`, `uname *` can operate anywhere on the filesystem.
- **Excerpt**: `{ toolName: 'Bash', ruleContent: 'touch *' }`
- **Recommendation**: Scope rules to project paths (e.g., `touch .forge/*`, `touch engineering/*`).

#### WARNING hooks/forge-permissions.js:59-60,118-119
- **Check**: A — Hook Scripts
- **Issue**: Auto-approving `git push *` and `git checkout *` permanently. Force pushes and checkout to any ref are allowed without user confirmation.
- **Excerpt**: `{ pattern: /^git\s+push\b/, rule: 'git push *' }`
- **Recommendation**: Restrict to non-destructive push patterns or require explicit approval for force push.

#### WARNING hooks/forge-permissions.js:49,112
- **Check**: A — Hook Scripts
- **Issue**: `rm -f .forge/*` auto-approved permanently. The `-f` flag suppresses confirmation even for write-protected files.
- **Recommendation**: Remove `-f` flag or narrow the glob to specific file types.

#### WARNING hooks/check-update.js:24,140,294
- **Check**: A — Hook Scripts
- **Issue**: Cache files written to `/tmp` via `os.tmpdir()` fallback. `/tmp` is world-writable on most Linux systems, creating symlink attack and data leak vectors.
- **Recommendation**: Use project-local cache directory (e.g., `.forge/cache/`) instead of `/tmp`.

#### WARNING hooks/check-update.js:46-47,52,104
- **Check**: A — Hook Scripts
- **Issue**: Reads `~/.claude/settings.json` and scans `~/.claude/plugins/` directories. While relevant to multi-plugin detection, this reads user home directory paths containing configuration data.
- **Recommendation**: Safe to ignore — the access is justified by the hook's stated purpose.

#### WARNING hooks/check-update.js:220,244,278,294,298,306
- **Check**: A — Hook Scripts
- **Issue**: Silent writes to `.forge/config.json` and cache files on session start.
- **Recommendation**: Safe to ignore — these are project-local configuration updates.

#### WARNING tools/store-cli.cjs:1083-1089
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: `child_process.spawnSync` used to delegate to `store-query.cjs`. The command and script are well-constrained (validated command, fixed script path).
- **Recommendation**: Safe to ignore — the spawn is tightly scoped.

#### WARNING tools/manage-config.cjs:62-64
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: `getByPath()` allows traversing `__proto__` to access inherited properties. Read-only, no mutation, but leaks prototype information.
- **Recommendation**: Reject `__proto__`, `constructor`, `prototype` in `getByPath` alongside the `setByPath` fix.

#### WARNING tools/build-init-context.cjs:304-307
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: CLI-argument-derived file write paths (`--out`, `--json-out`) with no restriction to the project directory.
- **Recommendation**: Validate that output paths resolve within the project root.

#### WARNING tools/lib/validate.js:92-94
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: Dynamic `RegExp` construction from schema `pattern` values. Catastrophic backtracking (ReDoS) possible with malicious schema files.
- **Recommendation**: Safe to ignore — schemas are project-local and trusted.

#### WARNING tools/list-skills.js:27-33
- **Check**: A — Hook Scripts (tool used by hooks/commands)
- **Issue**: File I/O outside project root via `CLAUDE_PLUGIN_DATA_ROOT` and `CLAUDE_SKILLS_DIR` env var overrides. Only used for skill name enumeration, not code execution.
- **Recommendation**: Safe to ignore — the overrides are operational, not security-sensitive.

#### WARNING commands/update.md:143-144,155-166
- **Check**: B — Skill/Command/Context Files
- **Issue**: Remote URL fetching in update flow. The `updateUrl` is read from local `plugin.json` (could be tampered with) with fallback to hardcoded GitHub URL.
- **Recommendation**: Same as check-update.js finding — add domain allowlist.

#### WARNING commands/remove.md:115-143
- **Check**: B — Skill/Command/Context Files
- **Issue**: `rm -rf` commands scoped to `.forge/`. Protected by explicit user confirmation ("Type 'confirm' to proceed").
- **Recommendation**: Safe to ignore — gated by confirmation.

### INFO Findings

#### INFO meta/workflows/meta-orchestrate.md (1095 lines)
- **Check**: B — Skill/Command/Context Files
- **Issue**: File exceeds 500 lines. Long files make it impractical for users to review all instructions.
- **Recommendation**: Safe to ignore — legitimate complex workflow specification.

#### INFO commands/update.md (1093 lines), init/sdlc-init.md (921 lines)
- **Check**: B — Skill/Command/Context Files
- **Issue**: Files exceed 500 lines.
- **Recommendation**: Safe to ignore — legitimate complex specifications.

#### INFO agents/store-query-validator.md:7, meta/workflows/meta-orchestrate.md:266
- **Check**: B — Skill/Command/Context Files
- **Issue**: Persona-assignment phrasing ("You are acting as the..."). Scoped agent definition and programmatic persona assignment — legitimate.
- **Recommendation**: Safe to ignore.

#### INFO HTML comments across 15 markdown files
- **Check**: B — Skill/Command/Context Files
- **Issue**: HTML comments used as structural markers (stub sentinels, auto-generated markers, link sections). No hidden instructions.
- **Recommendation**: Safe to ignore.

#### INFO node -e one-liners across commands/workflows
- **Check**: B — Skill/Command/Context Files
- **Issue**: Inline `node -e` patterns for config reads and hash computation. All deterministic, no network modules.
- **Recommendation**: Safe to ignore — all use `require('fs')` and `require('crypto')` only.

### Clean Areas
- `hooks/validate-write.js` — no issues detected
- `hooks/triage-error.js` — no issues detected (cleanest file)
- `hooks/hooks.json` — no unrestricted Bash, no bash -c interpolation, timeouts <= 10000ms
- `hooks/lib/write-registry.js` — pure data module, no I/O
- `tools/banners.sh` — simple shell wrapper, no security concerns
- `tools/collate.cjs` — project-scoped I/O only
- `tools/seed-store.cjs` — project-scoped I/O only
- `tools/validate-store.cjs` — read-only validation
- `tools/preflight-gate.cjs` — read-only, project-scoped
- `tools/parse-gates.cjs` — pure parsing, no I/O
- `tools/parse-verdict.cjs` — pure parsing + single CLI file read
- `tools/build-manifest.cjs` — project-scoped writes
- `tools/build-context-pack.cjs` — project-scoped writes
- `tools/build-persona-pack.cjs` — project-scoped writes
- `tools/check-structure.cjs` — read-only
- `tools/ensure-ready.cjs` — read-only
- `tools/estimate-usage.cjs` — project-scoped writes
- `tools/generation-manifest.cjs` — project-scoped writes
- `tools/gen-integrity.cjs` — project-scoped writes
- `tools/verify-integrity.cjs` — read-only
- `tools/store-query.cjs` — read-only queries
- `tools/banners.cjs` — pure display, no I/O
- `tools/lib/result.js` — pure data structure
- `tools/lib/store-facade.cjs` — project-scoped reads
- `tools/lib/store-nlp.cjs` — pure parsing
- `tools/lib/store-query-exec.cjs` — read-only queries
- `tools/store.cjs` — project-scoped I/O, has path traversal guard
- All 97 markdown files — no prompt injection, safety bypass, exfiltration, or permission escalation patterns

### Verdict

**REVIEW RECOMMENDED**

Five critical findings require attention before next release: bulk permission escalation and unrestricted `node -e *` in `forge-permissions.js`, unvalidated update URL in `check-update.js`, prototype pollution in `manage-config.cjs`, and path traversal in `store-cli.cjs`. The `forge-permissions.js` issues are pre-existing (from BUG-014 fix in v0.26.0) and the `manage-config.cjs` / `store-cli.cjs` issues are also pre-existing. The v0.28.0 changes themselves (escalation hardening in `meta-orchestrate.md` and `meta-orchestrator.md`) introduce no new security issues. All critical findings should be tracked for remediation in a subsequent release.

Run this scan again after the author releases a fix, or review the flagged files manually before using this plugin.