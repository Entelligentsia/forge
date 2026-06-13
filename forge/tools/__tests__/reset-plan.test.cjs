// Tests for reset-plan.cjs (FEAT-009 T03 — reset planner + integrity checker).

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { planReset, TASK_PRE_STATUS, BUG_PRE_STATUS } = require('../reset-plan.cjs');

// Minimal in-memory store facade.
function mockStore({ tasks = [], bugs = [], sprints = [] } = {}) {
	const byId = (arr, key) => Object.fromEntries(arr.map((r) => [r[key], r]));
	const T = byId(tasks, 'taskId');
	const B = byId(bugs, 'bugId');
	const S = byId(sprints, 'sprintId');
	return {
		getTask: (id) => T[id] || null,
		getBug: (id) => B[id] || null,
		getSprint: (id) => S[id] || null,
		listTasks: () => tasks,
	};
}

describe('reset-plan: pre-status maps', () => {
	test('task and bug maps match the documented phase guards', () => {
		assert.equal(TASK_PRE_STATUS.implement, 'plan-approved');
		assert.equal(TASK_PRE_STATUS['review-code'], 'implemented');
		assert.equal(BUG_PRE_STATUS.triage, 'reported');
		assert.equal(BUG_PRE_STATUS.implement, 'in-progress');
	});
});

describe('reset-plan: task', () => {
	test('plans a rewind, flags committed work + sprint incoherence + dependents', () => {
		const store = mockStore({
			tasks: [
				{ taskId: 'S1-T03', sprintId: 'S1', status: 'committed', dependencies: ['S1-T02'] },
				{ taskId: 'S1-T04', sprintId: 'S1', status: 'implemented', dependencies: ['S1-T03'] },
				{ taskId: 'S1-T05', sprintId: 'S1', status: 'draft', dependencies: ['S1-T03'] },
			],
			sprints: [{ sprintId: 'S1', status: 'completed', taskIds: ['S1-T03', 'S1-T04', 'S1-T05'] }],
		});
		const plan = planReset(store, { entity: 'task', id: 'S1-T03', to: 'implement' });
		assert.equal(plan.ok, true);
		assert.equal(plan.entity.targetStatus, 'plan-approved');
		assert.equal(plan.rewind, true);
		assert.equal(plan.forceRequired, true);
		assert.deepEqual(plan.transitions, [{ id: 'S1-T03', kind: 'task', from: 'committed', to: 'plan-approved' }]);
		const codes = plan.warnings.map((w) => w.code).sort();
		assert.deepEqual(codes, ['committed-work', 'dependents-affected', 'sprint-incoherent']);
		// only T04 (implemented, past planning) counts as an affected dependent; T05 is draft
		const dep = plan.warnings.find((w) => w.code === 'dependents-affected');
		assert.deepEqual(dep.ids, ['S1-T04']);
	});

	test('forward reset on a clean task in an active sprint has no warnings', () => {
		const store = mockStore({
			tasks: [{ taskId: 'S1-T01', sprintId: 'S1', status: 'plan-approved', dependencies: [] }],
			sprints: [{ sprintId: 'S1', status: 'active', taskIds: ['S1-T01'] }],
		});
		const plan = planReset(store, { entity: 'task', id: 'S1-T01', to: 'implement' });
		assert.equal(plan.ok, true);
		assert.equal(plan.rewind, false);
		assert.deepEqual(plan.warnings, []);
	});

	test('errors on unknown task phase and missing task', () => {
		const store = mockStore({ tasks: [{ taskId: 'T1', status: 'planned' }] });
		assert.equal(planReset(store, { entity: 'task', id: 'T1', to: 'nope' }).ok, false);
		assert.equal(planReset(store, { entity: 'task', id: 'MISSING', to: 'implement' }).ok, false);
	});
});

describe('reset-plan: bug', () => {
	test('rewinds a fixed bug to triage and flags committed work', () => {
		const store = mockStore({ bugs: [{ bugId: 'BUG-1', status: 'fixed' }], tasks: [] });
		const plan = planReset(store, { entity: 'bug', id: 'BUG-1', to: 'triage' });
		assert.equal(plan.ok, true);
		assert.equal(plan.entity.targetStatus, 'reported');
		assert.equal(plan.rewind, true);
		assert.ok(plan.warnings.some((w) => w.code === 'committed-work'));
	});

	test('flags task dependents of a bug', () => {
		const store = mockStore({
			bugs: [{ bugId: 'BUG-9', status: 'in-progress' }],
			tasks: [{ taskId: 'T7', status: 'implemented', dependencies: ['BUG-9'] }],
		});
		const plan = planReset(store, { entity: 'bug', id: 'BUG-9', to: 'implement' });
		assert.ok(plan.warnings.some((w) => w.code === 'dependents-affected' && w.ids.includes('T7')));
	});
});

describe('reset-plan: sprint cascade', () => {
	test('cascades the from-task plus transitive dependents and reopens the sprint', () => {
		const store = mockStore({
			tasks: [
				{ taskId: 'T1', sprintId: 'S2', status: 'committed', dependencies: [] },
				{ taskId: 'T2', sprintId: 'S2', status: 'committed', dependencies: ['T1'] },
				{ taskId: 'T3', sprintId: 'S2', status: 'approved', dependencies: ['T2'] },
				{ taskId: 'T4', sprintId: 'S2', status: 'planned', dependencies: [] },
			],
			sprints: [{ sprintId: 'S2', status: 'completed', taskIds: ['T1', 'T2', 'T3', 'T4'] }],
		});
		const plan = planReset(store, { entity: 'sprint', id: 'S2', fromTask: 'T2' });
		assert.equal(plan.ok, true);
		// T2 + its transitive dependent T3 cascade; T1 (predecessor) and T4 (independent) do not
		assert.deepEqual(plan.cascade.sort(), ['T2', 'T3']);
		assert.equal(plan.transitions[0].kind, 'sprint');
		assert.equal(plan.transitions[0].to, 'active');
		assert.ok(plan.warnings.some((w) => w.code === 'committed-work'));
		assert.ok(plan.warnings.some((w) => w.code === 'sprint-reopen'));
	});

	test('errors when from-task is missing or not a member', () => {
		const store = mockStore({ sprints: [{ sprintId: 'S2', status: 'active', taskIds: ['T1'] }], tasks: [{ taskId: 'T1', sprintId: 'S2', status: 'planned' }] });
		assert.equal(planReset(store, { entity: 'sprint', id: 'S2' }).ok, false);
		assert.equal(planReset(store, { entity: 'sprint', id: 'S2', fromTask: 'TX' }).ok, false);
	});
});

describe('reset-plan: dispatch', () => {
	test('errors on unknown entity kind', () => {
		assert.equal(planReset(mockStore(), { entity: 'feature', id: 'F1' }).ok, false);
	});
});
