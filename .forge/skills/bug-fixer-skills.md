# Bug Fixer Skills — Forge

## Triage Protocol

1. Locate or create the bug record via `store-cli` — never write `.forge/store/bugs/*.json` directly
2. Reproduce the bug: find the exact file and line where it manifests
3. Classify root cause: `validation`, `auth`, `business-rule`, `data-integrity`, `race-condition`, `integration`, `configuration`, or `regression`
4. Set `status: "in-progress"` before starting any fix work
5. Check `.forge/store/bugs/` for similar bugs; tag `similarBugs` if found

## Root Cause Identification

For bugs in generated files (`.forge/workflows/`, `.forge/personas/`, `.forge/skills/`):
- The root cause is in `forge/meta/` — the generated file is a symptom
- Classify as `business-rule` (wrong meta algorithm) or `regression` (meta changed, generated file not regenerated)
- Never fix by editing `.forge/` directly

For bugs in plugin source (`forge/hooks/`, `forge/tools/`, `forge/schemas/`):
- Read the actual file — do not assume from the bug report
- Use `node --check <file>` to rule out syntax issues first
- Trace the execution path: which hook/tool/command triggers the bug?

## Fix Implementation Checklist

- [ ] `node --check <file>` after every JS/CJS edit
- [ ] `validate-store --dry-run` after any schema change
- [ ] Version bump in `forge/.claude-plugin/plugin.json` if `forge/` was changed (materiality rule)
- [ ] Migration entry in `forge/migrations.json` with correct `regenerate` targets
- [ ] Security scan: `node forge/tools/validate-store.cjs --dry-run` — save full report to `docs/security/scan-v{VERSION}.md`
- [ ] README security table updated

## Knowledge Writeback

After every fix:
- Add a `engineering/stack-checklist.md` item if this bug class should be caught in future reviews
- Tag `similarBugs` in the bug store JSON if related bugs exist
- Update `rootCauseCategory` if refined during implementation
- Set `resolvedAt` timestamp on commit
