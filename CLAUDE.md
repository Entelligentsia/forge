# Forge — Project Guidelines for Claude

## Versioning

**Bump `forge/.claude-plugin/plugin.json` version for every material change.**

A change is material if it can affect the engineering workflow of a user who has
already installed Forge. This includes:

- Bug fixes to any command, hook, tool spec, or workflow
- Changes to tool specs (`forge/meta/tool-specs/`) that alter generated tool behaviour
- Changes to command files (`forge/commands/`) that alter how commands behave
- Changes to hooks (`forge/hooks/`)
- New commands or tools
- Schema changes to `.forge/store/` or `.forge/config.json`

**Also required with every version bump:**

1. Add a migration entry to `forge/migrations.json` with:
   - `"from"` key = previous version
   - `"version"` = new version
   - `"notes"` = one-line human-readable summary
   - `"regenerate"` = list of targets users must regenerate (`"tools"`, `"workflows"`, etc.), or `[]` if none
   - `"breaking"` = `true` if manual steps are needed before regenerating
   - `"manual"` = list of manual step descriptions (empty array if none)

2. If `"tools"` or `"workflows"` is in `regenerate`, users will need to run
   `/forge:update` after installing — make sure the migration notes are clear.

**What does NOT need a version bump:** documentation-only changes, typo fixes
in `docs/`, README updates, or changes that have no effect on installed projects.

## Security Scanning

**After every version-bump commit lands on `main`, run a security scan and
file the report as a versioned artifact.**

### Steps

1. **Reinstall the plugin locally** from the repo so the scan targets the exact
   code that was just committed:
   ```
   /plugin install ./forge
   ```

2. **Run the scan:**
   ```
   /security-watchdog:scan-plugin forge:forge
   ```

3. **Save the report** to `docs/security/scan-v{VERSION}.md`, where `{VERSION}`
   matches the version just bumped to (e.g. `docs/security/scan-v0.3.6.md`).
   The report should be the full output from the scan — do not summarise.

4. **Update `README.md`** — add a row to the Security Scan History table under
   the `## Security` section:
   ```
   | v{VERSION} | {DATE} | [Report](docs/security/scan-v{VERSION}.md) | {one-line finding summary} |
   ```
   If the `## Security` section does not yet exist in README, create it
   directly above the `## Supported Stacks` section using this template:

   ```markdown
   ## Security

   Every plugin release is scanned with
   [security-watchdog](https://github.com/Entelligentsia/security-watchdog)
   before publication. Reports are filed as versioned artifacts in
   [`docs/security/`](docs/security/).

   | Version | Date | Report | Summary |
   |---------|------|--------|---------|
   | v{VERSION} | {DATE} | [scan-v{VERSION}.md](docs/security/scan-v{VERSION}.md) | {summary} |
   ```

5. **Commit** the report and README update together:
   ```
   git add docs/security/scan-v{VERSION}.md README.md
   git commit -m "security: add scan report for v{VERSION}"
   ```

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
- `forge/hooks/check-update.js` and `.sh` — session-start update detector;
  remote URL must point to `forge/.claude-plugin/plugin.json` on `main`
