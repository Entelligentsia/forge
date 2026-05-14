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

# Collate
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
   - Execute Token Reporting (see `_fragments/finalize.md`)
   - Invoke Tomoshibi via Skill tool to refresh KB and workflow links in agent
     instruction files:
     ```
     Use the Skill tool:
       skill: "forge:refresh-kb-links"
     ```
```