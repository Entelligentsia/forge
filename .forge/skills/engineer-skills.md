# Engineer Skills — Forge

## Code Analysis

Use `Glob`, `Grep`, and `Read` to map the codebase before proposing any changes.
- `Glob "forge/**/*.md"` to find command/workflow/meta files
- `Grep` for patterns that already solve similar problems
- Read the existing implementation in the area you're touching before proposing a new approach

## Implementation

When modifying JS/CJS files:
- Run `node --check <file>` after every modification — must exit 0 before moving on
- Hooks: `'use strict';` + `process.on('uncaughtException', () => process.exit(0))`
- Tools: `'use strict';` + top-level try/catch + `process.exit(1)` on error
- No npm `require()` calls — Node.js built-ins only (`fs`, `path`, `os`, `https`)
- Paths come from `.forge/config.json` — never hardcode `'engineering/'` or `'.forge/store/'`

## Impact Assessment

Before writing any plan:
1. Identify all files in `forge/` that will be modified
2. Classify each change as material or non-material (see `engineering/architecture/processes.md`)
3. Determine if a version bump + migration entry is required
4. Determine if a security scan is required (any `forge/` change = yes)

## Plan Quality Checklist

A complete `PLAN.md` for Forge must include:
- [ ] Plugin Impact Assessment (version bump? migration entry? security scan?)
- [ ] Files to Modify — explicit list in `forge/`
- [ ] Verification Plan — exact `node --check` commands
- [ ] Acceptance Criteria — observable outcomes the Supervisor can verify independently
- [ ] Operational Impact — what do users need to do after upgrading?

## Common Pitfalls to Pre-empt

- Introducing npm dependencies (blocked — use built-ins only)
- Hardcoding paths like `'engineering/'` or `'.forge/store/'`
- Missing `additionalProperties: false` on schema objects
- Forgetting `process.on('uncaughtException', () => process.exit(0))` in hooks
- Editing `.forge/workflows/`, `.forge/personas/`, or `.forge/skills/` directly — fixes go in `forge/meta/`
- Missing `"from"` key in migration entry

## Skill Invocations

When implementing features that involve security scanning or plugin architecture review:
- YOU MUST invoke `security-watchdog:scan-plugin` before committing any change to `forge/`
- YOU MUST invoke `plugin-dev:plugin-structure` when adding new plugin components
