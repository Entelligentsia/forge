# Generation: Tools

## Purpose

Install pre-built tools and schemas from the Forge plugin into the project.
No generation step — tools ship with the plugin and are copied as-is.

## Inputs

- `$FORGE_ROOT/tools/` — pre-built Node.js CJS tool scripts
- `$FORGE_ROOT/schemas/` — JSON Schema files for all store types
- `.forge/config.json` — target paths

## Outputs

- `engineering/tools/` — four executable tool scripts
- `.forge/schemas/` — four JSON Schema files

## Instructions

Read `.forge/config.json` for:
- `paths.tools` (default: `engineering/tools`)
- `paths.store` (default: `.forge/store`)

### Step 1 — Copy tools

Copy all four files from `$FORGE_ROOT/tools/` to the project's tools directory:

| Source | Destination |
|--------|-------------|
| `$FORGE_ROOT/tools/collate.cjs` | `{paths.tools}/collate.cjs` |
| `$FORGE_ROOT/tools/seed-store.cjs` | `{paths.tools}/seed-store.cjs` |
| `$FORGE_ROOT/tools/validate-store.cjs` | `{paths.tools}/validate-store.cjs` |
| `$FORGE_ROOT/tools/manage-config.cjs` | `{paths.tools}/manage-config.cjs` |

Create the destination directory if it does not exist.
Make each file executable (`chmod +x`).

### Step 2 — Copy schemas

Copy all four files from `$FORGE_ROOT/schemas/` to `.forge/schemas/`:

| Source | Destination |
|--------|-------------|
| `$FORGE_ROOT/schemas/task.schema.json` | `.forge/schemas/task.schema.json` |
| `$FORGE_ROOT/schemas/event.schema.json` | `.forge/schemas/event.schema.json` |
| `$FORGE_ROOT/schemas/sprint.schema.json` | `.forge/schemas/sprint.schema.json` |
| `$FORGE_ROOT/schemas/bug.schema.json` | `.forge/schemas/bug.schema.json` |

Create `.forge/schemas/` if it does not exist.

### Step 3 — Verify

Run a quick smoke test:
```
node {paths.tools}/validate-store.cjs --dry-run
```

If it exits non-zero, report the error. Do not proceed to Phase 9 until this passes.

## Notes

- Tools are plain Node.js CJS — no `npm install` needed, no dependencies beyond stdlib.
- Node.js is a prerequisite for all platforms Forge currently supports
  (Claude Code, Gemini CLI, Codex CLI, GitHub Copilot CLI).
- Tools read `.forge/config.json` at runtime relative to `process.cwd()` —
  they must be run from the project root.
- To update tools after a plugin upgrade, run `/forge:update-tools`.
