## Security Scan — forge:forge — 2026-04-20

**SHA**: not recorded (source scan — local repo at forge/) | **Installed**: N/A (source scan) | **Last updated**: 2026-04-20
**Scope**: local (source directory) | **Install path**: /home/boni/src/forge/forge/

### Summary
169 files scanned | 0 critical | 2 warnings | 3 info

### Findings

#### [WARNING] forge/commands/update.md:1–1093
- **Check**: B — Very long file
- **Issue**: File is 1,093 lines. Per check B, files over 500 lines warrant review for buried instructions. Content was read in full — the entire file is a legitimate, well-structured multi-step update workflow (version comparison, migration application, KB link refresh). No hidden instructions, no injection patterns, no suspicious sections after apparent document end.
- **Excerpt**: `## Step 7 — Link KB to Agent Instruction Files` (line 1063) — legitimate final step, not a hidden section.
- **Recommendation**: No action required. Flag is informational — the length is justified by the complexity of the update pipeline.

#### [WARNING] forge/meta/workflows/meta-orchestrate.md:1–948
- **Check**: B — Very long file
- **Issue**: File is 948 lines. Same size-based flag as above. Content was read in full — the entire file is a legitimate orchestrator meta-workflow generating the project-specific orchestrate_task.md. No hidden instructions found.
- **Excerpt**: Final lines (920–948) contain legitimate phase-exit signal and /compact call instructions for generated orchestrators.
- **Recommendation**: No action required. Length is justified by orchestration complexity.

#### [INFO] forge/hooks/check-update.js — Outbound network call
- **Check**: A — Outbound network, WARNING-class
- **Issue**: SessionStart hook makes an HTTPS GET to fetch the remote plugin version once per 24 hours. The destination is read from `manifest.updateUrl` in the installed plugin.json, with a hardcoded fallback of `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. The call fetches only a public JSON file and reads only `version` from the response body.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... try { cb(JSON.parse(body).version || ''); } catch { cb(''); } })`
- **Recommendation**: Safe. Call is throttled (once/24h), destination is a known public GitHub raw URL, response is read-only (version string), no data is sent. The updateUrl field allows distribution-aware routing (main vs release branch), which is documented and intentional.

#### [INFO] forge/hooks/hooks.json — Three hook registrations
- **Check**: C — Multiple hook event types
- **Issue**: Plugin registers hooks on three event types: SessionStart (check-update.js), PreToolUse/Write|Edit|MultiEdit (validate-write.js), PostToolUse/Bash (triage-error.js). All three are reviewed.
- **Excerpt**: `"SessionStart"`, `"PreToolUse"` (matcher: Write|Edit|MultiEdit), `"PostToolUse"` (matcher: Bash)
- **Recommendation**: All three hooks are well-scoped and serve documented purposes. Timeouts are 10s, 5s, 5s — all within the 30s threshold. No unrestricted shell access. No credential reads. Safe.

#### [INFO] forge/commands/regenerate.md — Agent tool spawning
- **Check**: C — Agent tool usage
- **Issue**: The regenerate command instructs Claude to use the Agent tool for parallel persona/skill/workflow generation fan-out. Agent usage is explicitly described and justified by the fan-out parallelism requirement.
- **Excerpt**: `Spawn the persona subagents in a SINGLE Agent tool message`
- **Recommendation**: No concern. Agent spawning for parallel sub-task execution is a documented and legitimate pattern in Forge's architecture.

### Clean Areas
- forge/hooks/validate-write.js — no network calls, no credential access, no eval; schema enforcement only
- forge/hooks/triage-error.js — reads stdin Bash output, emits additionalContext; no network, no filesystem writes
- forge/hooks/lib/write-registry.js — pure regex registry; no side effects
- forge/tools/lib/result.js — new in v0.21.0; pure in-process Result helper; no I/O
- forge/tools/lib/validate.js — pure JSON schema validator; no I/O
- forge/tools/collate.cjs — no network calls; filesystem reads/writes to engineering/ only
- forge/tools/estimate-usage.cjs — no network calls; reads/writes event JSON via store facade
- forge/tools/store-cli.cjs — no network calls; JSON store CRUD only
- forge/tools/store.cjs — no network calls; filesystem facade only
- forge/tools/banners.sh — thin wrapper delegating to banners.cjs; no network, no eval
- forge/commands/ — all 18 command files are instruction-only Markdown; no prompt injection found
- forge/meta/ — all persona, skill, workflow, and template files are instruction-only; no injection found
- forge/skills/ — refresh-kb-links/SKILL.md is a single-purpose KB link refresh skill; clean
- forge/agents/tomoshibi.md — KB visibility agent; clean
- forge/schemas/ — JSON schemas only; no executable content
- forge/.claude-plugin/plugin.json — no overly broad permissions declared; no allowed-tools field
- No binary files, compiled artifacts, or files with misleading extensions found
- No zero-width Unicode characters found in any Markdown file
- No base64 blobs found in any Markdown file
- No credential-adjacent path accesses (SSH, AWS, GnuPG, .env, .pem, .key) anywhere

### Verdict

**SAFE TO USE**

v0.21.0 adds only `forge/tools/lib/result.js` (pure in-process Result helper) and minor refactoring to `collate.cjs` and `estimate-usage.cjs`. No new hooks, no new network calls, no new commands. The two long-file warnings were investigated fully — both files contain only legitimate workflow instructions. The outbound network call in `check-update.js` remains unchanged from previous versions and is properly scoped to a public GitHub raw URL with a 5-second timeout.
