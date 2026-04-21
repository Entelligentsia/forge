# Bug Fix Plan — FORGE-BUG-012: Multi-Plugin Detection

## Objective

Enable `/forge:update` to detect and report all installed Forge distributions, not just the one exposed via `CLAUDE_PLUGIN_ROOT`.

---

## Root Cause

**File:** `forge/hooks/check-update.js`  
**Lines:** 23-38

```javascript
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '.';
```

Hook relies on single env var — Claude Code sets this to **one** plugin instance. Cannot detect multiple installations.

---

## Implementation Plan (Revised)

### 1. Add `scanPluginInstallations()` function

**Location:** `forge/hooks/check-update.js`, after line 38 (after `detectDistribution`)

```javascript
function scanPluginInstallations() {
  const installations = [];
  
  // Build candidate paths — user scope and project scope
  const homeDir = os.homedir();
  const cwd = process.cwd();
  
  const candidates = [
    // User-scope (global)
    path.join(homeDir, '.claude', 'plugins', 'cache', 'forge', 'forge'),
    path.join(homeDir, '.claude', 'plugins', 'marketplaces', 'forge', 'forge'),
    // Project-scope (local)
    path.join(cwd, '.claude', 'plugins', 'cache', 'forge', 'forge'),
    path.join(cwd, '.claude', 'plugins', 'marketplaces', 'forge', 'forge'),
  ];
  
  for (const candidate of candidates) {
    try {
      const pluginJsonPath = path.join(candidate, '.claude-plugin', 'plugin.json');
      if (!fs.existsSync(pluginJsonPath)) continue;
      
      const manifest = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
      const scope = candidate.startsWith(homeDir) ? 'user' : 'project';
      const enabled = isPluginEnabled(candidate, scope);
      
      installations.push({
        path: candidate,
        version: manifest.version || 'unknown',
        distribution: detectDistribution(candidate),
        scope: scope,
        enabled: enabled,
      });
    } catch (e) {
      // Non-fatal — skip broken installations
    }
  }
  
  return installations;
}
```

### 2. Add `isPluginEnabled()` helper

Reads settings files to determine if forge is enabled:

```javascript
function isPluginEnabled(pluginPath, scope) {
  // Check user settings: ~/.claude/settings.json
  // Check project settings: ./.claude/settings.local.json
  // Return true if no explicit disable found
}
```

**Settings locations:**
- User: `~/.claude/settings.json`
- Project: `.claude/settings.local.json`

**Disable pattern:** Plugins can be disabled via settings — if forge is explicitly disabled, mark `enabled: false`.

### 3. Build inventory + synthesize advice

After scanning, build message:

```javascript
const installations = scanPluginInstallations();

if (installations.length === 0) {
  // Edge case — no forge found (shouldn't happen if hook is running)
  return;
}

if (installations.length === 1) {
  // Single install — current behavior, no change
  const inst = installations[0];
  if (!inst.enabled) {
    // Plugin disabled — warn user
    emit(`Forge ${inst.version} installed but disabled in settings.`);
  }
  // ... rest of existing logic
}

if (installations.length >= 2) {
  // Multiple installs — build inventory message
  const activeInst = installations.find(i => i.path === pluginRoot) || installations[0];
  const otherInsts = installations.filter(i => i.path !== activeInst.path);
  
  let msg = `Forge ${activeInst.version} active (${activeInst.distribution}).`;
  if (otherInsts.length > 0) {
    msg += ` Also installed: ${otherInsts.map(i => `${i.version} (${i.distribution}, ${i.scope})`).join(', ')}.`;
  }
  msg += ' Run /forge:update to review and update.';
  
  emit(msg);
}
```

### 4. Preserve hook discipline

- `'use strict';` maintained
- `process.on('uncaughtException', () => process.exit(0))` maintained
- All scanning logic wrapped in try/catch — non-fatal

### 5. Test strategy

**Test file:** `forge/tools/__tests__/check-update.test.cjs`

**Test cases:**
1. Single installation (backward compatibility)
2. Two installations, both enabled
3. Two installations, one disabled
4. User-scope only
5. Project-scope only
6. Mixed user + project scope
7. No installations (edge case)
8. Broken installation (missing plugin.json)

**Syntax validation:**
```sh
node --check forge/hooks/check-update.js
```

---

## Version Bump + Migration

This is a bug fix to `forge/hooks/check-update.js` — **material change**.

**Required:**
1. Bump `forge/.claude-plugin/plugin.json` version
2. Add entry to `forge/migrations.json`
3. Update `CHANGELOG.md`

---

## Security Scan

**Required before push:**
```sh
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

Save report to `docs/security/scan-v{VERSION}.md`.

---

## Acceptance Criteria

- [ ] `check-update.js` scans `~/.claude/plugins/` and `./.claude/plugins/`
- [ ] Detects both `forge@forge` and `forge@skillforge` if both installed
- [ ] Distinguishes user-scope vs project-scope
- [ ] Reports enabled/disabled status
- [ ] Synthesizes clear advice based on inventory
- [ ] All existing tests pass
- [ ] New tests added + pass
- [ ] `node --check` passes
- [ ] Version bump complete
- [ ] Migration entry added
- [ ] Security scan complete

---

## Files to Modify

| File | Change |
|------|--------|
| `forge/hooks/check-update.js` | Add `scanPluginInstallations()`, `isPluginEnabled()`, inventory logic |
| `forge/tools/__tests__/check-update.test.cjs` | New test file |
| `forge/.claude-plugin/plugin.json` | Version bump |
| `forge/migrations.json` | Migration entry |
| `CHANGELOG.md` | Changelog entry |
| `docs/security/scan-v{VERSION}.md` | Security scan report |

---

## Out of Scope

- Changes to `update.md` command flow (inventory display is hook responsibility)
- Plugin enable/disable UI
