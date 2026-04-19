# Security Scan — forge:forge — 2026-04-19

**SHA**: not recorded (local source scan) | **Installed**: N/A | **Last updated**: 2026-04-19
**Scope**: local source | **Install path**: /home/boni/src/forge/forge/

## Summary

166 files scanned | 0 critical | 1 warning | 2 info

## Findings

#### [WARNING] forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts (outbound network call)
- **Issue**: Carried over from prior releases. `https.get(remoteUrl, ...)` reads `updateUrl` from `plugin.json` at runtime and fetches only the remote `plugin.json` to compare version strings. No body content, credentials, or local data is transmitted. Destination is `raw.githubusercontent.com/Entelligentsia/forge/…/plugin.json` (or the `release` branch equivalent). Call has a 5-second timeout and fails silently on error. Unchanged from v0.17.1.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to use. No action required.

#### [INFO] forge/hooks/validate-write.js (NEW in this release)
- **Check**: A — Hook Scripts (PreToolUse registered on Write / Edit / MultiEdit)
- **Issue**: New `PreToolUse` hook that intercepts `Write`, `Edit`, and `MultiEdit` tool calls. Reads the tool invocation from stdin, looks up the target `file_path` against a static write-boundary registry of `.forge/store/**` path patterns, parses the proposed contents, and validates them against Forge schemas. Blocks on schema violation (`exit 2`); passes through on success (`exit 0`). No network, no credentials, no privileged filesystem access. The only `fs.appendFileSync` writes an audit line to the project's `progress.log` when `FORGE_SKIP_WRITE_VALIDATION=1` is set — a single scoped path under `.forge/store/events/<bucket>/`. Fails open on internal error so a broken validator cannot silently block legitimate work.
- **Excerpt**: `const entry = matchRegistry(filePath); if (!entry) process.exit(0);`
- **Recommendation**: Functioning as designed. Timeout set to 5000ms (within normal bounds). No action required.

#### [INFO] forge/commands/health.md:173 — SHA-256 hex literal
- **Check**: B — Base64-looking blob check
- **Issue**: A 64-character hex string (`3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f`) appears in `health.md`. This is the expected SHA-256 hash of `verify-integrity.cjs`, used for tamper detection of the integrity verifier itself. Plain hex, not Base64, no executable content. Unchanged from v0.17.1.
- **Excerpt**: `EXPECTED="3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f"`
- **Recommendation**: Intentional security measure. No action required.

## Clean Areas

- `forge/hooks/validate-write.js`, `forge/hooks/lib/write-registry.js`, `forge/tools/lib/validate.js` — new files introduced in this release. Pure filesystem I/O and in-memory schema validation. No network calls, no `child_process`, no `eval`, no `Function()` constructor, no dynamic code generation, no credential-adjacent path reads.
- `forge/schemas/event-sidecar.schema.json`, `forge/schemas/progress-entry.schema.json`, `forge/schemas/collation-state.schema.json` — new schema files. Plain JSON Schema Draft 2020-12 documents with no executable content.
- `forge/tools/store-cli.cjs` — in-tool gap closures reuse the shared validator; no new network, shell, or privileged paths introduced.
- `forge/meta/workflows/meta-orchestrate.md` — the new "Write-Boundary Contract" section is documentation only. No prompt injection, no persona hijacking, no instructions to disable safety.
- `forge/hooks/triage-error.js` — unchanged from prior releases; reads stdin, pattern-matches, writes stdout; no network, no filesystem writes.
- `forge/tools/*.cjs` — all tool scripts use only Node.js built-ins; no network calls, no credential access, no eval, no shell injection.
- `forge/init/`, `forge/meta/personas/`, `forge/meta/skills/` — documentation and generation templates; no injection patterns detected.
- No binary files, compiled artifacts (`.pyc`, `.so`, `.class`, `.exe`, `.dylib`), or unexpected file types found.
- No zero-width or hidden Unicode characters found.
- No shell init file modifications, persistence mechanisms, or package installation commands found.
- No prompt-injection strings (`ignore previous instructions`, `you are now`, `jailbreak`, `DAN mode`, etc.) found anywhere in the source tree.
- No `eval(`, `new Function(`, `child_process.exec`, or `base64 -d | bash` patterns outside of tests, and tests use `spawnSync` only to run the hook and store-cli under test.

## Verdict

**SAFE TO USE**

166 files scanned across hooks, commands, workflows, tools, schemas, and documentation. The v0.18.0 release adds one new hook script (`validate-write.js`), two new library files (`write-registry.js`, `validate.js`), and three new schema files — all of which are purely local validation logic with no network access, no credential reads, and no privileged filesystem access. The write-boundary hook is itself a defence: it *restricts* what agents can write to Forge-owned paths, it does not broaden any attack surface. One pre-existing expected network call (version check to `raw.githubusercontent.com`, scoped to the declared `updateUrl`) carries over unchanged. No prompt injection, exfiltration, or privilege escalation patterns detected.
