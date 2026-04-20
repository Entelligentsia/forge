# Validation Report — FORGE-S11-T06

🍵 *QA Engineer*

**Task:** FORGE-S11-T06
**Artifact:** `forge/commands/quiz-agent.md`

---

## Acceptance Criteria Check

| Criterion | Status | Notes |
|-----------|--------|-------|
| `forge/commands/quiz-agent.md` exists with valid frontmatter (`name: quiz-agent`) | ✅ Pass | File exists; `name: quiz-agent` confirmed |
| Frontmatter `description` accurately describes the command | ✅ Pass | "Verify an agent has loaded and understood the project knowledge base..." |
| Body includes `FORGE_ROOT` setup block | ✅ Pass | Block present on lines 13–16 |
| Body invokes the quiz_agent workflow | ✅ Pass | `Read '.forge/workflows/quiz_agent.md' and follow it exactly.` |
| On-error footer present | ✅ Pass | Two on-error cases: missing workflow + general Forge bug |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | ✅ Pass | `Store validation passed (11 sprint(s), 71 task(s), 17 bug(s)).` |

## Additional Checks

- Frontmatter parses cleanly (YAML key-value, no syntax issues)
- Workflow path `.forge/workflows/quiz_agent.md` matches the file that exists in the dogfooding instance
- No JS/CJS files modified — `node --check` not applicable
- Pattern matches existing command conventions (`ask.md`, `add-task.md`, etc.)

## Summary

All acceptance criteria pass. The command file is complete and correct.

**Verdict:** Approved
