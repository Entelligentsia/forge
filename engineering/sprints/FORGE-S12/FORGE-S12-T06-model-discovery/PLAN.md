# PLAN — FORGE-S12-T06: Deterministic model discovery for event records

Forge Engineer

**Task:** FORGE-S12-T06
**Sprint:** FORGE-S12
**Estimate:** M

---

## Objective

Add a `discoverModel()` function to `store-cli.cjs` that resolves the actual runtime model from environment variables, and auto-populate the `model` field in `cmdEmit()` and `cmdRecordUsage()` when the caller does not supply one. The function must never silently record an incorrect model name -- if no signal is available, it records `"unknown"` instead of guessing an Anthropic model identifier.

## Approach

1. **Add `discoverModel()` as an exported function** in `store-cli.cjs` that probes environment variables in a defined priority order:
   - `CLAUDE_CODE_SUBAGENT_MODEL` -- the model Claude Code actually runs subagents on (set on all cluster types)
   - `ANTHROPIC_MODEL` -- user-specified model override
   - `CLAUDE_MODEL` -- another user-facing override
   - If none are set, return `"unknown"` rather than a stale Anthropic model name
2. **Auto-populate `model` in `cmdEmit()`**: after parsing event JSON and after timestamp normalization, if `data.model` is missing or empty, set it to `discoverModel()`. If `data.model` is provided by the caller, respect it (caller knows best).
3. **Auto-populate `model` in `cmdRecordUsage()`**: if `--model` flag is not provided, set `sidecar.model` to `discoverModel()`.
4. **Export `discoverModel`** for testability and reuse by other Forge tools.

The key insight: the current problem is that the orchestrator (orchestrate_task.md) hardcodes model resolution and passes it into event JSON, but on non-Anthropic runtimes (e.g., ollama/glm-5.1), the orchestrator's own resolution logic may resolve to an incorrect Anthropic model name. By adding deterministic model discovery at the store-cli level, we guarantee that even if the caller passes a stale or wrong model, the fallback path produces a correct or honest value.

However, the orchestrator still sets `model` explicitly in event JSON. We do NOT override an explicitly provided model -- the caller may have a correct value. The auto-population only fires when `model` is missing or empty, which covers the case where the orchestrator or agent forgets to set it.

For the `record-usage` sidecar, auto-populating the model is even more important because agents often forget the `--model` flag.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/store-cli.cjs` | Add `discoverModel()` function; auto-populate `model` in `cmdEmit()` and `cmdRecordUsage()` | Deterministic model discovery replaces stale/hardcoded fallback |
| `forge/tools/__tests__/store-cli.test.cjs` | Add tests for `discoverModel()` and auto-population behavior | Test-driven: verify env var priority and fallback |

## Plugin Impact Assessment

- **Version bump required?** Yes -- changes store-cli.cjs tool behavior (model auto-population on emit/record-usage)
- **Migration entry required?** Yes -- regenerate targets: `tools` (users must run `/forge:update` to get updated store-cli)
- **Security scan required?** Yes -- changes `forge/`
- **Schema change?** No -- `model` field already required in event schema; we're just auto-populating it

## Testing Strategy

- Syntax check: `node --check forge/tools/store-cli.cjs`
- Unit tests for `discoverModel()`: env var priority, missing vars, empty strings
- Integration tests for `cmdEmit()` auto-population: event without model gets discovered model
- Integration tests for `cmdRecordUsage()` auto-population: sidecar without `--model` gets discovered model
- All existing tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Acceptance Criteria

- [ ] `discoverModel()` returns the model from `CLAUDE_CODE_SUBAGENT_MODEL` when set
- [ ] `discoverModel()` falls back to `ANTHROPIC_MODEL`, then `CLAUDE_MODEL`
- [ ] `discoverModel()` returns `"unknown"` when no env var is set
- [ ] `cmdEmit()` auto-populates missing/empty `model` field via `discoverModel()`
- [ ] `cmdEmit()` preserves an explicitly provided `model` value
- [ ] `cmdRecordUsage()` auto-populates missing `--model` flag via `discoverModel()`
- [ ] `node --check` passes on all modified CJS files
- [ ] All existing and new tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Operational Impact

- **Distribution:** Users must run `/forge:update` to get the updated store-cli.cjs
- **Backwards compatibility:** Fully compatible -- existing events with explicit `model` values are preserved; only missing/empty models get auto-populated