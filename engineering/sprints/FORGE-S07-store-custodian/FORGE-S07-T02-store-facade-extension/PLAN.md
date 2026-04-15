# PLAN — FORGE-S07-T02: Store facade extension — writeCollationState, purgeEvents, listEventFilenames

🌱 *Forge Engineer*

**Task:** FORGE-S07-T02
**Sprint:** FORGE-S07
**Estimate:** M

---

## Objective

Extend `forge/tools/store.cjs` with four new public methods on the `Store` class (and corresponding `FSImpl` implementations): `writeCollationState(data)`, `readCollationState()`, `purgeEvents(sprintId, opts)`, and `listEventFilenames(sprintId)`. These methods close the facade bypasses currently used by `collate.cjs` (lines 509, 532) and `validate-store.cjs` (lines 371, 378), enabling T03 and T04 to cleanly replace direct filesystem access with store facade calls.

## Approach

Follow the existing Store/FSImpl delegation pattern. Each new method is:
1. Declared on the `Store` class as a thin delegate to `this.impl.*`
2. Implemented on `FSImpl` using the private helpers `_readJson()` and `_writeJson()` plus `path.join()`/`path.resolve()` for path construction
3. Self-contained — no new dependencies, no npm packages

Key design decisions:
- `purgeEvents` replicates the path-traversal guard from `collate.cjs` (resolved path must stay within the `events/` base directory). This is critical for safety when the sprint ID comes from untrusted input.
- `purgeEvents` accepts `{ dryRun: false }` options. In dry-run mode it returns the file list without deleting.
- `listEventFilenames` returns `{ filename, id }` objects for ALL `.json` files including `_`-prefixed sidecars (validate-store.cjs needs the full list; it filters internally).
- `readCollationState` returns `null` if the file is absent (matches `_readJson` convention).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/store.cjs` | Add four public methods to `Store` class; add four implementations to `FSImpl` class | Close facade bypasses for collation state writes, event purges, and event filename listing |

No other files are modified in this task. T03 will port `collate.cjs` to use the new methods; T04 will port `validate-store.cjs`.

## Plugin Impact Assessment

- **Version bump required?** Yes — but deferred to T09 (release engineering task for this sprint). The change is material (adds new public API to `forge/tools/store.cjs`), but the sprint batches the version bump into a single release at T09.
- **Migration entry required?** No — no schema changes, no breaking changes to existing methods. The new methods are additive.
- **Security scan required?** Yes — any change to `forge/` requires a scan. Deferred to T09 alongside the version bump.
- **Schema change?** No — no `forge/schemas/*.schema.json` files are affected.

## Detailed Implementation

### 1. `writeCollationState(data)` — Store + FSImpl

**Store (delegate):**
```js
writeCollationState(data) { return this.impl.writeCollationState(data); }
```

**FSImpl (implementation):**
```js
writeCollationState(data) {
  const filePath = path.join(this.storeRoot, 'COLLATION_STATE.json');
  return this._writeJson(filePath, data);
}
```

Uses `_writeJson` which creates parent directories if needed and writes with `JSON.stringify(data, null, 2) + '\n'`.

### 2. `readCollationState()` — Store + FSImpl

**Store (delegate):**
```js
readCollationState() { return this.impl.readCollationState(); }
```

**FSImpl (implementation):**
```js
readCollationState() {
  const filePath = path.join(this.storeRoot, 'COLLATION_STATE.json');
  return this._readJson(filePath);
}
```

Returns `null` if the file does not exist (matches `_readJson` behavior).

### 3. `purgeEvents(sprintId, { dryRun = false } = {})` — Store + FSImpl

**Store (delegate):**
```js
purgeEvents(sprintId, opts) { return this.impl.purgeEvents(sprintId, opts); }
```

**FSImpl (implementation):**
```js
purgeEvents(sprintId, { dryRun = false } = {}) {
  const eventsBase = path.resolve(this.storeRoot, 'events');
  const eventsDir  = path.resolve(eventsBase, sprintId);
  // Guard: resolved path must stay within the events base directory.
  if (!eventsDir.startsWith(eventsBase + path.sep) && eventsDir !== eventsBase) {
    throw new Error(`Resolved events path '${eventsDir}' escapes store root — aborting purge`);
  }
  if (!fs.existsSync(eventsDir)) {
    return { purged: false, fileCount: 0, files: [] };
  }
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json'));
  if (dryRun) {
    return { purged: false, fileCount: files.length, files };
  }
  fs.rmSync(eventsDir, { recursive: true, force: true });
  return { purged: true, fileCount: files.length, files };
}
```

The path-traversal guard mirrors the existing guard in `collate.cjs` (lines 516-524). The method throws on path escape rather than calling `process.exit(1)` — tools should decide their own exit strategy; the facade just reports the error.

Returns a structured result object so callers can log appropriately (collate.cjs currently prints different messages for dry-run vs real purge vs no-directory).

### 4. `listEventFilenames(sprintId)` — Store + FSImpl

**Store (delegate):**
```js
listEventFilenames(sprintId) { return this.impl.listEventFilenames(sprintId); }
```

**FSImpl (implementation):**
```js
listEventFilenames(sprintId) {
  const dir = path.join(this.storeRoot, 'events', sprintId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      filename: f,
      id: f.slice(0, -5) // strip .json extension
    }));
}
```

Returns ALL `.json` files including `_`-prefixed sidecars. Callers (validate-store.cjs) filter internally. The `id` field is the filename without the `.json` extension, matching the convention used throughout the store.

## Testing Strategy

- Syntax check: `node --check forge/tools/store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema changes, but confirms no regressions)
- Manual smoke test: after implementation, verify the four new methods are accessible on the exported `Store` instance by running a quick Node REPL check:
  ```js
  const store = require('./forge/tools/store.cjs');
  typeof store.writeCollationState; // 'function'
  typeof store.readCollationState;  // 'function'
  typeof store.purgeEvents;         // 'function'
  typeof store.listEventFilenames;  // 'function'
  ```

## Acceptance Criteria

- [ ] `Store` class exposes `writeCollationState(data)` — writes `COLLATION_STATE.json` to the store root via `_writeJson()`
- [ ] `Store` class exposes `readCollationState()` — reads `COLLATION_STATE.json` from the store root via `_readJson()`; returns null if absent
- [ ] `Store` class exposes `purgeEvents(sprintId, { dryRun: false } = {})` — deletes the entire `events/{sprintId}/` directory; dry-run mode returns the file list without deleting; guards that the resolved path stays within the events base directory
- [ ] `Store` class exposes `listEventFilenames(sprintId)` — returns an array of `{ filename: string, id: string }` objects for all `.json` files (including `_`-prefixed sidecars) in `events/{sprintId}/`; returns `[]` if directory absent
- [ ] All four methods are implemented directly on the `Store` class (delegating to FSImpl), matching the pattern of existing methods like `writeEvent()`
- [ ] `node --check forge/tools/store.cjs` passes
- [ ] No existing methods are modified or broken
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** No immediate user action required. The new methods are additive and backward-compatible. The version bump and migration entry are batched into T09.
- **Backwards compatibility:** Fully preserved. No existing methods change signature or behavior. The new methods are only consumed by T03 and T04 within this sprint.