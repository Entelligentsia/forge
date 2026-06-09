## Security Scan — forge:forge — 2026-06-09

**SHA**: pending (v1.4.5 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-09
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
414 files scanned | 0 critical | 0 warnings | 2 info (carried)

First scan of the 1.4.x line (the 1.4.0–1.4.4 bumps were developed but never
tagged/released; last released + scanned version was v1.3.0). This scan is a
delta vs the v1.3.0 baseline plus a full critical-pattern sweep of the
executable surface (22 hook files, 164 `.cjs` tools).

### Scan basis

**1.4.5 change (this release):** prose-only.

- `init/base-pack/workflows/collator_agent.md` (−6/+5) and
  `meta/workflows/meta-collate.md` (−6/+5) — the generated collate workflow's
  KB-link refresh step no longer instructs the collator subagent to invoke the
  `forge:refresh-kb-links` Skill tool. Replaced with context-aware guidance
  (Skill tool in the Claude Code TUI; orchestrator-owned under forge-cli). No
  new capabilities, no exec, no network, no credential access.

**Accumulated 1.3.0 → 1.4.5 surface (CLI-first init work):** all prose / config
/ test-only per the per-version migration notes; no new hooks were added.

### Findings

No critical or warning findings.

Critical-pattern sweep (Checks A–D) over `hooks/` + `tools/`:

- **Check A (hooks/exec):** No outbound network calls except the update-check
  reads of `raw.githubusercontent.com/Entelligentsia/forge/{main,release}/…`
  (`plugin.json` / `migrations.json`). `hooks/lib/update-url.cjs` enforces a
  domain allowlist and **rejects** disallowed hostnames — a security control,
  not a hole. No credential-path reads (`.ssh`/`.aws`/`.env`/`id_rsa`/`.netrc`);
  no secret-bearing env capture; no `eval`, `base64 -d | bash`, or shell-init
  writes; no `sudo`, `crontab`, or persistence. The only `evil.com` /
  spoofed-host strings are negative-test fixtures in `__tests__/`
  (`forge-permissions.test.cjs`, `update-url.test.cjs`, `check-update.test.cjs`)
  asserting the guards reject them.
- **Check B (instructions):** No prompt-injection phrases ("ignore previous
  instructions", persona-hijack, jailbreak, safety-bypass) across `commands/`,
  `meta/`, `init/`, `agents/`. No zero-width / invisible Unicode in any `.md`.
- **Check C (permissions):** No `plugin.json` capability changes in 1.4.5. Hook
  registrations unchanged.
- **Check D (structure):** No binaries, bytecode, or misleading extensions.

### Clean Areas
- `hooks/` — update-check is read-only with a domain allowlist; no new hooks since v1.3.0.
- `tools/` — no new exec/network/credential patterns.
- `commands/`, `meta/`, `init/`, `agents/` — no injection or hidden instructions.
- 1.4.5 diff (`collator_agent.md`, `meta-collate.md`) — prose only.

### Verdict

**SAFE TO USE**

Prose-only release on a plugin surface with no new executable capability; the
full critical-pattern sweep of the hook and tool surface is clean, and the
update-check network path is read-only behind a domain allowlist.
