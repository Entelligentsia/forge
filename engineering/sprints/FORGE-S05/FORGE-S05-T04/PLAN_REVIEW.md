# PLAN REVIEW — FORGE-S05-T04: Workflow purification

## Verdict: Approved

The plan is thorough and correctly identifies the necessary changes to move the meta-workflows from "guide-like" prose to "orchestrator-ready" state machines.

### Review Findings:
1. **Purification Strategy**: The shift to "Algorithm $\rightarrow$ Generation Instructions" and the explicit mandate of the `Agent` tool pattern correctly addresses the goal of removing prose-based guidance.
2. **Impact Assessment**: Correct. This is a material change to the core behavior of generated workflows. A version bump to `0.6.14` and `regenerate: ["workflows"]` in the migration is required to ensure users' local workflows are updated.
3. **Acceptance Criteria**: Sufficient. The criteria explicitly cover verdict reporting, the `Agent` tool mandate, token sidecar reporting, and the removal of prose, which are the key pillars of the "Iron Laws" for orchestration.
4. **Structural Integrity**: The plan lists 14 core meta-workflows for refactoring, covering the essential pipeline phases (planning, implementation, review, validation, commit, etc.), preserving the system's functional coverage.

The plan is ready for implementation.
