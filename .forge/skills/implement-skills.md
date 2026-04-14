# Engineer Implementation Skills — Forge

## Incremental Verification

After EVERY JS/CJS file edit:
```bash
node --check <file>
```
Fix immediately before moving to the next file. Do not batch verification.

## Hook Implementation Pattern

```javascript
'use strict';
process.on('uncaughtException', (err) => { process.exit(0); });

// ... hook logic
```
Hooks MUST exit 0 always. Non-zero exits can crash Claude Code sessions.

## Tool Implementation Pattern

```javascript
'use strict';
try {
  // ... all logic here
  // Check --dry-run before any write
  if (!process.argv.includes('--dry-run')) {
    // write files
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
```

## Path Resolution Pattern

Never hardcode paths. Read from config:
```javascript
const config = JSON.parse(fs.readFileSync('.forge/config.json', 'utf8'));
const engineeringDir = config.paths.engineering;  // 'engineering'
const storeDir = config.paths.store;              // '.forge/store'
```

## Version Bump + Migration

When the plan declares a material change:
1. Edit `forge/.claude-plugin/plugin.json` → increment `version`
2. Add to `forge/migrations.json`:
   ```json
   "{prev_version}": {
     "version": "{new_version}",
     "date": "{YYYY-MM-DD}",
     "notes": "{one-line summary}",
     "regenerate": ["workflows"],
     "breaking": false,
     "manual": []
   }
   ```

## Security Scan

After implementing any change to `forge/`:
```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```
Save full report to `docs/security/scan-v{VERSION}.md`. Update README security table.
