---
requirements:
  reasoning: Medium
  context: Low
  speed: High
deps:
  personas: [collator]
  skills: [collator, generic]
  templates: []
  sub_workflows: []
  kb_docs: [MASTER_INDEX.md]
  config_fields: [paths.engineering]
---

# 🍃 Meta-Workflow: Collate

## Purpose

Regenerate markdown views from the JSON store. This is a deterministic operation — prefer the generated tool, fall back to manual collation.

## Iron Laws

- Collation is a read-and-rewrite of generated markdown. Do not mutate any JSON record under `.forge/store/`; the store is the source of truth and collation flows downstream from it.
- Read `.forge/personas/collator.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
- All store reads via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.

## Store-Write Verification

Collation typically writes markdown views, not JSON records. If a remediation
step does call `forge_store` and the call exits non-zero or the `PreToolUse`
write-boundary hook blocks the call (exit 2):

1. Parse the structured error (names the offending field + schema file).
2. Correct the JSON to satisfy the schema.
3. Retry. Repeat up to 3 times.
4. After 3 failures, halt and escalate with original payload, corrected payload, and all error messages.

Never set `FORGE_SKIP_WRITE_VALIDATION=1` — operator-only emergency switch.

## Algorithm

```
1. Preferred: Run Plugin Tool
   - Read `paths.forgeRoot` from `.forge/config.json` as `FORGE_ROOT`
   - Run: `node "$FORGE_ROOT/tools/collate.cjs" [SPRINT_ID]`
   - If tool succeeds, proceed to Finalize

2. Fallback: Manual Collation
   - Read `.forge/config.json` for prefix, paths, project description
   - Read all sprint/task/bug/event JSONs from `.forge/store/`
   - Generate MASTER_INDEX.md (sprint registry, task registry, bug registry)
   - Generate per-sprint TIMESHEET.md (from events)
   - Generate any other configured views

3. Rebuild context pack:
   - Rebuild the architecture context pack so orchestrators have a fresh summary
     after any KB updates (architecture docs may have changed during the sprint):
     ```
     FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
     ENGINEERING=$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)
     node "$FORGE_ROOT/tools/build-context-pack.cjs" \
       --arch-dir "$ENGINEERING/architecture" \
       --out-md .forge/cache/context-pack.md \
       --out-json .forge/cache/context-pack.json
     ```
   - On exit 1 (architecture directory absent), skip silently.

4. Finalize:
   - Emit the complete event (canonical shape — required fields: `eventId, taskId, sprintId, role, action, phase, iteration, startTimestamp, endTimestamp, durationMinutes, model`; see `_fragments/event-emission-schema.md`. Do NOT invent `{type:"complete", verdict, timestamp}` — that shape is rejected. Run `node "$FORGE_ROOT/tools/store-cli.cjs" describe event` if unsure) via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
   - Invoke Tomoshibi via Skill tool to refresh KB and workflow links in agent
     instruction files:
     ```
     Use the Skill tool:
       skill: "forge:refresh-kb-links"
     ```
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/collator.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
- **Workflow Structure:** The generated `collate.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of large-scale file generation; use the `Agent` tool for sub-tasks.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Probe session token usage: invoke `/cost` if the host runtime supports it
     (Claude Code only); on any other runtime treat as unavailable and proceed.
     Do NOT shell out to a `cost-cli.cjs` — there is no such tool.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
