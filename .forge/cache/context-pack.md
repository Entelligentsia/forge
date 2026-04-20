# Architecture Context Pack

Built: 2026-04-20T08:00:56.389Z
Source hash: sha256:f58ae7195dba0c9a7b1a4004fac99baa20118c8080ec03ad7ea77135b07c98f9

## Document summaries

### Architecture Index

| Document | Description | |---|---| | [stack.md](stack.md) | Languages, runtime, Node.js built-ins only, no npm dependencies | | [processes.md](processes.md) | Development workflow, release process, version bump criteria | | [database.md](database.md) | JSON flat-file store — Sprint, Task, Bug, Event entities and schemas | | [routing.md](routing.md) | Plugin interface — commands, hooks, utilities, auth model | | [deployment.md](deployment.md) | GitHub distribution, user install/update path, environment variables |

### Data Model (JSON Flat-File Store)

Forge uses a JSON flat-file store. There is no database server. All records are individual JSON files under `.forge/store/` in the target project.

### Deployment

### Processes

### Plugin Interface (Commands, Hooks, Skills)

Forge has no HTTP routing. Its "API surface" is the Claude Code plugin extension system.

### Stack

## File index

- engineering/architecture/INDEX.md — Architecture Index (10 lines)
- engineering/architecture/database.md — Data Model (JSON Flat-File Store) (123 lines)
- engineering/architecture/deployment.md — Deployment (77 lines)
- engineering/architecture/processes.md — Processes (53 lines)
- engineering/architecture/routing.md — Plugin Interface (Commands, Hooks, Skills) (59 lines)
- engineering/architecture/stack.md — Stack (28 lines)
