## Security Scan — forge:forge — 2026-04-04

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 (installed cache at 0.3.7; scanning source at 0.3.10) | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-03T08:47:35.121Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.3.7

> Note: 0.3.10 has not yet been published. This scan covers the source tree at `/home/boni/src/forge/forge/` prior to publication. Hook, tool, and command files are unchanged from the clean 0.3.9 scan and are carried forward. Only the delta (`meta/workflows/meta-orchestrate.md` rewritten, `sdlc-config.schema.json` one field added) is re-analysed in full.

### Summary
84 files scanned | 0 critical | 3 warnings | 1 info

### Findings

#### [WARNING] hooks/check-update.js:49, hooks/check-update.sh:44
- **Check**: A — outbound network call
- **Issue**: Carried forward from 0.3.9 scan. HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` for version detection. Behaviour unchanged.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Permitted — version-check endpoint on `raw.githubusercontent.com`. Safe.

#### [WARNING] hooks/check-update.js:21, hooks/check-update.sh:12
- **Check**: A — writes to `/tmp`
- **Issue**: Carried forward from 0.3.9 scan. Cache written to `$CLAUDE_PLUGIN_DATA` (default: `/tmp/forge-plugin-data/`). Non-sensitive content (version strings, epoch timestamp). Behaviour unchanged.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Justified. Safe.

#### [WARNING] hooks/check-update.sh — unregistered duplicate
- **Check**: D — dead code
- **Issue**: Carried forward from 0.3.9 scan. `check-update.sh` is not referenced in `hooks.json` and will never execute automatically.
- **Recommendation**: No runtime risk. Consider removing in a future release.

#### [INFO] meta/workflows/meta-orchestrate.md — pseudocode contains `{verdict}` interpolation syntax
- **Check**: B — freeform instruction content
- **Issue**: The new Execution Algorithm section uses Python-style f-string pseudocode: `reason=f"unrecognised verdict: {verdict}"`. This is illustrative pseudocode for the LLM orchestrator to follow, not executable code. The `verdict` value in context would be the string read from a review artifact — not user-controlled input that could inject instructions. No prompt injection pattern is present.
- **Excerpt**: `escalate_to_human(task, phase, reason=f"unrecognised verdict: {verdict}")`
- **Recommendation**: No action needed. Pseudocode in a generation template; `{verdict}` is a placeholder variable name, not a template injection site.

### Delta Analysis — 0.3.10 changes

**`meta/workflows/meta-orchestrate.md` (rewritten, 186 lines):**
- Added concrete Execution Algorithm section with explicit pseudocode loop covering phase advancement, verdict detection, revision routing, iteration counting, and escalation
- Added Verdict Detection table specifying which artifact to read per review role and how to parse the `**Verdict:**` line
- Added Escalation Procedure section with exact task store update and user-facing message
- Added `on_revision` to phase description
- Added "Always read the verdict from the artifact" to Iron Laws
- No prompt injection patterns, no persona hijacking, no exfiltration instructions, no credential access, no permission escalation, no hidden sections, no invisible Unicode, no Base64 blobs
- File is 186 lines — well within the 500-line threshold

**`sdlc-config.schema.json` (1 field added):**
- `on_revision` added as optional string field to pipeline phase definition
- Plain JSON Schema addition; no executable content

### Clean Areas
- `hooks/triage-error.js`, `hooks/list-skills.js`, `hooks/list-skills.sh` — unchanged; no issues
- `tools/collate.cjs`, `tools/validate-store.cjs`, `tools/seed-store.cjs`, `tools/manage-config.cjs` — unchanged; no issues
- `commands/*.md` (all including `migrate.md`) — no injection patterns
- `schemas/*.schema.json` — plain JSON Schema; no executable content
- `meta/`, `init/`, `vision/` (all other files) — documentation only; no injection patterns
- No binary or compiled artifacts anywhere in tree
- No invisible Unicode in changed files
- No eval, obfuscation, persistence mechanisms, or credential access anywhere

### Verdict

**SAFE TO USE**

The 0.3.10 delta is documentation and schema only — a rewritten orchestration algorithm in Markdown and one new optional JSON Schema field. No executable hook or tool code was changed. All three carried-forward warnings remain justified and unchanged from prior scans.
