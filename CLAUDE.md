# Forge — Plugin Development Guidelines

## What This Repo Contains

```
forge/              ← Plugin source (installable by all users)
.claude-plugin/     ← Marketplace descriptor
docs/               ← Plugin documentation (concepts, commands, security scans)
```

This is the **public** Forge repository. It contains only the plugin source and its documentation. Private engineering data (sprints, bugs, dogfooding) lives in `Entelligentsia/forge-engineering`.

### Decision rule

> **"Am I fixing/building Forge itself?"** → edit `forge/`

### Hard boundaries

**NEVER** edit generated output (`.forge/` in installed instances) to fix plugin behaviour. The fix goes in `forge/meta/`.

**NEVER** regenerate `.forge/` as a side-effect of plugin development — regeneration is a user action (`/forge:regenerate`).

### Where things live

| You want to… | Edit this |
|---|---|
| Fix a workflow bug | `forge/meta/workflows/meta-*.md` |
| Fix a persona or skill | `forge/meta/personas/` or `forge/meta/skills/` |
| Fix a hook | `forge/hooks/` |
| Fix a tool | `forge/tools/` |
| Add a command | `forge/commands/` |
| Change a schema | `forge/schemas/` |
| Rebuild structure manifest | Edit mapping in `forge/tools/build-manifest.cjs`, then `node forge/tools/build-manifest.cjs --forge-root forge/` |

---

## Versioning — Key Rules

- Bump `forge/.claude-plugin/plugin.json` version for every material change
- A change is material if it can affect the engineering workflow of an installed Forge user
- Schema changes that affect entity lifecycle → update `docs/concepts/*.md` diagrams
- Migration entries use **granular sub-targets** (e.g., `"workflows:orchestrate_task"`) not bare categories (e.g., `"workflows"`)
- All script tests must pass before bumping: `node --test forge/tools/__tests__/*.test.cjs`
- Security scan required before push: `/security-watchdog:scan-plugin forge:forge --source-path forge/`
- What does NOT need a version bump: documentation-only changes, typo fixes in `docs/`, README updates

---

## Script Test Suite — Key Rules

- Every `.cjs` tool has a corresponding test in `forge/tools/__tests__/*.test.cjs`
- Run with: `npm test` (globs both `forge/tools/__tests__/*.test.cjs` and `forge/hooks/__tests__/*.test.cjs`)
- **Every change to a `.cjs` script must be preceded by a failing test** — write test, watch it fail, implement, watch it pass
- New exports require new tests
- Test-only helpers belong in `__tests__/`, never in tool scripts themselves

### No skipped or focused tests

- Every committed test must execute. No `it.skip` / `describe.skip` / `test.skip`, no `it.only` / `describe.only` / `test.only`, no `xit` / `xdescribe`, no commented-out tests.
- Enforced by `forge/tools/check-no-skipped-tests.cjs` (`npm run lint:no-skip`) and by the `tests-and-skip-gate` job in `.github/workflows/plugin-ci.yml`.
- The gate scans `forge/tools/__tests__/` and `forge/hooks/__tests__/`, skips `fixtures/` subtrees, and self-excludes its own paired test file (which contains literal marker strings as fixtures).
- A secondary `FIXME: skip` / `TODO: re-enable` scan runs in warn-only mode — it prints to stderr but does not fail the build, so reminder comments like `TODO(FORGE-S25-T28)` in workflow YAML can land without self-tripping the gate.
- Bypassing the gate requires a documented Iron Law amendment (sprint decision log entry).

### Tmp-smoke gate (plugin-side)

- `.github/workflows/plugin-ci.yml` `tmp-smoke` job (FORGE-S25-T03) clones forge-cli at `main` and runs `./test/e2e/tmp-smoke.sh` with `FORGE_TMP_SMOKE_PLUGIN_SRC` pointing at the in-tree plugin source under `forge/`.
- The gate exercises `/forge:init --fast` (auth-free structural assertions per `forge/init/smoke-test.md`), `/forge:plan` against a seeded `SMOKE-TMP-S01-T01` fixture (auth-required; skips cleanly without `ANTHROPIC_API_KEY`), and `/forge:health` via `validate-store --dry-run` + `generation-manifest check`.
- A plugin change cannot ship green without the forge-cli driver also being green against it. If the forge-cli driver itself has a regression unrelated to the plugin change, the failure must be triaged on the forge-cli side before this gate can be unblocked.

---

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

---

## Official Documentation

- **Plugin development** — https://code.claude.com/docs/en/plugins.md
- **Marketplace development** — https://code.claude.com/docs/en/plugin-marketplaces.md
- **Plugins reference** — https://code.claude.com/docs/en/plugins-reference.md
- **Discover & install plugins** — https://code.claude.com/docs/en/discover-plugins.md

---

## Plugin Structure

- `forge/` — the installable plugin (this is what users get via `/plugin install`)
- `forge/.claude-plugin/plugin.json` — canonical version source
- `forge/migrations.json` — migration chain read by `/forge:update`
- `.claude-plugin/marketplace.json` — marketplace descriptor (repo root)
- `forge/hooks/check-update.js` — session-start update detector;
  reads `updateUrl` from `forge/.claude-plugin/plugin.json` to determine which
  remote to poll. Never hardcodes distribution-specific URLs.

## Distribution-aware update URLs

Each distribution branch carries its own `updateUrl` and `migrationsUrl` in
`forge/.claude-plugin/plugin.json`. `/forge:update` always checks the URL
declared in the installed `plugin.json` — no patching required.

**`main` branch** (tracks forge@forge, direct installs):
```json
"updateUrl":     "https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json",
"migrationsUrl": "https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json"
```

**`release` branch** (tracks forge@skillforge):
```json
"updateUrl":     "https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/.claude-plugin/plugin.json",
"migrationsUrl": "https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/migrations.json"
```

## Promoting to skillforge

Skillforge uses a `git-subdir` source pointing at version tags in this repo.
Tags ensure fresh clones and break version caching in the plugin installation
system.

To promote a version to skillforge users:

0. **Ensure skillforge is cloned locally** (if not already):
   ```bash
   [ -d ../skillforge ] || git clone https://github.com/Entelligentsia/skillforge.git ../skillforge
   ```

1. **Merge main into release:**
   ```bash
   git checkout release
   git merge main
   git push origin release
   ```

2. **Create and push a version tag:**
   ```bash
   git tag -a vX.Y.Z release -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. **Update skillforge to reference the tag:**
   ```bash
   cd ../skillforge
   # Edit .claude-plugin/marketplace.json: change forge entry's "ref": "release" to "ref": "vX.Y.Z"
   git commit -am "chore: pin forge to vX.Y.Z tag"
   git push origin main
   cd ../forge
   ```

<!-- grove:start -->
## INVARIANT — code navigation goes through grove

Every where-is / what's-in / who-calls action in this project goes through the
**grove** MCP server (tree-sitter backed; languages: bash, c, css, html, javascript, json, rust, typescript). This is not a
preference. `grep`, `rg`, `read`, `cat`, and `sed` on a source file are
FALLBACKS, allowed only after grove has been tried and returned insufficient
content. Running `grep -rn '<symbol>'`, or reading a whole source file, as your
first action on a code question is a steering violation.

The grove tools are **deferred** MCP tools — the moment a code question arrives,
load their schemas with ToolSearch (do not default to a search agent or grep):
`mcp__grove__outline`, `mcp__grove__symbols`, `mcp__grove__source`, `mcp__grove__callers`, `mcp__grove__definition`, `mcp__grove__check`.

**Trigger — check before every tool call.** If the prompt contains any of — a
file path, a function / type / struct / macro name, or the words "where is",
"what does X define", "who calls", "show me", "find", "list",
"outline" — your FIRST tool call MUST be a grove tool. Otherwise grove is optional.

**Procedure.**
1. File but no symbol → `mcp__grove__outline` (pass `detail:0` on files > 500 lines).
2. Symbol but no file → `mcp__grove__symbols` with `name`.
3. Take the `symbol-id` (`<lang>:<relpath>#<name>@<row>`) from the result.
4. `mcp__grove__source` with that **id** → exactly that symbol's body.
5. "who calls" → `mcp__grove__callers`; "where defined" → `mcp__grove__definition`.
6. After an edit → `mcp__grove__check`.

**Cross-file.** `mcp__grove__symbols` over the root (definitions tree-wide) → `mcp__grove__callers`
(use sites) → `mcp__grove__source` per definition. Do NOT `grep -rn '<type>' .` instead —
grep returns string matches, grove returns semantic definitions.

**Recovery (partial/truncated output).** Re-run `mcp__grove__source` with the `symbol-id`
form to force body extraction; still partial → `read` with `offset`/`limit` from
the outline, never the whole file. A single grove miss does NOT justify switching
to grep for later questions — re-run with the id form and continue.

`read` on a 1700-line file floods context with ~50 KB you don't need; `grep`
misses struct/function boundaries. `mcp__grove__callers`/`mcp__grove__definition` are name-based
(not receiver-type resolved).
<!-- grove:end -->
