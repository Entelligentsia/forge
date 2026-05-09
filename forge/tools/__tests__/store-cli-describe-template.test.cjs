'use strict';

// Tests for store-cli.cjs `describe` and `template` subcommands (FORGE-BUG-029-friction).
// Exercises subcommand dispatch, exit codes, and content shape via spawnSync.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const STORE_CLI = path.join(__dirname, '..', 'store-cli.cjs');

function run(args, opts) {
	return spawnSync(process.execPath, [STORE_CLI, ...args], {
		encoding: 'utf8',
		cwd: opts && opts.cwd ? opts.cwd : process.cwd(),
	});
}

describe('store-cli describe <entity>', () => {
	test('describe sprint returns the sprint JSON schema', () => {
		const r = run(['describe', 'sprint']);
		assert.equal(r.status, 0, `stderr: ${r.stderr}`);
		const parsed = JSON.parse(r.stdout);
		assert.equal(parsed.title, 'Sprint');
		assert.ok(Array.isArray(parsed.required));
		assert.ok(parsed.required.includes('sprintId'));
		assert.ok(parsed.properties && parsed.properties.sprintId);
	});

	test('describe task returns the task JSON schema', () => {
		const r = run(['describe', 'task']);
		assert.equal(r.status, 0);
		const parsed = JSON.parse(r.stdout);
		assert.equal(parsed.title, 'Task');
		assert.ok(parsed.required.includes('taskId'));
		assert.ok(parsed.required.includes('sprintId'));
	});

	test('describe bug returns the bug JSON schema', () => {
		const r = run(['describe', 'bug']);
		assert.equal(r.status, 0);
		const parsed = JSON.parse(r.stdout);
		assert.equal(parsed.title, 'Bug');
		assert.ok(parsed.required.includes('bugId'));
	});

	test('describe feature returns the feature JSON schema', () => {
		const r = run(['describe', 'feature']);
		assert.equal(r.status, 0);
		const parsed = JSON.parse(r.stdout);
		assert.equal(parsed.title, 'Feature');
	});

	test('describe nonexistent exits non-zero', () => {
		const r = run(['describe', 'nonexistent']);
		assert.notEqual(r.status, 0);
	});

	test('describe with no entity exits non-zero', () => {
		const r = run(['describe']);
		assert.notEqual(r.status, 0);
	});
});

describe('store-cli template <entity>', () => {
	test('template sprint returns parseable JSON with sprintId placeholder', () => {
		const r = run(['template', 'sprint']);
		assert.equal(r.status, 0, `stderr: ${r.stderr}`);
		const parsed = JSON.parse(r.stdout);
		assert.ok('sprintId' in parsed);
		assert.ok('title' in parsed);
		assert.ok('status' in parsed);
		assert.ok(typeof parsed.sprintId === 'string');
	});

	test('template task includes all required fields from schema', () => {
		const r = run(['template', 'task']);
		assert.equal(r.status, 0);
		const parsed = JSON.parse(r.stdout);
		for (const field of ['taskId', 'sprintId', 'title', 'status', 'path']) {
			assert.ok(field in parsed, `missing required field ${field}`);
		}
	});

	test('template task status is a valid enum value', () => {
		const r = run(['template', 'task']);
		const parsed = JSON.parse(r.stdout);
		const validStatuses = ['draft', 'planned', 'plan-approved', 'implementing', 'implemented'];
		assert.ok(validStatuses.includes(parsed.status), `status "${parsed.status}" not in valid initial states`);
	});

	test('template bug includes severity, status, reportedAt', () => {
		const r = run(['template', 'bug']);
		assert.equal(r.status, 0);
		const parsed = JSON.parse(r.stdout);
		for (const field of ['bugId', 'title', 'severity', 'status', 'path', 'reportedAt']) {
			assert.ok(field in parsed, `missing required field ${field}`);
		}
		const validSeverities = ['critical', 'major', 'minor'];
		assert.ok(validSeverities.includes(parsed.severity));
	});

	test('template feature includes id, title, status, created_at', () => {
		const r = run(['template', 'feature']);
		assert.equal(r.status, 0);
		const parsed = JSON.parse(r.stdout);
		for (const field of ['id', 'title', 'status', 'created_at']) {
			assert.ok(field in parsed, `missing required field ${field}`);
		}
	});

	test('template date-time fields produce ISO 8601 values', () => {
		const r = run(['template', 'sprint']);
		const parsed = JSON.parse(r.stdout);
		if (parsed.createdAt) {
			assert.match(parsed.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		}
	});

	test('template nonexistent exits non-zero', () => {
		const r = run(['template', 'nonexistent']);
		assert.notEqual(r.status, 0);
	});
});
