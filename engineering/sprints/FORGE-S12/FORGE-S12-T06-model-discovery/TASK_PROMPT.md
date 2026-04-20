# FORGE-S12-T06: Deterministic model discovery for event records

**Sprint:** FORGE-S12
**Estimate:** M
**Pipeline:** default

---

## Objective

Event records should capture the actual model being used, not a hardcoded or stale fallback. The current model discovery logic records `claude-opus-4-7` even when running on ollama/glm-5.1 or other non-Anthropic models. Detect model identity from environment variables and platform signals; fall back to a reasonable default but never silently record an incorrect model name.

## Acceptance Criteria

1. Event records reflect the model the session is actually running on
2. Fallback to a reasonable default when model identity is unavailable, but never silently records an incorrect model name
3. Works across Claude Code, ollama, and other model providers
4. `node --check` passes on all modified CJS files
5. All existing tests pass, plus new tests for model discovery: `node --test forge/tools/__tests__/*.test.cjs`

## Context

- GitHub issue #63 — Deterministic model discovery
- `forge/tools/store-cli.cjs` — event creation code, currently uses hardcoded or stale model fallback
- Model identity may be available from: `CLAUDE_MODEL` env var, `ANTHROPIC_MODEL` env var, the Claude Code system prompt (which includes model info), or the platform's API
- Risk: Model discovery API varies across Claude Code versions — use defensive fallback
- This is a **nice-to-have** task — attempt only if all must-have tasks (T01–T05) are complete

## Plugin Artifacts Involved

- `forge/tools/store-cli.cjs` — model discovery logic (tool layer)
- `forge/tools/__tests__/store-cli.test.cjs` — new/updated tests

## Operational Impact

- **Version bump:** Required if implemented
- **Regeneration:** Users must run `/forge:update` to get updated tools
- **Security scan:** Required — changes `forge/`

## Plan Template

Follow `.forge/templates/PLAN_TEMPLATE.md` for the plan phase.