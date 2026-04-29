# Forge — Project Guidelines for Claude

## Two-Layer Architecture — Read This First

This repo contains the Forge plugin source and distribution infrastructure.

```
forge/          ← PLUGIN SOURCE. You develop here.
                  Meta-definitions, hooks, tools, commands, schemas.
                  Changes here ship to all Forge users on next install.
```

### Decision rule — before touching any file, ask:

> **"Am I fixing/building Forge itself?"** → work in `forge/`

### Hard boundaries

**NEVER** edit generated output (`.forge/` directories in installed instances) to fix
a plugin behaviour. The fix goes in `forge/meta/`.

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
| Rebuild structure manifest | Edit mapping in `forge/tools/build-manifest.cjs`, then `node forge/tools/build-manifest.cjs --forge-root forge/` |

---

## Forge Engineering Skills

Seven project-level skills codify the engineering procedures for working on Forge itself. Each skill is a Claude Code Skill in `.claude/skills/<name>/SKILL.md` that loads on demand.

| Skill | When to use | What it does |
|-------|-------------|--------------|
| **forge-architect** | Designing a feature or planning a fix | Blast radius assessment, two-layer compliance, implementation plan, CLAUDE.md requirements |
| **forge-engineer** | Implementing an approved plan | Edit `forge/` only, test-first for `.cjs` tools, progressive verification |
| **forge-validator** | After implementation, before commit | 8-gate compliance: tests, lint, schema, manifest, integrity, health hash, security scan, grep assertions, migration granularity |
| **forge-packager** | Version bump and release prep | `plugin.json` bump, migration entry (granular sub-targets), CHANGELOG entry |
| **forge-bugfixer** | Fixing a reported bug | Triage, locate defect, failing test first, fix, versioning assessment |
| **forge-releaser** | Promote validated version to skillforge | Merge main→release, tag, push, update skillforge repo reference |
| **forge-meta-creator** | Adding new workflow/persona/skill meta sources | Create meta file, update TEMPLATE_MAP, regenerate manifest, verify output |

### Iron Laws (shared across all skills)

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

### Typical workflow

```
/forge-architect  →  /forge-engineer  →  /forge-validator  →  /forge-packager  →  /forge-releaser
       ↑                                                          │
       └──────────── /forge-bugfixer (for bugs) ──────────────────┘

/forge-meta-creator (for new meta sources, after /forge-architect)
```

---

## Versioning — Key Rules

For the full step-by-step procedure, see `/forge-packager` and `/forge-validator`.

- Bump `forge/.claude-plugin/plugin.json` version for every material change
- A change is material if it can affect the engineering workflow of an installed Forge user
- Schema changes that affect entity lifecycle → update `docs/concepts/*.md` diagrams
- Migration entries use **granular sub-targets** (e.g., `"workflows:orchestrate_task"`) not bare categories (e.g., `"workflows"`)
- All script tests must pass before bumping: `node --test forge/tools/__tests__/*.test.cjs`
- Security scan required before push: `/security-watchdog:scan-plugin forge:forge --source-path forge/`
- What does NOT need a version bump: documentation-only changes, typo fixes in `docs/`, README updates

---

## Script Test Suite — Key Rules

For the full test-first procedure, see `/forge-engineer`.

- Every `.cjs` tool has a corresponding test in `forge/tools/__tests__/*.test.cjs`
- Run with: `node --test forge/tools/__tests__/*.test.cjs`
- **Every change to a `.cjs` script must be preceded by a failing test** — write test, watch it fail, implement, watch it pass
- New exports require new tests
- Test-only helpers belong in `__tests__/`, never in tool scripts themselves

---

## Official Documentation

- **Plugin development** — https://code.claude.com/docs/en/plugins.md
- **Marketplace development** — https://code.claude.com/docs/en/plugin-marketplaces.md
- **Plugins reference** — https://code.claude.com/docs/en/plugins-reference.md
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

Users installing via skillforge will get the pinned version on their next
install or `/forge:update`. The tag reference forces a fresh clone, breaking
version caches in Claude Code's plugin installation system.