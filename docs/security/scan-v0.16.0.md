## Security Scan — forge:forge — 2026-04-19

**SHA**: pre-release (working tree, based on 66600b1) | **Installed**: n/a (source scan) | **Last updated**: n/a
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
156 files scanned | 0 critical | 0 warnings | 3 info

### Delta from v0.15.0

New in this release:
- `forge/tools/build-persona-pack.cjs` — compiles YAML frontmatter from `meta/personas/` and `meta/skills/` into `.forge/cache/persona-pack.json`.
- `forge/tools/__tests__/build-persona-pack.test.cjs` — 11 unit tests (fixtures only, no runtime surface).

Modified:
- All 8 persona files (`forge/meta/personas/meta-*.md`) — YAML frontmatter prepended (`id`, `role`, `summary`, `responsibilities`, `outputs`, `file_ref`). Prose unchanged.
- All 8 skill files (`forge/meta/skills/meta-*.md`) — frontmatter extended with `id`, `applies_to`, `summary`, `capabilities`, `file_ref`. Existing `name`/`description`/`role` fields preserved. Prose unchanged.
- `forge/meta/workflows/meta-orchestrate.md` — new **Persona Injection Modes** section with `compose_role_block(persona_noun)` helper. Existing injection site rewritten to call the helper. `FORGE_PROMPT_MODE=inline` preserves legacy verbatim injection for one-version rollback.
- `forge/meta/workflows/meta-fix-bug.md` — injection site now calls the same helper.
- `forge/commands/regenerate.md` — adds "Post-regeneration persona pack" step (one shell call to `build-persona-pack.cjs`).
- `forge/commands/materialize.md` — adds pack-build step to full warm-up.
- `forge/commands/health.md` — step 12 checks `.forge/cache/persona-pack.json` existence and `source_hash` freshness via `build-persona-pack.cjs` `computeSourceHash`.
- `forge/.claude-plugin/plugin.json`, `forge/migrations.json`, `forge/integrity.json` — release metadata.

### Findings

#### [INFO] forge/hooks/check-update.js:77
- **Check**: A — outbound network call
- **Issue**: `https.get(remoteUrl, ...)` fires during the SessionStart hook. Unchanged from v0.15.0.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... })`
- **Recommendation**: No action. `remoteUrl` sourced from `forge/.claude-plugin/plugin.json` `updateUrl` with fallback to `raw.githubusercontent.com/Entelligentsia/forge/main/...`. 5000 ms timeout. `uncaughtException` → exit 0. No credentials or env vars transmitted.

#### [INFO] forge/commands/update.md:156
- **Check**: A — outbound network call (documentation reference)
- **Issue**: Command instructions mention `curl` as a fallback for fetching the remote `plugin.json`. Unchanged from v0.15.0.
- **Excerpt**: `Use the WebFetch tool (preferred) or \`curl\` via Bash:`
- **Recommendation**: No action. User-initiated, same declared `updateUrl`, no credential surface.

#### [INFO] forge/hooks/hooks.json:14 (PostToolUse hook)
- **Check**: C — hook matcher scope
- **Issue**: `triage-error.js` PostToolUse hook matches every `Bash` invocation. Unchanged from v0.15.0.
- **Excerpt**: `"matcher": "Bash"` with `"timeout": 5000`
- **Recommendation**: No action. Hook applies a closed regex whitelist (`FORGE_PATTERNS`) to the command string before doing anything; returns immediately on non-match. No network, no spawn, no fs reads, no credentials. `uncaughtException` → exit 0.

### Clean Areas

#### New code: `forge/tools/build-persona-pack.cjs`
- Dependencies: only `fs`, `path`, `crypto` (Node built-ins).
- **No** `child_process`, `spawn`, `exec`, `eval`, `new Function`, `require('https'|'http')`, no dynamic `require()`.
- **Reads**: `.md` files in the caller-supplied `personaDir` / `skillDir` (defaulted to `$FORGE_ROOT/meta/personas/` and `$FORGE_ROOT/meta/skills/`). No credential paths (`~/.ssh`, `~/.aws`, `.env`, `id_rsa`, `*.pem`).
- **Writes**: one file at the caller-supplied `--out` path (default `.forge/cache/persona-pack.json`). Atomic write: `writeFileSync(out + '.tmp')` → `rename`. Creates parent dir with `mkdirSync({recursive: true})`. No writes outside the specified output path.
- **CLI args**: whitelisted (`--meta-root`, `--out`, `--persona-dir`, `--skill-dir`). No shell interpolation; arguments flow straight to `path.join`/`fs.readFileSync`. No untrusted-command sink.
- **YAML parser**: narrow-scope local implementation handling only scalars, folded scalars (`>`), block lists (`- item`), and inline flow lists (`[a, b]`). Unknown line shapes throw with the offending file path — fail-loud design, no silent coercion. No `eval`/`Function` fallback.
- **Error messages**: include the source file path so a malformed frontmatter cannot hide behind a generic error.

#### New tests: `forge/tools/__tests__/build-persona-pack.test.cjs`
- `node:test` + `node:assert` only. Uses `os.tmpdir()` + `fs.mkdtempSync` for fixtures — no writes to the repo tree or shared temp locations.
- No network, no spawn, no credential reads.

#### Modified workflows: `meta-orchestrate.md`, `meta-fix-bug.md`
- Scanned for prompt-injection phrases ("ignore previous", "disregard", "forget everything", "jailbreak", "you are now", "pretend you are", "DAN mode", "override your system", "bypass restrictions"): **zero matches**.
- New `compose_role_block` pseudocode reads the pack JSON and assembles a prompt from bounded string fields (`summary`, `responsibilities[]`, `outputs[]`, `capabilities[]`, `file_ref`). No string passed to `Bash`, `Write`, or any subagent tool; no `allowed-tools` added; no Agent tool spawned from the helper.
- `FORGE_PROMPT_MODE=inline` rollback branch reads the same `.forge/personas/<role>.md` and `.forge/skills/<role>-skills.md` files the prior orchestrator read. No new file surface.
- Fail-loud on missing pack entry (`raise OrchestratorError(...)`) — no silent degradation path.

#### Modified commands: `regenerate.md`, `materialize.md`, `health.md`
- Added steps invoke only `$FORGE_ROOT/tools/build-persona-pack.cjs` with whitelisted `--out` argument. No new network calls, no new credential reads, no new `allowed-tools` frontmatter.
- `health.md` step 12: two inline `node -e` evaluations that call `computeSourceHash` (pure) and read the pack JSON. No untrusted input is concatenated into either command — both paths (`$FORGE_ROOT`, `$PROJECT_ROOT`) originate from the harness/CWD.

#### Frontmatter additions (personas + skills)
- Only additive YAML fields: `id`, `role`, `applies_to`, `summary`, `responsibilities`, `capabilities`, `outputs`, `file_ref`.
- No `allowed-tools`, no `tools`, no hidden instructions. Scanned for zero-width Unicode (U+200B/200C/200D/FEFF/00AD) across the entire tree: zero hits (the only `─` matches are U+2500 box-drawing used in code comments as visual separators).
- Scanned for suspicious base64-like blobs (`[A-Za-z0-9+/=]{60,}` outside `*.json`): the only hit is the `EXPECTED=` SHA-256 hex in `health.md:151` (verify-integrity baseline hash, audit artifact, unchanged from v0.15.0).

#### Release metadata
- `forge/.claude-plugin/plugin.json` — still minimal: no `allowed-tools`, no inline hooks, no MCP servers, no Agent grants; `updateUrl`/`migrationsUrl` still pinned to `raw.githubusercontent.com/Entelligentsia/forge/main/`.
- `forge/migrations.json` — new `"0.15.0" → "0.16.0"` entry; `regenerate: ["personas", "workflows"]`; `breaking: false`; one manual step (`/forge:regenerate`). No runtime-executed code.
- `forge/integrity.json` — regenerated for v0.16.0 (19 files). Hash of `verify-integrity.cjs` unchanged (`3ec3c970…`); `health.md` `EXPECTED=` literal therefore unchanged.

#### Structural
- No new binaries, no compiled bytecode (`.pyc`/`.class`/`.so`/`.dll`/`.exe`), no files >500 KB. 156 files, ~1.4 MB total tree.
- No `package.json` / `node_modules` — dep-free design honoured in this release.
- No reads of `~/.ssh`, `~/.aws`, `.env`, `*.pem`, `id_rsa`. No capture of `TOKEN|SECRET|PASSWORD|API_KEY|AUTH|CREDENTIAL` env vars. No `eval`, `base64 -d | sh`, `xxd`, `crontab`, `launchctl`, `nohup`, `sudo`, silent `npm -g`/`pip`/`brew`/`apt-get`, `chmod +x` on generated files, or shell init writes.

### Verdict

**SAFE TO USE**

Zero critical, zero warnings. The one new runtime tool (`build-persona-pack.cjs`) is a pure `fs`/`path`/`crypto` compiler with no network, spawn, or eval surface and a narrow-scope YAML parser that fails loudly on malformed input. All workflow and command edits are data-shape changes that route the same persona/skill content through a compact reference block; the rollback path (`FORGE_PROMPT_MODE=inline`) preserves legacy behaviour exactly. No new `allowed-tools`, no new outbound endpoints, no new credential surface.
