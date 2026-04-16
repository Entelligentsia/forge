# Engineer Skills — Forge

## Code Analysis

Use `Glob`, `Grep`, and `Read` to map the codebase before proposing or writing any change.
- `Glob "forge/**/*.md"` to find command, workflow, and meta files
- `Grep` for patterns that already solve similar problems before introducing new ones
- Read the existing implementation in the area you're touching before modifying it

## Impact Assessment

Before any plan or implementation:
1. Identify all files in `forge/` that will be modified
2. Classify each change: material (user-visible behaviour change → version bump) or non-material (docs/comments → no bump)
3. Determine if a security scan is required (any `forge/` file changed = yes, always)
4. Determine if `regenerate` targets need updating in the migration entry

## Planning Checklist

A complete `PLAN.md` for Forge must include:
- [ ] Plugin Impact Assessment (version bump? migration entry? security scan? regeneration targets?)
- [ ] Files to Modify — explicit list in `forge/`
- [ ] Verification Plan — exact `node --check` commands and `validate-store --dry-run`
- [ ] Acceptance Criteria — observable outcomes the Supervisor can verify independently
- [ ] Operational Impact — what do users need to do after upgrading?

## Implementation Protocol

1. Read each file before editing it
2. After every JS/CJS edit: `node --check <file>` — MUST pass before moving on
3. After schema changes: `node forge/tools/validate-store.cjs --dry-run`
4. If `forge/` was modified: run `/security-watchdog:scan-plugin forge:forge --source-path forge/`; save full report to `docs/security/scan-v{VERSION}.md`
5. Record literal command output in `PROGRESS.md` — never summarise or claim

## Git Protocol

- Stage specific files by path — never `git add -A` or `git add .`
- Commit message prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `security:`, `release:`
- Always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Never `--no-verify`. If a hook fails, diagnose and fix, then create a NEW commit

## Common Pitfalls

- Introducing `require()` of any non-built-in module (absolutely blocked)
- Hardcoding `'engineering/'` or `'.forge/store/'` as string literals in tools
- Editing `.forge/workflows/`, `.forge/personas/`, or `.forge/skills/` directly (regenerated output — fix goes in `forge/meta/`)
- Forgetting to update `README.md` security table when adding `docs/security/scan-v*.md`
