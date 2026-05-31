'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { levenshtein, normalizeForMatch, suggest, suggestEntityType, formatSuggestion, DRIFT_MAP } = require('../lib/suggest.cjs');

// ---------------------------------------------------------------------------
// levenshtein()
// ---------------------------------------------------------------------------
describe('suggest.cjs — levenshtein', () => {
  test('levenshtein("", "") → 0', () => {
    assert.equal(levenshtein('', ''), 0);
  });

  test('levenshtein("task", "taskId") → 2 (insert "Id")', () => {
    // task(4) → taskId(6): insert 'I' and 'd' = distance 2
    // t-a-s-k → t-a-s-k-I-d = 2
    // Let me compute: task(4) vs taskId(6) — distance is 2 (insert I and d)
    assert.equal(levenshtein('task', 'taskId'), 2);
  });

  test('levenshtein("emit", "emit") → 0 (exact match)', () => {
    assert.equal(levenshtein('emit', 'emit'), 0);
  });

  test('levenshtein("kitten", "sitting") → 3', () => {
    assert.equal(levenshtein('kitten', 'sitting'), 3);
  });

  test('levenshtein("a", "b") → 1', () => {
    assert.equal(levenshtein('a', 'b'), 1);
  });

  test('levenshtein("abc", "abc") → 0', () => {
    assert.equal(levenshtein('abc', 'abc'), 0);
  });

  test('levenshtein("", "abc") → 3', () => {
    assert.equal(levenshtein('', 'abc'), 3);
  });

  test('levenshtein("abc", "") → 3', () => {
    assert.equal(levenshtein('abc', ''), 3);
  });
});

// ---------------------------------------------------------------------------
// normalizeForMatch()
// ---------------------------------------------------------------------------
describe('suggest.cjs — normalizeForMatch', () => {
  test('normalizeForMatch("task_completed") → "task-completed"', () => {
    assert.equal(normalizeForMatch('task_completed'), 'task-completed');
  });

  test('normalizeForMatch("in_progress") → "in-progress"', () => {
    assert.equal(normalizeForMatch('in_progress'), 'in-progress');
  });

  test('normalizeForMatch("task-committed") → "task-committed" (no change)', () => {
    assert.equal(normalizeForMatch('task-committed'), 'task-committed');
  });

  test('normalizeForMatch("event") → "event" (no underscores)', () => {
    assert.equal(normalizeForMatch('event'), 'event');
  });

  test('normalizeForMatch("a_b_c") → "a-b-c" (multiple underscores)', () => {
    assert.equal(normalizeForMatch('a_b_c'), 'a-b-c');
  });
});

// ---------------------------------------------------------------------------
// DRIFT_MAP
// ---------------------------------------------------------------------------
describe('suggest.cjs — DRIFT_MAP', () => {
  test('DRIFT_MAP has entry for "task" → ["taskId"]', () => {
    assert.ok(DRIFT_MAP['task'], 'should have "task" key');
    assert.deepEqual(DRIFT_MAP['task'], ['taskId']);
  });

  test('DRIFT_MAP has entry for "completed" → ["committed"]', () => {
    assert.ok(DRIFT_MAP['completed'], 'should have "completed" key');
    assert.deepEqual(DRIFT_MAP['completed'], ['committed']);
  });

  test('DRIFT_MAP has entry for "in-progress" → ["implementing"]', () => {
    assert.ok(DRIFT_MAP['in-progress'], 'should have "in-progress" key');
    assert.deepEqual(DRIFT_MAP['in-progress'], ['implementing']);
  });

  test('DRIFT_MAP has entry for "timestamp" → ["startTimestamp", "endTimestamp"]', () => {
    assert.ok(DRIFT_MAP['timestamp'], 'should have "timestamp" key');
    assert.deepEqual(DRIFT_MAP['timestamp'], ['startTimestamp', 'endTimestamp']);
  });

  test('DRIFT_MAP has entry for "task-completed" → ["task-committed"]', () => {
    assert.ok(DRIFT_MAP['task-completed'], 'should have "task-completed" key');
    assert.deepEqual(DRIFT_MAP['task-completed'], ['task-committed']);
  });

  test('DRIFT_MAP has entry for "implemented" → ["implementing"]', () => {
    assert.ok(DRIFT_MAP['implemented'], 'should have "implemented" key');
    assert.deepEqual(DRIFT_MAP['implemented'], ['implementing']);
  });

  test('DRIFT_MAP has entry for "set" → ["set-summary"]', () => {
    assert.ok(DRIFT_MAP['set'], 'should have "set" key');
    assert.deepEqual(DRIFT_MAP['set'], ['set-summary']);
  });

  test('DRIFT_MAP has entry for "create" → ["write"]', () => {
    // Agents reach for REST-style `create <entity>`; store-cli has no `create`
    // verb (records are written with `write`), and create→write is beyond
    // Levenshtein ≤2 so only the drift-map can catch it. (cartographer 2026-05-31)
    assert.ok(DRIFT_MAP['create'], 'should have "create" key');
    assert.deepEqual(DRIFT_MAP['create'], ['write']);
  });

  test('DRIFT_MAP has entry for "start" → ["startTimestamp"]', () => {
    assert.ok(DRIFT_MAP['start'], 'should have "start" key');
    assert.deepEqual(DRIFT_MAP['start'], ['startTimestamp']);
  });

  test('DRIFT_MAP does NOT have "in_progress" (underscore form — handled by normalization)', () => {
    assert.equal(DRIFT_MAP['in_progress'], undefined, 'underscore form should not be a separate entry');
  });

  test('DRIFT_MAP does NOT have "task_implemented" (underscore form — handled by normalization-hint)', () => {
    assert.equal(DRIFT_MAP['task_implemented'], undefined, 'underscore form should not be a separate entry');
  });

  test('DRIFT_MAP does NOT have "task-planned" (normalization-hint handles it)', () => {
    assert.equal(DRIFT_MAP['task-planned'], undefined, 'task-planned is a valid enum value, not a drift target');
  });
});

// ---------------------------------------------------------------------------
// suggest() — main pipeline
// ---------------------------------------------------------------------------
describe('suggest.cjs — suggest pipeline', () => {
  // Test 4: DRIFT_MAP hit
  test('suggest("task", fieldNames) — DRIFT_MAP returns ["taskId"]', () => {
    const result = suggest('task', ['taskId', 'sprintId', 'title', 'status']);
    assert.deepEqual(result, ['taskId']);
  });

  // Test 5: Levenshtein fallback
  test('suggest("evnt", entities) — Levenshtein fallback returns ["event"]', () => {
    const result = suggest('evnt', ['sprint', 'task', 'bug', 'event', 'feature']);
    assert.deepEqual(result, ['event']);
  });

  // Test 6: DRIFT_MAP hit for status values
  test('suggest("completed", statuses) — DRIFT_MAP returns ["committed"]', () => {
    const statuses = ['committed', 'implementing', 'draft', 'planned', 'plan-approved', 'plan-revision-required'];
    const result = suggest('completed', statuses);
    assert.deepEqual(result, ['committed']);
  });

  // Test 7: DRIFT_MAP multi-target filtered by pool
  test('suggest("timestamp", fieldNames) — DRIFT_MAP multi-target returns both', () => {
    const fieldNames = ['startTimestamp', 'endTimestamp', 'taskId', 'sprintId', 'title'];
    const result = suggest('timestamp', fieldNames);
    assert.deepEqual(result, ['startTimestamp', 'endTimestamp']);
  });

  // Test 8: Normalization + DRIFT_MAP
  test('suggest("task_completed", statuses) — normalization + DRIFT_MAP → ["task-committed"]', () => {
    const statuses = ['task-committed', 'task-implemented', 'task-planned', 'task-draft'];
    const result = suggest('task_completed', statuses);
    // "task_completed" normalizes to "task-completed" → DRIFT_MAP: "task-completed" → ["task-committed"]
    // But wait — first normalize "task_completed" → "task-completed"
    // Then suppress? "task_completed" (original) is not in candidates, so not suppressed
    // Then normalization-hint? "task-completed" (normalized) is in candidates? Yes if "task-completed" is in the list
    // But "task-completed" is NOT in our test list (we have "task-committed", "task-implemented", "task-planned", "task-draft")
    // So normalization-hint doesn't fire. DRIFT_MAP "task-completed" → ["task-committed"], and "task-committed" IS in the pool
    assert.deepEqual(result, ['task-committed']);
  });

  // Test 9: DRIFT_MAP hit for command
  test('suggest("set", commands) — DRIFT_MAP returns ["set-summary"]', () => {
    const commands = ['write', 'read', 'list', 'delete', 'set-summary', 'emit', 'update-status'];
    const result = suggest('set', commands);
    assert.deepEqual(result, ['set-summary']);
  });

  // Test 9b: DRIFT_MAP hit for the `create` → `write` verb misconception
  test('suggest("create", commands) — DRIFT_MAP returns ["write"]', () => {
    const commands = ['write', 'read', 'list', 'delete', 'set-summary', 'emit', 'update-status'];
    const result = suggest('create', commands);
    assert.deepEqual(result, ['write']);
  });

  // Test 10: No candidates within distance 2
  test('suggest("xyz", entities) — no candidates within distance 2 → empty', () => {
    const result = suggest('xyz', ['sprint', 'task', 'bug', 'event', 'feature']);
    assert.deepEqual(result, []);
  });

  // Test 11: Suppression when original matches a valid candidate
  test('suggest("event", entities) — original matches valid candidate → empty (suppressed)', () => {
    const result = suggest('event', ['sprint', 'task', 'bug', 'event', 'feature']);
    assert.deepEqual(result, []);
  });

  // Test 12: MAX_CANDIDATES safety guard
  test('suggest with pool > maxCandidates → empty', () => {
    const bigPool = Array.from({ length: 250 }, (_, i) => `field_${i}`);
    const result = suggest('xyz', bigPool, { maxCandidates: 200 });
    assert.deepEqual(result, []);
  });

  // Test 17: Normalization-hint case
  test('suggest("task_implemented", taskStatuses) — normalization-hint → ["task-implemented"]', () => {
    const statuses = ['task-implemented', 'task-committed', 'task-planned', 'task-draft'];
    // "task_implemented" → normalized "task-implemented" → original is not in pool but normalized IS in pool
    // Step 4 fires: suggest "task-implemented"
    const result = suggest('task_implemented', statuses);
    assert.deepEqual(result, ['task-implemented']);
  });

  // Test 18: DRIFT_MAP filtering by pool (CRITICAL 2)
  test('suggest("set", fieldNames) — DRIFT_MAP target "set-summary" not in pool → Levenshtein fallback', () => {
    const fieldNames = ['taskId', 'sprintId', 'title', 'status', 'path'];
    const result = suggest('set', fieldNames);
    // "set" → DRIFT_MAP: ["set-summary"] → "set-summary" NOT in fieldNames → filtered out
    // Levenshtein: distance("set", "taskId")=4, "sprintId"=5, "title"=3, "status"=2, "path"=3
    // "status" has distance 2 → suggested
    const resultSet = result.slice();
    // "status" has Levenshtein distance 2 from "set" (s→s, e→t, t→a = 2 transpositions? Let me recalculate)
    // Actually: "set" vs "status": need to compute
    // s-e-t → s-t-a-t-u-s = 4 inserts + 1 sub = 5? Too far
    // Actually no candidates within distance 2 in this tiny pool
    assert.equal(result.length, 0, 'No candidates within distance 2 from "set" in field names');
  });

  // Test 19: in_progress normalization
  test('suggest("in_progress", statuses) → normalization + DRIFT_MAP → ["implementing"]', () => {
    const statuses = ['implementing', 'draft', 'planned', 'plan-approved', 'committed'];
    // "in_progress" normalizes to "in-progress" → DRIFT_MAP: "in-progress" → ["implementing"]
    // "implementing" IS in the pool
    const result = suggest('in_progress', statuses);
    assert.deepEqual(result, ['implementing']);
  });

  // Additional: suppression test with normalized form
  test('suggest("draft", statuses) — exact match in pool → suppressed', () => {
    const statuses = ['draft', 'planned', 'implementing', 'committed'];
    const result = suggest('draft', statuses);
    assert.deepEqual(result, []);
  });

  // Additional: Levenshtein with multiple close candidates
  test('suggest returns max 3 suggestions', () => {
    // Create a pool where many candidates are within distance 2
    const result = suggest('ab', ['aa', 'ac', 'ad', 'ae', 'ba', 'ca', 'abc', 'xab']);
    // The top candidates sorted by distance then alphabetically, capped at 3
    assert.ok(result.length <= 3, 'should return at most 3 suggestions');
  });
});

// ---------------------------------------------------------------------------
// suggestEntityType()
// ---------------------------------------------------------------------------
describe('suggest.cjs — suggestEntityType', () => {
  test('suggestEntityType("evnt") with default pool → ["event"]', () => {
    const result = suggestEntityType('evnt');
    assert.deepEqual(result, ['event']);
  });

  test('suggestEntityType("evnt") with narrower pool (no event) → []', () => {
    const result = suggestEntityType('evnt', ['sprint', 'task', 'bug', 'feature']);
    assert.deepEqual(result, []);
  });

  test('suggestEntityType("tsk") with default pool → ["task"]', () => {
    const result = suggestEntityType('tsk');
    assert.deepEqual(result, ['task']);
  });
});

// ---------------------------------------------------------------------------
// formatSuggestion()
// ---------------------------------------------------------------------------
describe('suggest.cjs — formatSuggestion', () => {
  test('formatSuggestion([]) → empty string', () => {
    assert.equal(formatSuggestion([]), '');
  });

  test('formatSuggestion(["startTimestamp"]) → single suggestion', () => {
    assert.equal(formatSuggestion(['startTimestamp']), '(Did you mean "startTimestamp"?)');
  });

  test('formatSuggestion(["startTimestamp", "endTimestamp"]) → two suggestions with "or"', () => {
    assert.equal(formatSuggestion(['startTimestamp', 'endTimestamp']), '(Did you mean "startTimestamp" or "endTimestamp"?)');
  });

  test('formatSuggestion(["a", "b", "c"]) → three suggestions with Oxford comma', () => {
    assert.equal(formatSuggestion(['a', 'b', 'c']), '(Did you mean "a", "b", or "c"?)');
  });

  test('formatSuggestion with non-array returns empty', () => {
    assert.equal(formatSuggestion(null), '');
    assert.equal(formatSuggestion(undefined), '');
  });
});