# Architect Approval — FORGE-S08-T05

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Deferred to T06. This is a material user-facing command behavior change (reduces prompt count from N to 1 per update run). The bump from 0.9.1 will happen in T06 along with the migration entry.
- **Migration entry:** Deferred to T06. No generated artifacts are affected -- the change is to command behavior only, so `regenerate: []` is expected.
- **Security scan:** Deferred to T06. Any change to `forge/` requires a scan.
- **User-facing impact:** Users running `/forge:update` with custom pipelines will see a consolidated numbered list instead of 8-12 sequential prompts. The `[r]` option preserves the old per-item behavior for users who prefer it.

## Operational Notes

- **Backwards compatible:** Yes. The `[r]` individual review mode preserves the exact original behavior. No generated artifacts are modified by this change.
- **Update path:** This change modifies `/forge:update` itself. The command is self-modifying in the sense that a user who updates Forge will get the new Step 5 behavior on their next `/forge:update` run. No special handling needed -- the update flow is not affected during the current session (the command file is read fresh each invocation).
- **Cross-cutting concerns:** None. Step 5 is self-contained within `update.md`. No hooks, tools, or other commands are affected.
- **No new installed artifacts, directories, or disk-write sites.**

## Follow-Up Items

- The `[r]` mode references sub-check section names (5b-pre, 5b-portability, etc.) that no longer exist as distinct sections. This is a documentation concern only -- the LLM interprets the command file holistically and will reconstruct the per-item prompts from context. A future refactor could extract the per-item prompt text into an appendix for clarity.