# CODE REVIEW — FORGE-S08-T05: Update Step 5 collect-all-then-confirm audit

🌿 *Forge Supervisor*

**Task:** FORGE-S08-T05

---

**Verdict:** Approved

---

## Review Summary

The implementation faithfully follows the approved plan. Step 5 has been restructured from sequential per-item prompts into a collect-then-confirm model with `AUDIT_ITEMS` accumulation and a four-choice prompt (`[Y]`, `[a]`, `[r]`, `[n]`). All four review items from the plan revision are correctly addressed: pipeline gate behavior is explicit, legacy-model-field items are auto-acknowledged, the `[a]` option resolves the optional-items contradiction, and the config.json-absent gate is documented. No JS files were modified -- only `forge/commands/update.md`.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 Pass | No JS changes at all |
| Hook exit discipline | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | 〇 Pass | No tool changes |
| Reads `.forge/config.json` for paths | 〇 Pass | All `manage-config.cjs` and `generation-manifest.cjs` paths preserved |
| Version bumped if material change | N/A | Deferred to T06 |
| Migration entry present and correct | N/A | Deferred to T06 |
| Security scan report committed | N/A | Deferred to T06 |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | N/A | No JS files modified |
| `validate-store --dry-run` exits 0 | N/A | No schema changes |
| No prompt injection in modified Markdown files | 〇 Pass | No injection patterns found -- all dynamic content is project-local paths/config values |

## Issues Found

No blocking issues found.

---

## Advisory Notes

1. **[r] mode references are forward-compatible.** The `[r]` individual review mode description references sub-check section names (5b-pre, 5b-portability, etc.) that no longer exist as distinct sections in the file. This is intentional per the plan -- the prompt text for each sub-check type is preserved inline in the [r] behavior description, and the section names serve as cross-references for maintainers. No change needed, but a future refactor might consider moving the per-item prompt text into an appendix.

2. **Item type taxonomy is well-defined.** The `AUDIT_ITEMS` classification table with `type`, `required`, and `modified` fields provides a clean schema for the command to follow. This is good for consistency and makes the [Y]/[a]/[r]/[n] behavior rules unambiguous.

3. **5c (paths.customCommands) item creation is conditional on config key absence.** In the collect phase, the `add-paths-key` item is only added when the key is missing. This correctly preserves the existing behavior where this check only fires when the key is absent, not on every update.

4. **The `[r]` mode for add-paths-key references "5c prompt"** which was previously the interactive "Add it? (yes / no / use a different path)" prompt. Since this prompt text is not reproduced verbatim in the [r] section, the implementer of the LLM command should ensure the original prompt style is followed when falling back. This is a minor concern since the [r] mode says "follow 5c prompt" and the LLM will need to reconstruct that behavior from context.