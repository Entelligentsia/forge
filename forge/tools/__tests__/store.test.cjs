'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Store, FSImpl } = require('../store.cjs');

// ── In-memory implementation for testing ──────────────────────────────────────
// The Store facade delegates to this.impl, which must have the same method
// signatures as FSImpl: writeSprint, getSprint, listSprints, etc.

class MemoryImpl {
  constructor() {
    this.data = {};
  }

  _key(entity, id) {
    return `${entity}/${id}`;
  }

  getSprint(id) { return this.data[this._key('sprint', id)] || null; }
  listSprints(filter) {
    const records = Object.entries(this.data)
      .filter(([k]) => k.startsWith('sprint/'))
      .map(([, v]) => v);
    return filter ? records.filter(r => this._matches(r, filter)) : records;
  }
  writeSprint(data) { this.data[this._key('sprint', data.sprintId)] = { ...data }; return data; }
  deleteSprint(id) { const k = this._key('sprint', id); const existed = k in this.data; delete this.data[k]; return existed; }

  getTask(id) { return this.data[this._key('task', id)] || null; }
  listTasks(filter) {
    const records = Object.entries(this.data)
      .filter(([k]) => k.startsWith('task/'))
      .map(([, v]) => v);
    return filter ? records.filter(r => this._matches(r, filter)) : records;
  }
  writeTask(data) { this.data[this._key('task', data.taskId)] = { ...data }; return data; }
  deleteTask(id) { const k = this._key('task', id); delete this.data[k]; }

  getBug(id) { return this.data[this._key('bug', id)] || null; }
  listBugs(filter) {
    const records = Object.entries(this.data)
      .filter(([k]) => k.startsWith('bug/'))
      .map(([, v]) => v);
    return filter ? records.filter(r => this._matches(r, filter)) : records;
  }
  writeBug(data) { this.data[this._key('bug', data.bugId)] = { ...data }; return data; }
  deleteBug(id) { const k = this._key('bug', id); delete this.data[k]; }

  getFeature(id) { return this.data[this._key('feature', id)] || null; }
  listFeatures(filter) {
    const records = Object.entries(this.data)
      .filter(([k]) => k.startsWith('feature/'))
      .map(([, v]) => v);
    return filter ? records.filter(r => this._matches(r, filter)) : records;
  }
  writeFeature(data) { this.data[this._key('feature', data.featureId)] = { ...data }; return data; }
  deleteFeature(id) { const k = this._key('feature', id); delete this.data[k]; }

  writeEvent(sprintId, data) { this.data[this._key('event', data.eventId)] = { ...data, sprintId }; return data; }
  getEvent(eventId, sprintId) { return this.data[this._key('event', eventId)] || null; }
  listEvents(sprintId) {
    return Object.values(this.data)
      .filter(r => r && r.sprintId === sprintId && r.eventId && !r.eventId.startsWith('_'));
  }
  purgeEvents(sprintId) {
    const keys = Object.keys(this.data).filter(k => {
      const r = this.data[k];
      return r && r.sprintId === sprintId;
    });
    keys.forEach(k => delete this.data[k]);
    return { purged: true, fileCount: keys.length };
  }

  _matches(record, filter) {
    if (!filter) return true;
    return Object.entries(filter).every(([key, val]) => record[key] === val);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('store.cjs', () => {
  describe('Store with MemoryImpl', () => {
    let store;

    beforeEach(() => {
      store = new Store(new MemoryImpl());
    });

    test('writeSprint and getSprint round-trip', () => {
      store.writeSprint({ sprintId: 'S-001', status: 'planning', name: 'Sprint 1' });
      const result = store.getSprint('S-001');
      assert.equal(result.sprintId, 'S-001');
      assert.equal(result.status, 'planning');
    });

    test('writeTask and getTask round-trip', () => {
      store.writeTask({ taskId: 'T-001', status: 'implementing', title: 'Fix bug' });
      const result = store.getTask('T-001');
      assert.equal(result.taskId, 'T-001');
      assert.equal(result.status, 'implementing');
    });

    test('writeBug and getBug round-trip', () => {
      store.writeBug({ bugId: 'B-001', status: 'open', title: 'Crash on login' });
      const result = store.getBug('B-001');
      assert.equal(result.bugId, 'B-001');
    });

    test('writeFeature and getFeature round-trip', () => {
      store.writeFeature({ featureId: 'F-001', status: 'proposed', title: 'Dark mode' });
      const result = store.getFeature('F-001');
      assert.equal(result.featureId, 'F-001');
    });

    test('listSprints returns all sprints', () => {
      store.writeSprint({ sprintId: 'S-001', status: 'planning' });
      store.writeSprint({ sprintId: 'S-002', status: 'active' });
      const result = store.listSprints();
      assert.equal(result.length, 2);
    });

    test('listTasks with filter', () => {
      store.writeTask({ taskId: 'T-001', status: 'implementing', sprintId: 'S-001' });
      store.writeTask({ taskId: 'T-002', status: 'review-approved', sprintId: 'S-001' });
      store.writeTask({ taskId: 'T-003', status: 'implementing', sprintId: 'S-002' });
      const implementing = store.listTasks({ status: 'implementing' });
      assert.equal(implementing.length, 2);
    });

    test('deleteSprint removes sprint', () => {
      store.writeSprint({ sprintId: 'S-001', status: 'planning' });
      store.deleteSprint('S-001');
      assert.equal(store.getSprint('S-001'), null);
    });

    test('deleteTask removes task', () => {
      store.writeTask({ taskId: 'T-001', status: 'implementing' });
      store.deleteTask('T-001');
      assert.equal(store.getTask('T-001'), null);
    });

    test('writeEvent and listEvents', () => {
      store.writeEvent('S-001', { eventId: 'E-001', phase: 'implement', durationMinutes: 5 });
      store.writeEvent('S-001', { eventId: 'E-002', phase: 'review', durationMinutes: 3 });
      const events = store.listEvents('S-001');
      assert.equal(events.length, 2);
    });

    test('getEvent by ID and sprintId', () => {
      store.writeEvent('S-001', { eventId: 'E-001', phase: 'implement' });
      const event = store.getEvent('E-001', 'S-001');
      assert.equal(event.eventId, 'E-001');
    });

    test('purgeEvents removes all events for a sprint', () => {
      store.writeEvent('S-001', { eventId: 'E-001', phase: 'implement' });
      store.writeEvent('S-001', { eventId: 'E-002', phase: 'review' });
      const result = store.purgeEvents('S-001');
      assert.ok(result.purged);
      assert.equal(store.listEvents('S-001').length, 0);
    });
  });

  describe('FSImpl with temp directory', () => {
    let tmpDir;
    let impl;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-store-test-'));
      const storeRoot = path.join(tmpDir, '.forge', 'store');
      fs.mkdirSync(path.join(storeRoot, 'sprints'), { recursive: true });
      fs.mkdirSync(path.join(storeRoot, 'tasks'), { recursive: true });
      fs.mkdirSync(path.join(storeRoot, 'bugs'), { recursive: true });
      fs.mkdirSync(path.join(storeRoot, 'features'), { recursive: true });
      fs.mkdirSync(path.join(storeRoot, 'events'), { recursive: true });
      // Write a config.json that points paths.store to our temp store root
      const configPath = path.join(tmpDir, '.forge', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ paths: { store: storeRoot } }), 'utf8');
      impl = new FSImpl(configPath);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('writeSprint creates file and getSprint reads it back', () => {
      const sprint = { sprintId: 'S-001', status: 'planning', name: 'Test Sprint' };
      impl.writeSprint(sprint);
      const result = impl.getSprint('S-001');
      assert.equal(result.sprintId, 'S-001');
      assert.equal(result.name, 'Test Sprint');
    });

    test('listSprints returns written sprints', () => {
      impl.writeSprint({ sprintId: 'S-001', status: 'planning' });
      impl.writeSprint({ sprintId: 'S-002', status: 'active' });
      const sprints = impl.listSprints();
      assert.equal(sprints.length, 2);
    });

    test('_matches filters records correctly', () => {
      const record = { taskId: 'T-001', status: 'implementing', sprintId: 'S-001' };
      assert.ok(impl._matches(record, { status: 'implementing' }));
      assert.ok(impl._matches(record, { sprintId: 'S-001' }));
      assert.ok(!impl._matches(record, { status: 'completed' }));
      assert.ok(impl._matches(record, null));
      assert.ok(impl._matches(record, {}));
    });

    test('_getPath returns correct path for sprint', () => {
      const sprintPath = impl._getPath('sprint', 'S-001');
      assert.ok(sprintPath.includes('sprints'), `path should contain 'sprints': ${sprintPath}`);
      assert.ok(sprintPath.endsWith('S-001.json'), `path should end with 'S-001.json': ${sprintPath}`);
    });

    test('_getPath throws on unknown entity type', () => {
      assert.throws(() => impl._getPath('unknown', 'X'), /Unknown entity type/);
    });
  });

  describe('purgeEvents path traversal guard', () => {
    let tmpDir;
    let impl;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-store-test-'));
      const storeRoot = path.join(tmpDir, '.forge', 'store');
      fs.mkdirSync(path.join(storeRoot, 'events'), { recursive: true });
      const configPath = path.join(tmpDir, '.forge', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ paths: { store: storeRoot } }), 'utf8');
      impl = new FSImpl(configPath);
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('purgeEvents rejects path traversal in sprintId', () => {
      assert.throws(() => {
        impl.purgeEvents('../../../etc');
      }, /escapes store root|aborting/i);
    });
  });
});