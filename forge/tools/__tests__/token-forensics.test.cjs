'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  analyzeTranscript,
  parseTranscript,
  normalizeUsage,
} = require('../token-forensics.cjs');

const FIX = path.join(__dirname, 'fixtures', 'token-forensics');
const readLines = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');

describe('token-forensics.cjs :: normalizeUsage()', () => {
  test('reads snake_case (Anthropic API) usage fields', () => {
    const u = normalizeUsage({
      input_tokens: 100,
      output_tokens: 40,
      cache_read_input_tokens: 10,
      cache_creation_input_tokens: 5,
    });
    assert.deepEqual(u, { input: 100, output: 40, cacheRead: 10, cacheWrite: 5, through: 155 });
  });

  test('reads camelCase (Forge sidecar) usage fields', () => {
    const u = normalizeUsage({
      inputTokens: 300,
      outputTokens: 150,
      cacheReadTokens: 30,
      cacheWriteTokens: 15,
    });
    assert.deepEqual(u, { input: 300, output: 150, cacheRead: 30, cacheWrite: 15, through: 495 });
  });

  test('missing fields default to zero', () => {
    const u = normalizeUsage({ input_tokens: 200 });
    assert.deepEqual(u, { input: 200, output: 0, cacheRead: 0, cacheWrite: 0, through: 200 });
  });

  test('returns null when there is no usage object', () => {
    assert.equal(normalizeUsage(undefined), null);
    assert.equal(normalizeUsage(null), null);
    assert.equal(normalizeUsage({}), null);
  });
});

describe('token-forensics.cjs :: parseTranscript()', () => {
  test('ignores blank lines and non-assistant / id-less / usage-less lines', () => {
    const records = parseTranscript(readLines('sample-session.jsonl'));
    // 4 distinct assistant messages carry id + usage in the fixture
    const ids = new Set(records.map((r) => r.id));
    assert.deepEqual([...ids].sort(), ['msg_orch_1', 'msg_orch_2', 'msg_sub_a', 'msg_sub_b']);
  });

  test('tolerates malformed JSON lines without throwing', () => {
    const records = parseTranscript('not json\n{"type":"assistant"}\n');
    assert.deepEqual(records, []);
  });
});

describe('token-forensics.cjs :: analyzeTranscript() — dedup by message.id', () => {
  const report = analyzeTranscript(parseTranscript(readLines('sample-session.jsonl')));

  test('counts each distinct message.id exactly once', () => {
    assert.equal(report.deduped.messageCount, 4);
    assert.equal(report.deduped.droppedDuplicates, 3);
  });

  test('through-model total is the deduped sum, strictly less than the naive per-line sum', () => {
    assert.equal(report.throughModel.total, 1775);
    assert.equal(report.throughModel.input, 1100);
    assert.equal(report.throughModel.output, 520);
    assert.equal(report.throughModel.cacheRead, 110);
    assert.equal(report.throughModel.cacheWrite, 45);
    // naive sum (no dedup) would double the duplicated lines — must be larger
    assert.ok(report.throughModel.total < report.naiveTotal);
  });

  test('collision tie-break keeps the record with the larger output_tokens', () => {
    // msg_orch_2 appears twice: out=0 then out=80. The 80 record must win.
    assert.equal(report.byActor.orchestrator.output, 120); // 40 (orch_1) + 80 (orch_2)
  });
});

describe('token-forensics.cjs :: analyzeTranscript() — actor split (AC #2)', () => {
  const report = analyzeTranscript(parseTranscript(readLines('sample-session.jsonl')));

  test('attribution is available when transcript carries actor/agent markers', () => {
    assert.equal(report.attributionAvailable, true);
  });

  test('orchestrator-loop tokens are separated from subagent tokens', () => {
    assert.equal(report.byActor.orchestrator.through, 455);
    assert.equal(report.byActor.subagents.total.through, 1320);
  });

  test('per-subagent breakdown is keyed by agent name', () => {
    const agents = Object.keys(report.byActor.subagents.byAgent).sort();
    assert.deepEqual(agents, [
      'FORGE-S27-T06:engineer:plan:1',
      'FORGE-S27-T06:supervisor:review-plan:1',
    ]);
    assert.equal(report.byActor.subagents.byAgent['FORGE-S27-T06:engineer:plan:1'].through, 495);
  });

  test('orchestrator + subagents through equals total when fully attributed', () => {
    assert.equal(
      report.byActor.orchestrator.through + report.byActor.subagents.total.through,
      report.throughModel.total,
    );
  });
});

describe('token-forensics.cjs :: analyzeTranscript() — attribution absent (AC #2 "where permits")', () => {
  const report = analyzeTranscript(parseTranscript(readLines('no-attribution.jsonl')));

  test('falls back to an unattributed bucket and flags attributionAvailable false', () => {
    assert.equal(report.attributionAvailable, false);
    assert.equal(report.deduped.messageCount, 2);
    assert.equal(report.throughModel.total, 450);
    assert.equal(report.byActor.unattributed.through, 450);
    assert.equal(report.byActor.orchestrator.through, 0);
    assert.equal(report.byActor.subagents.total.through, 0);
  });
});

describe('token-forensics.cjs :: analyzeTranscript() — empty input', () => {
  test('returns a zeroed report without throwing', () => {
    const report = analyzeTranscript([]);
    assert.equal(report.throughModel.total, 0);
    assert.equal(report.deduped.messageCount, 0);
    assert.equal(report.attributionAvailable, false);
  });
});
