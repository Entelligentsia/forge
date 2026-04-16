# Retrospective — FORGE-S10: Tomoshibi KB Visibility Agent + Configurable KB Path

**Sprint:** FORGE-S10
**Date:** 2026-04-16

---

## Sprint Summary

| Metric | Value |
|---|---|
| Tasks completed | 1/1 |
| Tasks carried over | 0 |
| Tasks abandoned | 0 |
| Total tracked time | ~22 min (event durations) |
| Version bumps shipped | 1 (0.9.18 → 0.10.0) |
| Bugs filed | 0 |
| Security scans run | 1 (126 files, 0 critical — SAFE) |

## Metrics

| Task | Plan Iterations | Code Review Iterations | Time |
|---|---|---|---|
| FORGE-S10-T01 | 2 | 2 | ~22 min tracked |

## What Went Well

- **Plan revision caught a migration chain break before implementation.** The stale from-key (`"0.9.17"` vs actual `"0.9.18"`) was caught at plan review iteration 1 — not after code was written. Fixing it in the plan, not mid-implementation, saved rework.
- **Two-blocker plan review resolved cleanly.** Both issues (from-key and banner renumbering scope) were addressed together in a single plan revision. No ping-pong after approval.
- **Security scan clean — first named agent in plugin.** `forge/agents/tomoshibi.md` introduced a new plugin directory (`forge/agents/`) and was cleanly verified: 0 critical, 2 carry-forward warnings, 3 info — SAFE. Security surface properly bounded.
- **Cross-cutting configurability change with zero breakage.** Six init-flow files replaced hardcoded `engineering/` with `{KB_PATH}` pattern. All 241 CJS tests continued to pass — the configuration path had no CJS surface to regress.
- **Idempotent managed-section design.** The marker-bounded (`<!-- forge-kb-links -->` / `<!-- /forge-workflow-links -->`) approach means Tomoshibi can be run multiple times safely, on any coding-agent instruction file format. Staleness detection prevents unnecessary rewrites.

## What to Improve

- **Security scan must be part of implementation, not post-review.** First code review was blocked because `docs/security/scan-v0.10.0.md` did not exist. The existing checklist says "before pushing" — implementers interpret this as after code review approval. Needs to say "before submitting for code review."
- **Migration from-key requires a fresh plugin.json read at write time.** This sprint began when v0.9.17 was current; by the time the plan was reviewed, v0.9.18 had shipped. Writing a migration from-key from memory (or from a stale context) will always produce drift at version boundaries. The plan workflow should enforce a re-read.
- **"7 Emit: lines, not 6" ambiguity.** `update.md` Step 2 splits into 2A and 2B, producing 7 `Emit:` lines for 6 named steps. The plan said "six existing banners" — technically correct but the advisory note ("7 Emit: lines") needed to be explicit in the acceptance criteria, not buried in implementation notes. Future update.md changes should document this split explicitly.

## Knowledge Base Updates

| Document | Change |
|---|---|
| `engineering/architecture/routing.md` | Added `## Agents` section documenting `forge/agents/` directory, auto-discovery convention, and Tomoshibi entry |

No `[?]` items remain in `engineering/architecture/`. No stack-checklist item additions or removals made this sprint (see Stack Checklist Changes below).

## Stack Checklist Changes

- **No items added this sprint.** The two improvement patterns (security scan timing, migration from-key freshness) are better addressed via workflow file edits (see Workflow Improvements) than as checklist items — the checklist already covers both, but the trigger-point framing needs updating.
- **No items removed.**

## Workflow Improvements

Two concrete edits proposed for `.forge/workflows/`:

**1. `review_plan.md` — add explicit migration from-key check**

Add to the plan-review checklist:

> "Migration from-key: verify the `from` field matches the CURRENT version in `forge/.claude-plugin/plugin.json` — re-read this file at plan-write time, not from memory or prior context."

Rationale: The from-key went stale between planning and review because version 0.9.18 had shipped in the interim. Making this an explicit named check (rather than an implicit expectation under "migration entry present") will catch it before plan approval.

**2. `implement_plan.md` (or `review_code.md` preamble) — move security scan earlier**

Add to implementation gate or as a pre-submission checklist note:

> "For `forge/` changes that include a version bump, run the security scan and commit the report to `docs/security/scan-v{VERSION}.md` **as part of implementation**, before requesting code review. The code review gate will block without it."

Rationale: Current framing ("before pushing") implies it can happen after code review approval. Two sprints have now had the security scan report absent at first code review submission.

## Bug Pattern Analysis

No bugs were filed or resolved this sprint. The two pre-existing open items from the ARCHITECT_APPROVAL follow-up list remain:

- **34 validate-store pre-existing errors** — FORGE-S09/S10 event files using the old schema (`eventType`/`timestamp` fields instead of `role`/`phase`/`startTimestamp`). Not introduced this sprint. Candidate for a dedicated store-repair task.
- **FORGE-S10-T01 undeclared field `createdAt`** — task record has a field not in the task schema. Minor schema gap; non-blocking.

## Cost Analysis

_No token data available for this sprint._

## Recommendations for Next Sprint

- **Scope:** Address the two workflow improvement edits proposed above (review_plan.md, implement_plan.md) — small targeted edits, no new features.
- **Scope (optional):** Evaluate removing `forge/meta/tool-specs/` — the user flagged this as a separate consideration worth assessing (impact on generated tool documentation for well-documented built-in tools).
- **Scope (optional):** Store-repair sprint for the 34 validate-store pre-existing errors (event schema migration from old `eventType`/`timestamp` format to current `role`/`phase`/`startTimestamp` format).
- **Focus:** Process quality — the two review-cycle iterations this sprint were both preventable with better workflow guardrails.
- **Mode:** sequential
