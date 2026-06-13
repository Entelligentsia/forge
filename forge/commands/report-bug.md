---
name: report-bug
description: "[SUNSET] /forge:report-bug is retired in the Forge shim release — run /forge:init to migrate to the CLI."
---

# /forge:report-bug — retired (Forge has moved to the CLI)

This command is **retired** in the Forge shim release. The Forge marketplace
plugin is being sunset in favour of the CLI-first distribution (`4ge`, npm
`@entelligentsia/forgecli`).

Run **`/forge:init`** to migrate this project to the CLI — the migration is
idempotent and preserves `.forge/config.json`, `.forge/store/**` and your
knowledge-base folder. After migrating, use the `4ge` binary (or the
CLI-installed `/forge:*` commands) instead of this plugin command.
