import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataTreeGrid } from '../../.verification-dist/data-tree-grid.js';

const columns = [
  { id: 'name', capabilities: ['edit'] },
  { id: 'score', capabilities: [] },
];

function response(controller, rows, overrides = {}) {
  const request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
  assert.notEqual(request, null);
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: overrides.viewRevision ?? 1,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: rows.filter((row) => row.kind === 'leaf').length },
    visibleRowCount: { kind: 'known', value: rows.length },
    rows,
    columnSchema: { revision: 0, columns, headers: [] },
    removedRowIDs: [],
    ...overrides,
  };
}

const rows = [
  { kind: 'group', id: 'group:a', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'A', score: 3 } },
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
  { kind: 'leaf', id: 'r2', cells: { name: 'Beta', score: 2 } },
];

test('TAB-TGR-01: tree projection derives ordered parentage and navigates visible cells', () => {
  const controller = createDataTreeGrid({ columns });
  assert.equal(controller.synchronizeView(response(controller, rows)).ok, true);
  assert.deepEqual(controller.getProjection().rows.map(({ rowID, parentRowID, depth }) => [rowID, parentRowID, depth]), [
    ['group:a', null, 0],
    ['r1', 'group:a', 1],
    ['r2', 'group:a', 1],
  ]);
  controller.dispatch({ type: 'focus-cell', cell: { rowID: 'group:a', columnID: 'name' } });
  controller.dispatch({ type: 'move-cell', direction: 'down' });
  assert.deepEqual(controller.getSnapshot().cursor.current, { rowID: 'r1', columnID: 'name' });
});

test('TAB-TGR-02: group cells are read-only while leaf edit commands keep exact payloads', () => {
  const controller = createDataTreeGrid({ columns });
  assert.equal(controller.synchronizeView(response(controller, rows)).ok, true);
  controller.dispatch({ type: 'focus-cell', cell: { rowID: 'group:a', columnID: 'name' } });
  assert.equal(controller.dispatch({ type: 'begin-edit' }).error.code, 'invalid-edit-target');

  const cell = { rowID: 'r1', columnID: 'name' };
  const begun = controller.dispatch({ type: 'begin-edit', cell });
  assert.deepEqual(begun.value.commands, [{ type: 'begin-edit', cell }]);
  const canceled = controller.dispatch({ type: 'cancel-edit', reason: 'escape' });
  assert.deepEqual(canceled.value.commands, [{ type: 'cancel-edit', cell, reason: 'escape' }]);
});

test('TAB-TGR-03: row expansion is source intent and malformed ancestry rejects atomically', () => {
  const controller = createDataTreeGrid({ columns });
  assert.equal(controller.synchronizeView(response(controller, rows)).ok, true);
  const expanded = controller.dispatch({ type: 'set-row-expanded', rowID: 'group:a', open: true });
  assert.equal(expanded.ok, true);
  assert.equal(expanded.value.commands.at(-1).type, 'request-view');
  assert.deepEqual(expanded.value.snapshot.tabular.state.expansion, ['group:a']);

  const malformedController = createDataTreeGrid({ columns });
  const malformed = [{
    kind: 'group', id: 'child', parentGroupID: 'missing', depth: 1, expanded: false,
    cells: { name: 'Child', score: 0 },
  }];
  const before = malformedController.getSnapshot();
  const rejected = malformedController.synchronizeView(response(malformedController, malformed));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'profile-view-mismatch');
  assert.equal(malformedController.getSnapshot(), before);
});

test('TAB-TGR-04: tree profile emits no renderer reveal commands', () => {
  const controller = createDataTreeGrid({ columns });
  const observed = [];
  controller.subscribeCommands((command) => observed.push(command));
  assert.equal(controller.synchronizeView(response(controller, rows)).ok, true);
  controller.dispatch({ type: 'focus-cell', cell: { rowID: 'r1', columnID: 'name' } });
  controller.dispatch({ type: 'begin-edit' });
  assert.equal(observed.some(({ type }) => type.includes('reveal')), false);
});
