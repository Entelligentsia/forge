# FORGE-S07 Sprint Requirements

> Requirements source: `docs/requirements/store-custodian.md`
> See that file for the full specification. This file is the canonical SPRINT_REQUIREMENTS.md for sprint planning.

## Summary

Introduce the **Store Custodian** — a deterministic CLI tool (`store-cli.cjs`) and
corresponding skill (`/forge:store`) that becomes the sole authorized gateway for
the probabilistic layer (LLM workflows) to read and write the JSON store at
`.forge/store/`. Simultaneously close three known facade bypasses in deterministic
code (collate.cjs, validate-store.cjs) and eliminate schema drift by making
`forge/schemas/*.schema.json` the single source of truth.

## Requirements

- **R1 (P0):** `forge/tools/store-cli.cjs` — CLI with write/read/list/delete/update-status/emit/merge-sidecar/purge-events/validate
- **R2 (P0):** `forge/schemas/` as canonical schema source; validate-store reads from schemas at runtime
- **R3 (P0):** Write-time schema validation on every store write via the custodian
- **R4 (P1):** Status transition enforcement in `update-status` command
- **R5 (P0):** `forge/meta/skills/meta-store-custodian.md` + tool spec
- **R6 (P0):** All 16 meta-workflow files updated to reference custodian instead of direct writes
- **R7 (P1):** Facade gaps closed in store.cjs, collate.cjs, validate-store.cjs
- **R8 (P0):** No new npm dependencies — Node.js built-ins only

## Full Specification

See `docs/requirements/store-custodian.md` for complete requirements, acceptance
criteria, and affected file list.
