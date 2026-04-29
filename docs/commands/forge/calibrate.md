# /forge:calibrate

**Category:** Forge plugin command  
**Run from:** Any Forge-initialised project directory

---

## Purpose

Detects drift between the knowledge base and agent definitions, categorizes drift by type, proposes surgical regeneration patches, and applies approved patches with Architect approval. Calibrate keeps your Forge instance sharp as the codebase evolves — without a full `/forge:init` re-run.

---

## Invocation

```bash
/forge:calibrate
/forge:calibrate --path /path/to/project
```

| Argument | Purpose |
|----------|---------|
| `--path <dir>` | Run calibration against a different project directory |

---

## How it works

### Step 1 — Locate config

Reads `.forge/config.json`. If absent, prompts to run `/forge:init` first.

### Step 2 — Establish or verify baseline

If `calibrationBaseline` is missing, computes and writes the initial baseline (same algorithm as `/forge:init`). Exits after writing.

If present, proceeds to drift detection.

### Step 3 — Detect drift

Computes a SHA-256 hash of `MASTER_INDEX.md` (stripping blank lines and HTML comments) and compares against the stored baseline hash.

- **Match** → no drift, exits with confirmation.
- **Mismatch** → proceeds to categorize drift.

### Step 4 — Categorize drift

Reads `MASTER_INDEX.md` and sprint task records to identify what changed. Categories:

| Category | Detection trigger | Regeneration targets |
|---|---|---|
| **Technical** | Stack, routing, database, deployment, architecture changes | `personas:engineer`, `skills:engineer-skills`, `skills:supervisor-skills` |
| **Business** | Entity model, domain, features changes | `personas` (full rebuild) |
| **Retrospective** | Iron-law learnings from completed sprints | `personas:<role>` (user-specified) |
| **Acceptance criteria** | New acceptance patterns from sprint outcomes | `personas:product-manager`, `skills:qa-engineer` |

### Step 5 — Propose patches

Presents a drift report with proposed regeneration targets. User chooses:
- **Y** — Apply all patches
- **r** — Review each patch individually
- **n** — Skip, no changes

### Step 6 — Architect approval gate

No changes applied without explicit approval.

### Step 7 — Execute approved patches

Invokes `/forge:regenerate <category> <sub-target>` for each approved patch. Continues past failures.

### Step 8 — Update calibration state

Recomputes baseline hash, updates `calibrationBaseline` and appends to `calibrationHistory` in `.forge/config.json`.

### Step 9 — Summary

Reports applied/skipped/failed patches and updated baseline date.

---

## Output example

```
## △ Drift detected — 2 categories since last calibration (2026-04-20)

### Category 1: Technical
  Evidence: Added PostgreSQL to stack, new routing patterns in /api/v2/
  Proposed regeneration:
    · personas:engineer
    · skills:engineer-skills
    · skills:supervisor-skills

### Category 2: Acceptance criteria
  Evidence: New error-handling patterns in S04 and S05
  Proposed regeneration:
    · personas:product-manager
    · skills:qa-engineer

Apply patches? [Y] Apply all  [r] Review individually  [n] Skip
```

After approval:

```
## 〇 Calibration Complete

  Patches applied: 5 of 5
  Regenerated: personas:engineer, skills:engineer-skills, skills:supervisor-skills, personas:product-manager, skills:qa-engineer
  Baseline updated: 2026-04-29

── Run /forge:health to verify knowledge base currency.
```

---

## Related commands

| Command | Purpose |
|---|---|
| [`/forge:init`](init.md) | Bootstrap a new Forge instance |
| [`/forge:health`](health.md) | Check knowledge base health |
| [`/forge:regenerate`](regenerate.md) | Regenerate specific targets |