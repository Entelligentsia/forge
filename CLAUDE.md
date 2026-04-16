# Forge — Project Guidelines for Claude

## Two-Layer Architecture — Read This First

This repo contains two entirely separate things. Confusing them causes wrong edits.

```
forge/          ← PLUGIN SOURCE. You develop here.
                  Meta-definitions, hooks, tools, commands, schemas.
                  Changes here ship to all Forge users on next install.

.forge/         ← DOGFOODING INSTANCE. Generated output. Do not edit directly.
engineering/    ← DOGFOODING KB. Sprint artifacts for this project's own dev.
                  Managed by Forge commands (/plan, /implement, /sprint-plan…).
```

### Decision rule — before touching any file, ask:

> **"Am I fixing/building Forge itself?"** → work in `forge/`
> **"Am I executing a sprint task for this project?"** → use Forge commands; they write to `engineering/` and `.forge/`

### Hard boundaries

**NEVER** edit `.forge/workflows/`, `.forge/personas/`, or `.forge/skills/` to fix
a plugin behaviour. The fix goes in `forge/meta/` — `.forge/` is regenerated output.

**NEVER** edit `engineering/` as part of implementing a plugin feature.

**NEVER** regenerate `.forge/` as a side-effect of plugin development work —
regeneration is a user action (`/forge:regenerate`) that runs after they upgrade.

### Where things live

| You want to… | Edit this |
|---|---|
| Fix a workflow bug | `forge/meta/workflows/meta-*.md` |
| Fix a persona or skill | `forge/meta/personas/` or `forge/meta/skills/` |
| Fix a hook | `forge/hooks/` |
| Fix a tool | `forge/tools/` |
| Add a command | `forge/commands/` |
| Change a schema | `forge/schemas/` |
| Update a sprint task (dogfooding) | Use `/plan`, `/implement`, etc. |
| Check dogfooding project health | `/forge:health` |
| Rebuild structure manifest | Edit mapping in `forge/tools/build-manifest.cjs`, then `node forge/tools/build-manifest.cjs --forge-root forge/` |

---

## Versioning

**Bump `forge/.claude-plugin/plugin.json` version for every material change.**

A change is material if it can affect the engineering workflow of a user who has
already installed Forge. This includes:

- Bug fixes to any command, hook, tool spec, or workflow
- Changes to tool specs (`forge/meta/tool-specs/`) that alter generated tool behaviour
- Changes to command files (`forge/commands/`) that alter how commands behave
- Changes to hooks (`forge/hooks/`)
- New commands or tools
- Schema changes to `forge/schemas/` (the source schemas that get copied to user projects)

**Invariant: schema change → update concepts diagram:**
If a schema change affects the lifecycle (state machinery) of a Forge entity (Sprint, Task, Bug, Feature), the corresponding handwritten state diagram in `docs/concepts/*.md` MUST be manually updated to reflect the new state enums.

**Also required with every version bump (steps 1 and 2 are parallel — do both before moving on):**

1. Add a migration entry to `forge/migrations.json` with:
   - `"from"` key = previous version
   - `"version"` = new version
   - `"notes"` = one-line human-readable summary
   - `"regenerate"` = list of targets users must regenerate (`"tools"`, `"workflows"`, etc.), or `[]` if none
   - `"breaking"` = `true` if manual steps are needed before regenerating
   - `"manual"` = list of manual step descriptions (empty array if none)

2. Add an entry to `CHANGELOG.md` (repo root) for the new version. Use the
   format already established in that file:
   - Heading: `## [X.Y.Z] — YYYY-MM-DD` (append `**△ Breaking**` if applicable)
   - One-paragraph description of what changed
   - `**Regenerate:** ...` line if regeneration is required
   - `> Manual: ...` block quote for any manual steps
   - Prepend at the top (newest-first order)

3. If `"tools"` or `"workflows"` is in `regenerate`, users will need to run
   `/forge:update` after installing — make sure the migration notes are clear.

4. **All script tests must pass before bumping.** Run
   `node --test forge/tools/__tests__/*.test.cjs` — if any test fails, the
   version bump and push are blocked until all tests pass and the failures are
   resolved.

5. **Run a security scan before pushing.** A version bump means new code is
   being distributed to every user who has Forge installed. Scan the
   **source directory** (`forge/`), not the cached install under
   `~/.claude/plugins/cache/`:

   ```
   /security-watchdog:scan-plugin forge:forge --source-path forge/
   ```

   If the scan skill does not support `--source-path`, tell it explicitly
   to scan the source at `/home/boni/src/forge/forge/` (or the current
   repo's `forge/` directory) instead of the installed plugin cache.

   Save the full report (do not summarise) to
   `docs/security/scan-v{VERSION}.md` and commit it together with the
   version bump in the same commit or a follow-up `security:` commit.

   Update the security scan index and README table:

   a. **`docs/security/index.md`** — prepend a new row at the top of the
      table (below the header). This page holds the complete history.

   b. **`README.md` `## Security` table** — prepend the new row, then
      remove the oldest row so the table always shows exactly the 3 most
      recent scans. The line below the table must remain:
      `[Full scan history →](docs/security/index.md)`

   If the `## Security` section does not yet exist in `README.md`, create
   it directly above `## Supported Stacks` with this structure:

   ```markdown
   ## Security

   Every release is scanned with `/security-watchdog:scan-plugin` before
   publication. Reports are filed as versioned artifacts in
   [`docs/security/`](docs/security/).

   | Version | Date | Report | Summary |
   |---------|------|--------|---------|

   [Full scan history →](docs/security/index.md)
   ```

6. **Run `build-manifest.cjs` after any meta/ file change:**
   If you add, rename, or remove any file in `forge/meta/personas/`,
   `forge/meta/workflows/`, `forge/meta/templates/`, or `forge/schemas/*.schema.json`,
   update the corresponding mapping table in `forge/tools/build-manifest.cjs` and
   re-run it to regenerate `forge/schemas/structure-manifest.json`. Commit both the
   updated tool and the updated manifest together.
   Note: `CUSTOM_COMMAND_TEMPLATE.md` is a one-shot init artifact (no meta source).
   Do not add a meta source for it — keep its TEMPLATE_MAP entry as `[null, 'CUSTOM_COMMAND_TEMPLATE.md']`.

**What does NOT need a version bump:** documentation-only changes, typo fixes
in `docs/`, README updates, or changes that have no effect on installed projects.

---

## Script Test Suite — Mandatory Rules

Every `.cjs` tool in `forge/tools/` has a corresponding test file in
`forge/tools/__tests__/*.test.cjs`. The suite is run with:

```sh
node --test forge/tools/__tests__/*.test.cjs
```

### Before committing any change to `forge/tools/`

1. **All 241 tests must pass.** If any test fails, the commit is blocked.
   Run the full suite and confirm zero failures before staging changes.

2. **Every change to a `.cjs` script must be preceded by a failing test.**
   If you are modifying `collate.cjs`, `store-cli.cjs`, `build-manifest.cjs`,
   or any other tool script, you MUST first write or update the corresponding
   test that exposes the bug or validates the new behaviour — watch it fail —
   then make the script change, then watch it pass. No exceptions.

   This means:
   - **Bug fix:** Write a test that reproduces the bug → see it fail → fix the
     code → see it pass.
   - **New feature:** Write a test that defines the expected behaviour → see it
     fail → implement the feature → see it pass.
   - **Refactor:** Run existing tests before touching code → refactor → run tests
     again — they must still pass. If behaviour changes intentionally, write
     the test for the new behaviour first.

3. **New exports require new tests.** If you add a function to `module.exports`
   in any tool, add at least one test for it in the matching test file.

4. **Test-only helpers belong in `__tests__/`.** If a test needs shared
   fixtures or helpers (e.g. `MemoryImpl`), keep them inside
   `forge/tools/__tests__/` — never in the tool scripts themselves.

## Official Documentation

- **Plugin development** — https://code.claude.com/docs/en/plugins.md
  Creating plugins, manifest schema, skills/agents/hooks/MCP, testing with `--plugin-dir`, converting standalone configs.

- **Marketplace development** — https://code.claude.com/docs/en/plugin-marketplaces.md
  `marketplace.json` schema, plugin sources (relative path, GitHub, git-subdir, npm), hosting, private repos, managed restrictions, version/release channels.

- **Plugins reference** (full technical spec) — https://code.claude.com/docs/en/plugins-reference.md

- **Discover & install plugins** — https://code.claude.com/docs/en/discover-plugins.md

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

Skillforge uses a `git-subdir` source pointing at the `release` branch of this
repo. No changes to skillforge are ever needed for a promotion.

To promote a version to skillforge users:

```bash
git checkout release
git merge main
git push origin release
```

That's it. Users installing via skillforge will get the new version on their
next install or `/forge:update`. The `release` branch's `updateUrl` ensures
their update checks track the release branch, not main.
