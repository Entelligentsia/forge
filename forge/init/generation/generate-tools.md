# Generation: Tools

## Purpose

Generate deterministic tools in the project's native language from
language-agnostic tool specs.

## Inputs

- `$FORGE_ROOT/meta/tool-specs/*.spec.md` (3 tool specs)
- `.forge/config.json` — language, paths, prefix

## Outputs

`engineering/tools/` with tools in the project's primary language:

| Tool Spec | Python | Node.js (CJS) | Node.js (ESM) | Go | Shell (fallback) |
|-----------|--------|---------------|---------------|----|-------------------|
| `collate.spec.md` | `collate.py` | `collate.cjs` | `collate.mjs` | `collate.go` | `collate.sh` |
| `seed-store.spec.md` | `seed_store.py` | `seed-store.cjs` | `seed-store.mjs` | `seed-store.go` | `seed-store.sh` |
| `validate-store.spec.md` | `validate_store.py` | `validate-store.cjs` | `validate-store.mjs` | `validate-store.go` | `validate-store.sh` |
| `manage-config.spec.md` | `manage_config.py` | `manage-config.cjs` | `manage-config.mjs` | `manage-config.go` | `manage-config.sh` |

## Instructions

**Before generating Node.js tools**, read the project's `package.json`. Check for `"type": "module"`:
- If `"type": "module"` is present: the project is ESM. Generate tools with `.mjs` extension using ESM `import`/`export` syntax.
- If `"type": "module"` is absent or `"type": "commonjs"`: generate tools with `.cjs` extension using CommonJS `require()`/`module.exports` syntax.

Never generate `.js` Node.js tools — `.js` files are interpreted according to the nearest `package.json`'s `"type"` field, which causes `require is not defined` errors in ESM projects.

For each tool spec:
1. Read the spec's Algorithm, CLI Interface, and Formatting Rules
2. Detect the Node.js module system (see above) before generating Node.js tools
3. Generate an implementation in the project's primary language
4. Make it executable (`#!/usr/bin/env <lang>`)
5. Use the project's standard library — minimal dependencies
6. Follow the project's naming conventions
7. Read `.forge/config.json` for paths and prefix at runtime
8. Include basic error handling and usage help
9. Make the tool self-contained (single file)
