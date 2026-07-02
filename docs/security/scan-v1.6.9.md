## Security Scan — forge:forge — 2026-07-01

**SHA**: not recorded (pre-tag) | **Installed**: n/a (source scan) | **Last updated**: 2026-07-01
**Scope**: plugin source | **Install path**: `forge/` (`--source-path forge/`)
**Release**: plugin `1.6.9` (FORGE-S35-T06 / Slice 5)

### Summary
Plugin source tree (`forge/forge/` ≈ 4.5 MB, 21k files incl. tests/docs) scanned | 0 critical | 0 warnings | informational only

This is a metadata + re-vendor release: plugin version bump `1.6.8 → 1.6.9`,
consolidating migration entry, CHANGELOG catch-up, `payload-manifest.json`
`init/phases` select flipped to recursive, and the forge-cli payload re-vendored
(`bundledVersion 1.6.5 → 1.6.9`). No `.cjs` tool or `.js` hook logic changed, so
the runtime attack surface is unchanged from the last SAFE scan (`scan-v1.4.5.md`).

### Findings

No CRITICAL or WARNING findings.

#### [INFO] forge/hooks/check-update.cjs:65
- **Check**: A — Hook Scripts (outbound network)
- **Issue**: Single outbound `https.get` to the plugin's `updateUrl`
  (`https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`),
  a version-check endpoint — explicitly permitted by the scan policy.
- **Excerpt**: `https.get(remoteUrl, { timeout: 2000 }, (res) => {`
- **Recommendation**: Safe to ignore — official raw.githubusercontent.com
  release-metadata endpoint, 2 s timeout, read-only version compare.

### Clean Areas
- `forge/hooks/` — all hooks invoke local vendored `${CLAUDE_PLUGIN_ROOT}/hooks/*.cjs`
  with bounded timeouts (5–10 s); no credential-path reads, no secret-env capture,
  no `eval`, no `base64 -d | bash` / `xxd -r` obfuscation, no shell-init or
  persistence writes (crontab/systemctl/launchctl/nohup).
- `forge/hooks/hooks.json` — SessionStart / PreToolUse (Write|Edit|MultiEdit) /
  PostToolUse (Bash) matchers only; no over-broad or multi-event abuse.
- `forge/commands/`, `forge/meta/`, `forge/personas/`, `forge/skills/`,
  `forge/init/` — no prompt-injection phrases ("ignore previous instructions",
  "you are now", "jailbreak", "DAN mode", "bypass restrictions", "override your
  system prompt"); the only textual matches in the tree are the historical
  `docs/security/scan-*.md` reports quoting the phrases they check for.
- No zero-width / invisible Unicode (U+200B/FEFF/200C/200D/00AD) in any
  `.md` / `.js` / `.cjs` / `.json`.
- Check D structural — no binaries or bytecode (`.pyc`/`.so`/`.dylib`/`.dll`/
  `.exe`/`.class`); no misleading extensions.

### Verdict

**SAFE TO USE**

Metadata-only / re-vendor release with no logic change; the runtime surface is
identical to the prior SAFE scan. The sole network call is the sanctioned
raw.githubusercontent.com version check.
