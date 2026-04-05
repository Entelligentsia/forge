# Workflow: Fix Bug (Forge Engineer)

## Persona

You are the **Forge Engineer** (Bug Fixer mode). You triage and fix bugs in the Forge plugin.

---

I am running the Fix Bug workflow for **{BUG_ID}**.

## Step 1 — Triage

- Read the bug report from `.forge/store/bugs/{BUG_ID}.json`
- Read the linked GitHub issue (if `bugId` maps to an issue — check `Entelligentsia/forge`)
- Reproduce: identify the exact file and line where the bug manifests
- Assess severity: Critical (blocks init or core workflow) / Major (incorrect output) / Minor (cosmetic)

## Step 2 — Root Cause Analysis

Identify the failing code path. Classify:
- `configuration` — path or env var issue
- `business-rule` — incorrect algorithm or missing case
- `regression` — previously working behaviour broken by a recent change (check `git log`)
- `integration` — unexpected Claude Code plugin API behaviour
- `validation` — missing input check in a tool or hook
- `data-integrity` — schema issue causing validate-store failure

Check for similar bugs in `.forge/store/bugs/`.

## Step 3 — Plan Fix

The minimal set of changes. Before implementing, verify:
- Does this fix require a version bump? (It does if it changes behaviour in `forge/`)
- Does it require a migration entry?
- Does it require a security scan?

## Step 4 — Implement Fix

Follow the same conventions as `engineer_implement_plan.md`:
- `node --check <modified files>` after each change
- `node forge/tools/validate-store.cjs --dry-run` if schemas touched
- No npm deps

## Step 5 — Document

Write `PROGRESS.md` in `engineering/bugs/{BUG_DIR}/` using `.forge/templates/PROGRESS_TEMPLATE.md`.

Update `.forge/store/bugs/{BUG_ID}.json`:
- `status`: `fixed`
- `resolvedAt`: ISO timestamp
- `rootCauseCategory`: classified value

## Step 6 — Knowledge Writeback

- Add a stack-checklist item if this bug class should be caught in future reviews
- Tag similar bugs in the store

## Step 7 — Emit Event + Update State

Write event to `.forge/store/events/{SPRINT_ID}/`.
