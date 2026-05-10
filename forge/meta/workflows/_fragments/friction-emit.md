<!-- Canonical Friction Emit fragment.
     Referenced from meta-implement.md, meta-fix-bug.md, meta-validate.md,
     meta-plan-task.md, and meta-orchestrate.md. /forge:enhance --phase 2
     greps generated workflows for `## Friction Emit` to discover the channel.

     T00 lands the writer side of the friction channel; T01 will narrow the
     `subkind` enum and shape `evidence`. Until T01 ships, treat both as
     opt-in slots.
-->

# Friction Emit (Fragment)

When the persona detects skill friction during the workflow — a referenced
skill is unused, fails on invocation, is missing from the registry, has gone
stale relative to current architecture, or is redundant with another skill —
emit a `friction` event so `/forge:enhance --phase 2` can act on the signal.
This is the writer side of the channel whose reader landed in S13-T08; the
reader is empty without these emits.

## Trigger conditions

Set `issue` on the emitted event to one of the following tokens:

| Token              | When to emit                                                                     |
|--------------------|----------------------------------------------------------------------------------|
| `skill_unused`     | A skill listed in the persona's skill block was loaded but never consulted.      |
| `skill_failed`     | A skill was consulted but its guidance produced an error or required correction. |
| `skill_missing`    | The workflow needed guidance the available skills did not cover.                 |
| `skill_stale`      | A skill's guidance contradicts current architecture / supersedes its own advice. |
| `skill_redundant`  | Two skills provided overlapping or conflicting guidance for the same decision.   |

Emit one event per distinct friction signal — do not coalesce multiple
findings into a single event.

## Emit shape

Flat payload — every field at the top level, no nesting (same shape
stabilized by BUG-029). The schema enforces `{workflow, persona, issue}` as
required when `type === "friction"`. `subkind` and `evidence` slots are
optional now and will be narrowed by T01.

```sh
node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{
  "eventId":         "{ISO}_{taskId}_{persona-noun}_friction",
  "taskId":          "{taskId}",
  "sprintId":        "{sprintId}",
  "role":            "{persona-noun}",
  "action":          "friction_observed",
  "phase":           "{workflow-key}",
  "iteration":       1,
  "startTimestamp":  "{ISO}",
  "endTimestamp":    "{ISO}",
  "durationMinutes": 0,
  "model":           "{resolved-model}",
  "type":            "friction",
  "workflow":        "{workflow-key}",
  "persona":         "{persona-noun}",
  "issue":           "skill_unused | skill_failed | skill_missing | skill_stale | skill_redundant",
  "subkind":         "{optional — T01 will narrow the enum}",
  "evidence":        { "skill_id": "...", "note": "..." },
  "notes":           "<one-line human description>"
}'
```

## Per-workflow values

| Workflow         | `workflow` | `persona`     | `phase`      |
|------------------|------------|---------------|--------------|
| meta-implement   | implement  | engineer      | implement    |
| meta-fix-bug     | fix-bug    | bug-fixer     | fix-bug      |
| meta-validate    | validate   | qa-engineer   | validate     |
| meta-plan-task   | plan-task  | architect     | plan         |
| meta-orchestrate | orchestrate| orchestrator  | orchestrate  |
