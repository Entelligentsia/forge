# BUG FIX PLAN — FORGE-BUG-011

**Bug:** UX polish — tomoshibi uppercase prefix, progress IPC personality, ensure-ready banner collapse
**Status:** in-progress
**Assignee:** bug-fixer agent

---

## Files to Modify

| File | Sub-issue | Change |
|---|---|---|
| `forge/agents/tomoshibi.md` | gh#51 | Lowercase the prefix before forming slash-command suggestions |
| `forge/tools/store-cli.cjs` | gh#52 | Enrich `cmdProgress()` stdout with persona emoji + bracketed status |
| `forge/tools/__tests__/store-cli.test.cjs` | gh#52 | New failing test first; then implement |
| `forge/tools/ensure-ready.cjs` | gh#54 | Replace multi-line block with single summary line in `_renderAnnouncement()` |
| `forge/tools/__tests__/ensure-ready.test.cjs` | gh#54 | New failing tests first; update 6 broken tests after implementation |

---

## Sub-issue 1: gh#51 — Tomoshibi uppercase prefix

### Files

- `forge/agents/tomoshibi.md`

### Change Description

In the Setup block, after reading `project.prefix`, normalise it to lowercase for display in slash-command contexts. The stored value may be uppercase (e.g. `CAR`) — the filesystem commands folder is always lowercase. Add a normalisation step:

```sh
PREFIX_LOWER=$(node -e "const p=require('.forge/config.json').project.prefix; console.log(p.toLowerCase())")
```

Then use `${PREFIX_LOWER}` (not the raw stored value) in any mention of:
- Slash-command suggestions (`/${PREFIX_LOWER}:sprint-plan`, etc.)
- Command folder paths (`.claude/commands/${PREFIX_LOWER}/`)

#### Config change impact table update

The impact table currently uses the literal tokens `{old}` and `{new}`. Replace them with the lowercase-rendered forms so the table communicates the actual filesystem paths:

```
command folder renames from `.claude/commands/{old_lower}/` to `.claude/commands/{new_lower}/`
```

where `{old_lower}` is the current prefix lowercased and `{new_lower}` is the proposed new value lowercased.

#### Config change protocol — step 3 (impact warning)

At step 3 of the Config change protocol (the impact warning before asking the user to confirm), Tomoshibi must render the **concrete** lowercased before/after command-folder paths derived from:
- `PREFIX_LOWER` — the current prefix value lowercased (already computed in Setup)
- `NEW_PREFIX_LOWER=$(echo "$proposed_new_value" | tr '[:upper:]' '[:lower:]')` — the proposed new value lowercased at the moment of the change

The warning must show `.claude/commands/${PREFIX_LOWER}/ → .claude/commands/${NEW_PREFIX_LOWER}/` — not the raw stored value.

Add a clarifying note: the prefix is stored as provided but the command namespace is always lowercase.

### No test required (agent definition, not CJS)

Agent definitions are `.md` files — no automated test framework covers them.

### Verification

Visual inspection: with `project.prefix = "CAR"`, Tomoshibi should suggest `/${car}:sprint-plan` (i.e. `/car:sprint-plan`).

---

## Sub-issue 2: gh#52 — progress IPC personality

### Files (in order)

1. `forge/tools/__tests__/store-cli.test.cjs` — **write failing test first**
2. `forge/tools/store-cli.cjs` — implement after test fails

### Step 1 — Failing Test First

Add to `forge/tools/__tests__/store-cli.test.cjs` inside the appropriate `describe` block:

```js
test('progress writes log line and emits human-readable summary to stdout', () => {
  const tmpDir = makeSprintStore();
  try {
    const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'oracle', 'progress', 'Mapping AC coverage'], {
      cwd: tmpDir, encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);

    // Verify log file was written with raw pipe-delimited format
    const logPath = path.join(tmpDir, '.forge', 'store', 'events', 'S1', 'progress.log');
    assert.ok(fs.existsSync(logPath), 'progress.log should exist');
    const logContent = fs.readFileSync(logPath, 'utf8');
    assert.match(logContent, /\|engineer\|oracle\|progress\|Mapping AC coverage/);

    // Verify stdout emits human-readable summary with persona emoji
    assert.ok(r.stdout.trim().length > 0, 'stdout should emit a summary line');
    // oracle banner key → 🌕 emoji — assert strictly on the resolved emoji
    assert.ok(r.stdout.includes('🌕'), 'stdout should include oracle emoji 🌕');
    assert.ok(r.stdout.includes('[progress]'), 'stdout should include bracketed status');
    assert.ok(r.stdout.includes('Mapping AC coverage'), 'stdout should include detail');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('progress stdout falls back gracefully for unknown bannerKey', () => {
  const tmpDir = makeSprintStore();
  try {
    const r = spawnSync('node', [STORE_CLI, 'progress', 'S1', 'engineer', 'unknown-key', 'start', 'Starting work'], {
      cwd: tmpDir, encoding: 'utf8',
    });
    // unknown-key is valid per schema pattern, but not in BANNERS registry
    // Should succeed and emit something reasonable to stdout
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('[start]'), 'stdout should include bracketed status even for unknown key');
    // The bannerKey itself must be used as the emoji substitute on unknown-key fallback
    assert.ok(r.stdout.includes('unknown-key'), 'stdout should use bannerKey as emoji substitute for unknown key');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
```

**Run the tests — they must FAIL before proceeding.**

### Step 2 — Implementation

In `forge/tools/store-cli.cjs`, `cmdProgress()`, after `fs.appendFileSync(logPath, line, 'utf8')`:

```js
// Emit human-readable summary to stdout
let banners;
try { banners = require('./banners.cjs'); } catch { banners = null; }
let emoji = bannerKey;
if (banners && typeof banners.mark === 'function') {
  try { emoji = banners.mark(bannerKey); } catch { emoji = bannerKey; }
}
const summary = `${emoji}  ${agentName}  [${status}]${detail ? '  ' + detail : ''}`;
process.stdout.write(summary + '\n');
```

**Note on `banners.mark()`:** The function is exported from `forge/tools/banners.cjs` (line 271). It calls `_get(name).emoji` internally — `_get` lowercases the name before looking up the BANNERS registry, and throws `Error("Unknown banner …")` if the key is not found. The try/catch fallback above handles that throw and returns the raw `bannerKey` as the emoji substitute. `mark()` returns the emoji string only (e.g. `'🌕'` for `oracle`) — not the full banner render.

### Step 3 — Verification

```sh
node --check forge/tools/store-cli.cjs
node --test forge/tools/__tests__/store-cli.test.cjs
```

---

## Sub-issue 3: gh#54 — ensure-ready banner collapse

### Files (in order)

1. `forge/tools/__tests__/ensure-ready.test.cjs` — **write new failing tests first**
2. `forge/tools/ensure-ready.cjs` — implement after tests fail
3. `forge/tools/__tests__/ensure-ready.test.cjs` — update 6 broken tests to new contract

### Step 1 — New Failing Tests

Add to `forge/tools/__tests__/ensure-ready.test.cjs`, inside the `_renderAnnouncement` describe block **before the existing tests**:

```js
test('returns a SINGLE line (no newlines) — fits inline display', () => {
  const out = _renderAnnouncement({
    currentBefore: 2, currentAfter: 12, total: 41,
    percentBefore: 5, percentAfter: 29, added: 10,
  });
  assert.ok(!out.includes('\n'), `expected single line but got newlines: ${JSON.stringify(out)}`);
  // Prefix must be present
  assert.ok(out.includes('Forge capability'), 'should include Forge capability prefix');
});

test('single-line contains before and after ratio and percent', () => {
  const out = _renderAnnouncement({
    currentBefore: 5, currentAfter: 20, total: 41,
    percentBefore: 12, percentAfter: 49, added: 15,
  }).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  assert.ok(out.includes('5/41'), 'should contain before ratio');
  assert.ok(out.includes('20/41'), 'should contain after ratio');
  assert.ok(out.includes('12%'), 'should contain before percent');
  assert.ok(out.includes('49%'), 'should contain after percent');
  assert.ok(out.includes('+15'), 'should contain added count');
});

test('single-line already-materialised shows refresh message', () => {
  const out = _renderAnnouncement({
    currentBefore: 12, currentAfter: 12, total: 41,
    percentBefore: 29, percentAfter: 29, added: 0,
  }).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  assert.ok(!out.includes('\n'), 'should be single line');
  assert.ok(out.includes('refresh') || out.includes('materialised'), 'should include refresh message');
});

test('single-line --all 100% materialised shows promote hint', () => {
  const out = _renderAnnouncement({
    currentBefore: 41, currentAfter: 41, total: 41,
    percentBefore: 100, percentAfter: 100, added: 0,
  }, { allFlag: true }).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  assert.ok(!out.includes('\n'), 'should be single line');
  assert.ok(out.includes('/forge:config'), 'should hint at promote command');
});
```

**Run the tests — they must FAIL before proceeding.**

### Step 2 — Implementation

Replace `_renderAnnouncement()` in `forge/tools/ensure-ready.cjs`:

```js
function _renderAnnouncement(p, opts) {
  const o = opts || {};

  // Emoji prefix — use banners if available, else plain text
  let banners;
  try { banners = require('./banners.cjs'); } catch { banners = null; }
  const prefix = '🔥 Forge capability: ';

  const before = `${p.currentBefore}/${p.total} (${p.percentBefore}%)`;
  const after  = `${p.currentAfter}/${p.total} (${p.percentAfter}%)`;

  if (p.added === 0) {
    if (o.allFlag) {
      return `${prefix}${before} — fully materialised (/forge:config mode full)`;
    }
    return `${prefix}${before} — refreshing in place`;
  }

  const addedNote = `+${p.added} artifact${p.added === 1 ? '' : 's'}`;
  return `${prefix}${before} → ${after}, ${addedNote}`;
}
```

### Step 3 — Update Broken Tests

After implementation, 6 existing tests will fail. Update them to match the new single-line contract:

| Old assertion | New assertion |
|---|---|
| `lines.length >= 5` | `!out.includes('\n')` (single line) |
| `out.includes('━━━')` | Remove (no rules in single line) |
| `out.includes('Capability Upgrade')` | Remove or replace with ratio/percent check |
| `out.includes('Currently')` / `out.includes('After')` | Remove labels; check for `→` separator or ratio format |
| Zen-blue ANSI on first/last line | Remove (no tinted rules) |
| `out.includes('12%')` etc. | Keep as-is (still present) |
| `uses singular "artifact" for added=1` (line ~312) | Update to new contract: single line, assert `!out.includes('\n')` and `out.includes('+1 artifact')` (singular, no trailing `s`) |

The singular/plural test (existing at line ~312, `added=1`) must be retained and updated — not deleted. Under the new contract it asserts:
1. `!out.includes('\n')` — single line
2. `out.includes('+1 artifact')` — singular form, no trailing `s`

### Step 4 — Verification

```sh
node --check forge/tools/ensure-ready.cjs
node --test forge/tools/__tests__/ensure-ready.test.cjs
node --test forge/tools/__tests__/*.test.cjs
```

---

## Version Bump Decision

**Required:** Yes — all three sub-issues are material changes to `forge/` source.

**Current version:** `0.18.1`
**New version:** `0.19.0`

Bump `forge/.claude-plugin/plugin.json`.

---

## Migration Entry Spec

Add to `forge/migrations.json` using the keyed top-level convention (outer key = `from` version) that the existing file uses — so `/forge:update`'s migration chain parser can walk it correctly:

```json
"0.18.1": {
  "version": "0.19.0",
  "notes": "UX polish: tomoshibi prefix lowercase, progress IPC persona emoji, ensure-ready single-line banner",
  "regenerate": [],
  "breaking": false,
  "manual": []
}
```

Rationale for `"regenerate": []`:
- `forge/agents/tomoshibi.md` is a **plugin-shipped agent**. It lives at `$FORGE_ROOT/agents/tomoshibi.md` and is referenced directly from `forge/commands/ask.md`. There is no generated copy at `.forge/agents/tomoshibi.md` — that directory does not exist. When users run `/forge:update`, the plugin copy is replaced in-place and they receive the fix automatically with zero regeneration required.
- `store-cli.cjs` and `ensure-ready.cjs` are plugin tools — they update automatically on install, no regeneration needed.

---

## Security Scan Requirement

**Yes.** Version bump means new code is distributed to all installed users. Run:

```sh
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

Save full report to `docs/security/scan-v0.19.0.md`. Update `docs/security/index.md` and `README.md` security table.

---

## Acceptance Criteria

### gh#51 — Tomoshibi prefix
- [ ] With `project.prefix = "CAR"`, Tomoshibi suggests `/car:sprint-plan` (not `/CAR:sprint-plan`)
- [ ] With `project.prefix = "car"`, output is unchanged
- [ ] Config change impact table shows lowercase folder paths using `{old_lower}` / `{new_lower}` tokens
- [ ] Config change protocol step 3 renders the concrete lowercased before/after paths (not the raw stored value)

### gh#52 — Progress IPC personality
- [ ] `store-cli.cjs progress S1 engineer oracle progress "Mapping AC coverage"` emits `🌕  engineer  [progress]  Mapping AC coverage` to stdout
- [ ] Log file still contains the raw pipe-delimited line (unchanged)
- [ ] Unknown banner key falls back to bannerKey string as emoji substitute (no crash, still emits `[status]` format with bannerKey as prefix)
- [ ] Existing validation tests (agentName reject, overlong detail) still pass

### gh#54 — ensure-ready single-line banner
- [ ] `_renderAnnouncement(...)` returns a string with no `\n` characters
- [ ] Single line contains `Forge capability` prefix
- [ ] Single line contains before/after ratio and percent
- [ ] Added count (`+N artifact(s)`) present when `added > 0`
- [ ] Singular form (`+1 artifact`) used when `added === 1`
- [ ] `added=0` paths show appropriate messages (refresh / fully materialised)
- [ ] `--announce` mode in ensure-ready.cjs CLI renders correctly
- [ ] All ensure-ready.test.cjs tests pass

---

## Exact Verification Steps

### Before any change
```sh
node --test forge/tools/__tests__/*.test.cjs
# Expected: all 241 tests pass (baseline)
```

### After writing new failing tests (gh#52 and gh#54)
```sh
node --test forge/tools/__tests__/store-cli.test.cjs
# Expected: new progress stdout tests FAIL
node --test forge/tools/__tests__/ensure-ready.test.cjs
# Expected: new single-line tests FAIL
```

### After each implementation change
```sh
node --check forge/tools/store-cli.cjs
node --check forge/tools/ensure-ready.cjs
```

### After all changes
```sh
node --test forge/tools/__tests__/*.test.cjs
# Expected: all tests pass (count may increase from 241)
```

### After version bump and integrity regeneration
```sh
node forge/tools/gen-integrity.cjs --forge-root forge/
node -e "const c=require('crypto'),f=require('fs'); console.log(c.createHash('sha256').update(f.readFileSync('forge/tools/verify-integrity.cjs')).digest('hex'))"
# Update EXPECTED= value in forge/commands/health.md
```
