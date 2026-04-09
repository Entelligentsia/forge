# PLAN: FORGE-S02-T09

## Plugin Impact Assessment
- **Version bump**: No (deferred to T10)
- **Security scan**: Required at T10
- **Migration entry**: N/A
- **Schema change**: No

## Files to Modify
- `README.md`
- `docs/default-workflows.md`
- `docs/customising-workflows.md`
- `forge/vision/01-OVERVIEW.md`
- `docs/concepts/task.md`
- `docs/concepts/sprint.md`

## Operational Impact
No user action needed — no generated artifacts change.

## Verification Plan
1. Check `README.md` mermaid diagram
2. Run `grep -r "docs/default-workflows.md" README.md docs/` to verify it finds only the redirect stub

## Acceptance Criteria
1. **README.md** — "How it works" section gains the canonical containment diagram.
2. **README.md** — "Get Started" table gains a row for concepts.
3. **README.md** — Security Scan History table is preserved.
4. **`docs/default-workflows.md`** — Content is absorbed into `docs/concepts/sprint.md` and `docs/concepts/task.md`, file replaced with a redirect.
5. **`docs/customising-workflows.md`** — Gains a header line back-link.
6. **`forge/vision/01-OVERVIEW.md`** — Updated matching containment model.
7. Verification grep finds only the redirect.
