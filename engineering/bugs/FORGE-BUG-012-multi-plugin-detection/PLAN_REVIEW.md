# PLAN REVIEW — FORGE-BUG-012: Multi-Plugin Detection in /forge:update

🌿 *Forge Supervisor*

**Task:** FORGE-BUG-012

---

**Verdict:** Revision Required

---

## Review Summary

The plan correctly identifies the root cause (single-value `CLAUDE_PLUGIN_ROOT` env var) and proposes a reasonable scanning approach. However, the plan has critical gaps: it lacks explicit testing strategy, doesn't address settings.json parsing for enabled/disabled status, doesn't consider Windows path variations, and omits version bump/migration requirements for this bug fix.

## Feasibility

The approach is feasible but underspecified:
- Scanning the four proposed directories is correct
- Reading `plugin.json` for version/distribution is sound
- Synthesizing advice based on inventory is the right outcome

**Missing specifics:**
- How will `settings.json` be parsed to determine enabled/disabled status? The hook currently has no logic for this
- Windows path handling is not mentioned (`%APPDATA%` vs `~/.claude/`)
- No mention of how to handle symlinks or broken paths

## Plugin Impact Assessment

- **Version bump declared correctly?** Not mentioned in plan — this is a bug fix to a hook (`forge/hooks/check-update.js`), which is **material** per versioning rules
- **Migration entry targets correct?** Not mentioned — needs migration entry if version is bumped
- **Security scan requirement acknowledged?** Not mentioned — hook changes require security-watchdog perspective

## Security

**Gaps in the plan:**

1. **Credential access pattern:** The hook will now scan multiple directories and read `settings.json`. This file may contain user credentials, API keys, or other sensitive data. The plan should address:
   - Minimising data read (only extract plugin enablement state)
   - Not logging or echoing sensitive configuration

2. **Hook exit discipline:** The current hook correctly uses `'use strict';` and `process.on('uncaughtException', () => process.exit(0))`. The new `scanPluginInstallations()` function must not break this — any exceptions in scanning logic must be caught internally.

3. **No security scan planned:** Per workflow requirements, changes to `forge/hooks/` require security-watchdog perspective and a pre-push security scan.

## Architecture Alignment

**Concerns:**

1. **Built-ins only:** The plan doesn't explicitly confirm no npm dependencies will be introduced. The scanning logic must use only `fs`, `path`, `os` built-ins.

2. **Hook exit codes:** The plan doesn't mention preserving the hook's non-fatal error handling. Scanning failures (e.g., permission denied on a directory) must not crash the session.

3. **Path resolution:** The plan mentions project-scope paths (`./.claude/plugins/`) but doesn't clarify whether this means CWD-relative or workspace-root-relative.

**Missing from plan:**
- No mention of maintaining `'use strict';` discipline
- No mention of preserving `process.on('uncaughtException', ...)` pattern in new function

## Testing Strategy

**Critical gap:** The plan mentions adding tests but provides no specifics:

1. **Test file location:** Plan says `forge/tools/__tests__/check-update.test.cjs` — this doesn't exist yet and needs to be created

2. **Test cases needed but not enumerated:**
   - Single installation (backward compatibility)
   - Two installations, both enabled
   - Two installations, one disabled
   - User-scope only
   - Project-scope only
   - Mixed user + project scope
   - No installations (edge case)
   - Broken/stale installation (missing plugin.json)

3. **Syntax validation:** Plan doesn't mention `node --check forge/hooks/check-update.js`

4. **Hook testing is non-trivial:** Hooks run on session start and emit JSON to stdout. The test strategy needs to address how to test `scanPluginInstallations()` in isolation (likely extract as pure function with injectable path resolver).

---

## If Revision Required

### Required Changes

1. **Add explicit testing strategy to the plan:**
   - Enumerate test cases (see above)
   - Specify test file path: `forge/tools/__tests__/check-update.test.cjs`
   - Include `node --check` for syntax validation

2. **Address settings.json parsing:**
   - Specify which settings.json files to read (user: `~/.claude/settings.json`, project: `.claude/settings.local.json`)
   - Document the schema for plugin enablement (how is forge identified as enabled/disabled?)

3. **Add version bump commitment:**
   - This is a bug fix to a hook → material change
   - Plan must include bumping `forge/.claude-plugin/plugin.json` version
   - Plan must include adding migration entry to `forge/migrations.json`

4. **Add security scan commitment:**
   - Plan must include running `/security-watchdog:scan-plugin forge:forge --source-path forge/` before push
   - Plan must include saving report to `docs/security/scan-v{VERSION}.md`

5. **Clarify Windows path handling:**
   - The four paths listed are Unix-style
   - Plan should mention using `os.homedir()` and handling Windows `%APPDATA%` paths

6. **Preserve hook discipline:**
   - Explicitly state that new code will maintain `'use strict';` and non-fatal error handling
   - New function should have internal try/catch to prevent session crashes

7. **Refactor for testability:**
   - `scanPluginInstallations()` should accept optional parameters for paths (dependency injection) to enable testing without mocking filesystem
   - Alternatively, export the function for direct testing

### Priority

**Blocking items (must be addressed before implementation):**
1. Testing strategy (item 1)
2. Version bump + migration commitment (item 3)
3. Hook discipline preservation (item 6)

**Should be addressed during implementation:**
4. settings.json parsing specifics (item 2)
5. Windows path handling (item 5)
6. Security scan (item 4)

---

## Advisory Notes (for after revisions)

- Consider extracting distribution detection logic into a reusable helper — the current `detectDistribution()` function is tied to `CLAUDE_PLUGIN_ROOT` but could be generalised
- The inventory structure should be documented with a JSDoc type definition for clarity
- Consider caching the scan result in the existing project cache to avoid rescanning every session
