# Generic Skills — Forge

## Coordination & Orchestration

- **Task Scheduling**: Managing the sequence of task execution and dependency resolution in sprint pipelines. Respect the `planned` → `in-progress` → `implemented` → `committed` lifecycle; never skip states.
- **Agent Handoff**: Ensuring smooth context transitions between phases. All durable state is on disk in `.forge/store/` and `engineering/` — subagents receive task ID, store root, and bug root, and read their own context.
- **Status Reporting**: Aggregating phase outcomes into phase-exit signals:
  - `✓ {ID}  {phase}  — completed` (non-review)
  - `✓ {ID}  {phase}  — Approved` (review)
  - `↻ {ID}  {phase}  — Revision Required (iteration N)` (review)
  - `⚠ {ID}  {phase}  — escalated` (max iterations or unknown verdict)

## Information Synthesis

- **Data Collation**: Gathering disparate JSON store records into structured markdown reports using `node "$FORGE_ROOT/tools/collate.cjs"`.
- **Summary Generation**: Distilling phase outputs into checkpoint lines for `/compact` context preservation: `[checkpoint] task={ID} phase={phase} iterations={counts}`.
- **Artifact Mapping**: Ensuring tasks, bugs, events, and sidecars are correctly linked using `store-cli` — never writing `.forge/store/` files directly.

## Basic Tooling

- **File Management**: Use `Read`, `Write`, `Glob`, and `Grep` for all file operations. Never use `cat`, `echo`, or `find` when a dedicated tool is available.
- **Git Basics**: Stage specific files by path — never `git add -A`. Use `feat:`, `fix:`, `chore:`, `security:`, `release:` commit prefixes.
- **Progress IPC**: Append progress entries to `.forge/store/events/{sprintId}/progress.log` via:
  ```
  node "$FORGE_ROOT/tools/store-cli.cjs" progress {sprintId} {agentName} {bannerKey} {status} "message"
  ```
