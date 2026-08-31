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

test('disposed DataTreeGrid rejects mutation and reconnection without state changes', () => {
  const controller = createDataTreeGrid({ columns });
  const before = controller.getSnapshot();
  controller.dispose();
  controller.dispose();

  const failures = [
    controller.dispatch({ type: 'request-view' }),
    controller.synchronizeView({}),
    controller.syncControlledValues({}),
    controller.requestView(),
    controller.abandonRequest(1),
    controller.attachRequestExecutor(() => assert.fail('disposed executor attached')),
  ];
  for (const result of failures) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'controller-disposed');
    assert.equal(controller.getSnapshot(), before);
  }
});

test('controlled DataTreeGrid callback synchronization preserves the latest shared-base revision', () => {
  const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
  const next = { ...query, sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }] };
  let controller;
  controller = createDataTreeGrid({
    columns,
    controlled: { query: true },
    initialValues: { query },
    onQueryChange(value) {
      assert.equal(controller.syncControlledValues({ query: value }).ok, true);
    },
  });
  const requests = [];
  controller.subscribeCommands((command) => {
    if (command.type === 'request-view') requests.push(command.request);
  });

  const outer = controller.dispatch({ type: 'set-query', query: next });
  assert.equal(outer.ok, true);
  assert.deepEqual(controller.getSnapshot().tabular.state.query, next);
  assert.notEqual(controller.getSnapshot().tabular.state.query, next);
  assert.equal(controller.getSnapshot().revision, 1);
  assert.equal(controller.getSnapshot().tabular.revision, 2);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].requestID, controller.getSnapshot().tabular.state.requestState.pendingRequest.requestID);
});

test('TAB-TGR-05: controlled tree-grid owner synchronizes null cursor and navigation edit state', () => {
  const controller = createDataTreeGrid({
    columns,
    controlled: { cursor: true, edit: true },
    initialValues: { cursor: { current: null }, edit: { kind: 'navigation' } },
  });
  assert.equal(controller.synchronizeView(response(controller, rows)).ok, true);
  const cell = { rowID: 'r1', columnID: 'name' };
  assert.equal(controller.syncControlledValues({ cursor: { current: cell }, edit: { kind: 'editing', cell } }).ok, true);
  assert.deepEqual(controller.getSnapshot().edit, { kind: 'editing', cell });
  assert.equal(controller.syncControlledValues({ cursor: { current: null }, edit: { kind: 'navigation' } }).ok, true);
  assert.equal(controller.getSnapshot().cursor.current, null);
  assert.deepEqual(controller.getSnapshot().edit, { kind: 'navigation' });
});
