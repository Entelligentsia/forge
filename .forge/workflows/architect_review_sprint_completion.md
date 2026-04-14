---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🗻 Workflow: Review Sprint Completion (Forge Architect)

## Persona

🗻 **Forge Architect** — I assess overall sprint health before closing it out.

This workflow runs after all tasks have reached terminal status
(`committed`, `escalated`, or `abandoned`) and before the retrospective.

---

I am reviewing sprint completion for **{SPRINT_ID}**.

## Step 1 — Assess Task Outcomes

Read all task JSONs from `.forge/store/tasks/` filtered by `sprintId: "{SPRINT_ID}"`.
Build the outcome table:

| Task | Status | Notes |
|---|---|---|
| {TASK_ID} | committed / escalated / abandoned | Reason / carry-over? |

## Step 2 — Version Consistency Check

- Are all shipped tasks reflected in `forge/migrations.json`?
- Is `forge/.claude-plugin/plugin.json` → `version` the correct final value for the sprint?
- Are all security scan reports committed to `docs/security/`?
- Is the Security Scan History table in `README.md` up to date?
- Is the migration chain continuous? (No skipped `from` versions.)

## Step 3 — Distribution Health

- Did any commits land without a scan that should have had one?
- Any `breaking: true` migrations that need release notes beyond `migrations.json`?
- Any tasks that modified the `/forge:update` path itself? If so, has the update flow been smoke-tested?

## Step 4 — Carry-Over Decision

For any incomplete tasks (`escalated`, still `implementing`):

- **Carry over** — update `estimate`, reset `status` to `planned`, move into next sprint's task list
- **Abandon** — set `status` to `abandoned`, document the reason

## Step 5 — Sprint Status Update

Update `.forge/store/sprints/FORGE-S{NN}.json`:

- `status`: `completed` (all tasks committed) or `partially-completed`
- `completedAt`: ISO timestamp

## Step 6 — Hand Off to Retrospective

> "Sprint {SPRINT_ID} reviewed. Run `/retrospective {SPRINT_ID}` to close out
> the sprint and update the knowledge base."
