import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDataGridVirtualAdapter,
  createDataTableVirtualAdapter,
  createDataTreeGridVirtualAdapter,
  reconcileDataGridVirtualAdapter,
  reconcileDataTableVirtualAdapter,
  tryCreateDataGridVirtualAdapter,
  tryCreateDataTableVirtualAdapter,
} from '../../.verification-dist/virtual.js';

const exact = (value) => ({ kind: 'exact', value });
const estimated = (value) => ({ kind: 'estimated', value });
const row = (id) => ({ kind: 'leaf', id, cells: { name: id, score: id.length } });

function tableProjection(ids, generation = 1) {
  return { generation, rows: ids.map(row), columns: { start: [], center: ['name', 'score'], end: [] }, rowSelection: { kind: 'explicit-rows', rowIDs: [] }, expansion: [] };
}

function gridProjection(ids, columns = { start: [], center: ['name', 'score'], end: [] }, generation = 1) {
  return {
    generation,
    rows: ids.map((id) => ({ row: row(id), rowID: id, parentRowID: null, depth: 0, cells: [...columns.start, ...columns.center, ...columns.end].map((columnID) => ({ rowID: id, columnID })) })),
    columns,
    cursor: { current: null },
    edit: { kind: 'navigation' },
    rowSelection: { kind: 'explicit-rows', rowIDs: [] },
    expansion: { expandedRowIDs: [] },
  };
}

test('TAB-VIR-01: DataTable reconciliation preserves measured stable identities across insert remove and reorder', () => {
  const adapter = createDataTableVirtualAdapter({ projection: tableProjection(['r1', 'r2']), rowExtents: { kind: 'uniform', extent: estimated(24) } });
  const plan = adapter.strategy.tryQuery(adapter.state, { viewport: { x: 0, y: 0, width: 320, height: 24 } });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.value.placements.map(({ id }) => id), ['r1']);
  const measured = adapter.strategy.tryMeasure(adapter.state, { generation: adapter.state.generation, measurements: [{ index: 0, extent: exact(41) }], anchor: null });
  assert.equal(measured.ok, true);
  const reconciled = reconcileDataTableVirtualAdapter(adapter, measured.value.state, tableProjection(['r3', 'r1'], 9));
  assert.equal(reconciled.ok, true);
  assert.equal(reconciled.value.expectedVirtualGeneration, measured.value.state.generation);
  assert.equal(reconciled.value.projectionGeneration, 9);
  assert.deepEqual(reconciled.value.state.domain.ids, ['r3', 'r1']);
  assert.deepEqual(reconciled.value.state.extents.extentAt(1), exact(41));
  assert.deepEqual(reconciled.value.adapter.locateRow('r1'), { id: 'r1', index: 1 });
});

test('TAB-VIR-02: reconciliation rejects stale unrelated Virtual state without conflating projection generation', () => {
  const adapter = createDataTableVirtualAdapter({ projection: tableProjection(['r1']), rowExtents: { kind: 'uniform', extent: exact(20) } });
  const first = reconcileDataTableVirtualAdapter(adapter, adapter.state, tableProjection(['r1', 'r2'], 50));
  assert.equal(first.ok, true);
  const stale = reconcileDataTableVirtualAdapter(first.value.adapter, adapter.state, tableProjection(['r1'], 51));
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'virtual-generation-mismatch');
  assert.equal(first.value.projectionGeneration, 50);
  assert.notEqual(first.value.expectedVirtualGeneration, first.value.projectionGeneration);
});

test('TAB-VIR-03: partitioned Grid adapter survives measurement and center to pinned mutation without strategy replacement', () => {
  const adapter = createDataGridVirtualAdapter({
    projection: gridProjection(['r1', 'r2']),
    rowExtents: { kind: 'uniform', extent: estimated(28) },
    columnExtents: { kind: 'by-id', getExtent: (id) => estimated(id === 'name' ? 120 : 80) },
  });
  const measured = adapter.strategy.tryMeasure(adapter.state, {
    generation: adapter.state.generation,
    measurements: [{ axis: 'row', id: 'r1', extent: exact(37) }, { axis: 'column', id: 'name', extent: exact(144) }],
    anchor: null,
  });
  assert.equal(measured.ok, true);
  const nextProjection = gridProjection(['r2', 'r1', 'r3'], { start: ['name'], center: [], end: ['score'] }, 7);
  const reconciled = reconcileDataGridVirtualAdapter(adapter, measured.value.state, nextProjection);
  assert.equal(reconciled.ok, true);
  assert.equal(reconciled.value.adapter.strategy, adapter.strategy);
  assert.equal(reconciled.value.state.rows.toArray().find((track) => track.id === 'r1').extent.value, 37);
  assert.equal(reconciled.value.state.columns.toArray().find((track) => track.id === 'name').extent.value, 144);
  assert.equal(reconciled.value.state.columns.toArray().find((track) => track.id === 'name').partition, 'start');
  assert.deepEqual(reconciled.value.adapter.locateColumn('score'), { id: 'score', index: 1 });
  assert.equal(reconciled.value.adapter.locateCell({ rowID: 'r3', columnID: 'score' }).index >= 0, true);

  const pivotProjection = gridProjection(['r1'], { start: [], center: ['name', 'pivot:sum'], end: [] }, 8);
  const pivoted = reconcileDataGridVirtualAdapter(reconciled.value.adapter, reconciled.value.state, pivotProjection);
  assert.equal(pivoted.ok, true);
  assert.deepEqual(pivoted.value.state.rows.toArray().map((track) => track.id), ['r1']);
  assert.deepEqual(pivoted.value.state.columns.toArray().map((track) => track.id), ['name', 'pivot:sum']);
  assert.equal(pivoted.value.state.columns.toArray().find((track) => track.id === 'name').extent.value, 144);
  assert.equal(pivoted.value.adapter.locateCell({ rowID: 'r3', columnID: 'score' }), null);

  const tree = createDataTreeGridVirtualAdapter({
    projection: gridProjection(['r1'], { start: [], center: ['name'], end: [] }, 9),
    rowExtents: { kind: 'uniform', extent: estimated(28) },
    columnExtents: { kind: 'uniform', extent: estimated(120) },
  });
  assert.deepEqual(tree.locateCell({ rowID: 'r1', columnID: 'name' }), { id: 'c1:2:r14:name', index: 0 });
});

test('TAB-VIR-04: partition and projected-cell ceilings remain distinct', () => {
  const projection = gridProjection(['r1'], { start: ['name'], center: ['score'], end: [] });
  const partition = tryCreateDataGridVirtualAdapter({
    projection,
    rowExtents: { kind: 'uniform', extent: exact(20) },
    columnExtents: { kind: 'uniform', extent: exact(80) },
    limits: { maxPartitions: 1 },
  });
  assert.equal(partition.ok, false);
  assert.equal(partition.error.code, 'partition-ceiling-exceeded');
  const cells = tryCreateDataGridVirtualAdapter({
    projection,
    rowExtents: { kind: 'uniform', extent: exact(20) },
    columnExtents: { kind: 'uniform', extent: exact(80) },
    limits: { maxProjectedCells: 1 },
  });
  assert.equal(cells.ok, false);
  assert.equal(cells.error.code, 'projected-cell-ceiling-exceeded');
});

test('TAB-VIR-05: by-id extent callbacks fail through a typed coordinate boundary', () => {
  const rows = tryCreateDataTableVirtualAdapter({
    projection: tableProjection(['r1']),
    rowExtents: { kind: 'by-id', getExtent: () => { throw new Error('row failed'); } },
  });
  assert.equal(rows.ok, false);
  assert.equal(rows.error.code, 'extent-policy-failed');
  assert.deepEqual(rows.error.details, { axis: 'row', id: 'r1', index: 0, message: 'row failed' });

  const columns = tryCreateDataGridVirtualAdapter({
    projection: gridProjection(['r1']),
    rowExtents: { kind: 'uniform', extent: exact(20) },
    columnExtents: { kind: 'by-id', getExtent: (id, index) => {
      if (id === 'score') throw new Error('column failed');
      return exact(80 + index);
    } },
  });
  assert.equal(columns.ok, false);
  assert.equal(columns.error.code, 'extent-policy-failed');
  assert.deepEqual(columns.error.details, { axis: 'column', id: 'score', index: 1, message: 'column failed' });
});

test('TAB-VIR-06: sparse repair is bounded and bulk replacement reuses stable measurements', () => {
  const ids = Array.from({ length: 128 }, (_, index) => `r${index}`);
  let extentCalls = 0;
  const adapter = createDataTableVirtualAdapter({
    projection: tableProjection(ids),
    rowExtents: { kind: 'by-id', getExtent: (_id, index) => { extentCalls += 1; return estimated(20 + index); } },
  });
  const measured = adapter.strategy.tryMeasure(adapter.state, {
    generation: adapter.state.generation,
    measurements: [{ index: 64, extent: exact(77) }],
    anchor: null,
  });
  assert.equal(measured.ok, true);

  const sparse = reconcileDataTableVirtualAdapter(adapter, measured.value.state, tableProjection(['r0', 'new-sparse', ...ids.slice(1)], 2));
  assert.equal(sparse.ok, true);
  assert.equal(sparse.value.mutations.length, 1);
  assert.equal(extentCalls, 129);

  const rotatedIDs = [...ids.slice(31), ...ids.slice(0, 31)];
  const rotated = reconcileDataTableVirtualAdapter(adapter, measured.value.state, tableProjection(rotatedIDs, 3));
  assert.equal(rotated.ok, true);
  assert.equal(rotated.value.mutations.length, 1);
  assert.equal(rotated.value.mutations[0].patch.type, 'move');

  const target = ['new-bulk-a', ...ids.slice(4).reverse(), 'new-bulk-b'];
  const bulk = reconcileDataTableVirtualAdapter(adapter, measured.value.state, tableProjection(target, 4));
  assert.equal(bulk.ok, true);
  assert.equal(bulk.value.mutations.length, 1);
  assert.deepEqual(bulk.value.mutations[0].patch, { type: 'splice', index: 0, deleteCount: 128, inserted: target });
  assert.equal(extentCalls, 131);
  assert.deepEqual(bulk.value.state.extents.extentAt(target.indexOf('r64')), exact(77));
});

test('TAB-VIR-07: table and grid locators reuse production indexes without array scans or cell maps', () => {
  const ids = Array.from({ length: 256 }, (_, index) => `r${index}`);
  const table = createDataTableVirtualAdapter({ projection: tableProjection(ids), rowExtents: { kind: 'uniform', extent: exact(20) } });
  const grid = createDataGridVirtualAdapter({
    projection: gridProjection(ids),
    rowExtents: { kind: 'uniform', extent: exact(20) },
    columnExtents: { kind: 'uniform', extent: exact(80) },
  });
  const originalIndexOf = Array.prototype.indexOf;
  let scans = 0;
  Array.prototype.indexOf = function (...args) { scans += 1; return originalIndexOf.apply(this, args); };
  try {
    for (let index = 0; index < 100; index += 1) {
      assert.deepEqual(table.locateRow('r255'), { id: 'r255', index: 255 });
      assert.deepEqual(grid.locateRow('r255'), { id: 'r255', index: 255 });
      assert.deepEqual(grid.locateColumn('score'), { id: 'score', index: 1 });
      assert.deepEqual(grid.locateCell({ rowID: 'r255', columnID: 'score' }), { id: 'c1:4:r2555:score', index: 511 });
    }
  } finally {
    Array.prototype.indexOf = originalIndexOf;
  }
  assert.equal(scans, 0);
});
