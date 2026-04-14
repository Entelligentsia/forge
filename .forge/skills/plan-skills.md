# Engineer Planning Skills — Forge

## Code Analysis

Use `Glob`, `Grep`, and `Read` to map the codebase before proposing any changes.
- `Glob "forge/**/*.md"` to find command/workflow/meta files
- `Grep` for patterns that already solve similar problems
- Read the existing implementation in the area you're touching before proposing a new approach

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
