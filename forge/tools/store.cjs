'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Store Facade for Forge
 * Provides a backend-agnostic interface for CRUD operations on core store entities.
 */
class Store {
  constructor(implementation) {
    this.impl = implementation;
  }

  // --- Sprints ---
  getSprint(id) { return this.impl.getSprint(id); }
  listSprints(filter) { return this.impl.listSprints(filter); }
  writeSprint(data) { return this.impl.writeSprint(data); }
  deleteSprint(id) { return this.impl.deleteSprint(id); }

  // --- Tasks ---
  getTask(id) { return this.impl.getTask(id); }
  listTasks(filter) { return this.impl.listTasks(filter); }
  writeTask(data) { return this.impl.writeTask(data); }
  deleteTask(id) { return this.impl.deleteTask(id); }

  // --- Bugs ---
  getBug(id) { return this.impl.getBug(id); }
  listBugs(filter) { return this.impl.listBugs(filter); }
  writeBug(data) { return this.impl.writeBug(data); }
  deleteBug(id) { return this.impl.deleteBug(id); }

  // --- Events ---
  getEvent(id, sprintId) { return this.impl.getEvent(id, sprintId); }
  listEvents(sprintId, filter) { return this.impl.listEvents(sprintId, filter); }
  writeEvent(sprintId, data) { return this.impl.writeEvent(sprintId, data); }
  deleteEvent(id, sprintId) { return this.impl.deleteEvent(id, sprintId); }

  // --- Features ---
  getFeature(id) { return this.impl.getFeature(id); }
  listFeatures(filter) { return this.impl.listFeatures(filter); }
  writeFeature(data) { return this.impl.writeFeature(data); }
  deleteFeature(id) { return this.impl.deleteFeature(id); }
}

/**
 * Filesystem Implementation of the Store facade.
 * Manages JSON flat-files in the .forge/store directory.
 */
class FSImpl {
  constructor(configPath = '.forge/config.json') {
    this.configPath = configPath;
    this.storeRoot = this._resolveStoreRoot();
  }

  _resolveStoreRoot() {
    try {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      return config.paths.store;
    } catch (e) {
      // Fallback to default if config is missing or corrupt
      return '.forge/store';
    }
  }

  _getPath(entity, id) {
    const entityMap = {
      sprint: 'sprints',
      task: 'tasks',
      bug: 'bugs',
      event: 'events',
      feature: 'features'
    };
    const dir = entityMap[entity];
    if (!dir) throw new Error(`Unknown entity type: ${entity}`);
    return path.join(this.storeRoot, dir, `${id}.json`);
  }

  _readJson(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  _writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return data;
  }

  // Sprints
  getSprint(id) { return this._readJson(this._getPath('sprint', id)); }
  listSprints(filter) {
    const dir = path.join(this.storeRoot, 'sprints');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this._readJson(path.join(dir, f)))
      .filter(s => !s || (filter ? this._matches(s, filter) : true));
  }
  writeSprint(data) {
    return this._writeJson(this._getPath('sprint', data.sprintId), data);
  }
  deleteSprint(id) {
    const p = this._getPath('sprint', id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Tasks
  getTask(id) { return this._readJson(this._getPath('task', id)); }
  listTasks(filter) {
    const dir = path.join(this.storeRoot, 'tasks');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this._readJson(path.join(dir, f)))
      .filter(t => !t || (filter ? this._matches(t, filter) : true));
  }
  writeTask(data) {
    return this._writeJson(this._getPath('task', data.taskId), data);
  }
  deleteTask(id) {
    const p = this._getPath('task', id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Bugs
  getBug(id) { return this._readJson(this._getPath('bug', id)); }
  listBugs(filter) {
    const dir = path.join(this.storeRoot, 'bugs');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this._readJson(path.join(dir, f)))
      .filter(b => !b || (filter ? this._matches(b, filter) : true));
  }
  writeBug(data) {
    return this._writeJson(this._getPath('bug', data.bugId), data);
  }
  deleteBug(id) {
    const p = this._getPath('bug', id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Events
  getEvent(id, sprintId) {
    const p = path.join(this.storeRoot, 'events', sprintId, `${id}.json`);
    return this._readJson(p);
  }
  listEvents(sprintId, filter) {
    const dir = path.join(this.storeRoot, 'events', sprintId);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this._readJson(path.join(dir, f)))
      .filter(e => !e || (filter ? this._matches(e, filter) : true));
  }
  writeEvent(sprintId, data) {
    const p = path.join(this.storeRoot, 'events', sprintId, `${data.eventId}.json`);
    return this._writeJson(p, data);
  }
  deleteEvent(id, sprintId) {
    const p = path.join(this.storeRoot, 'events', sprintId, `${id}.json`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Features
  getFeature(id) { return this._readJson(this._getPath('feature', id)); }
  listFeatures(filter) {
    const dir = path.join(this.storeRoot, 'features');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this._readJson(path.join(dir, f)))
      .filter(f => !f || (filter ? this._matches(f, filter) : true));
  }
  writeFeature(data) {
    return this._writeJson(this._getPath('feature', data.feature_id), data);
  }
  deleteFeature(id) {
    const p = this._getPath('feature', id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  _matches(record, filter) {
    if (!filter) return true;
    return Object.entries(filter).every(([key, value]) => record[key] === value);
  }
}

// Export a singleton instance for the plugin
module.exports = new Store(new FSImpl());
