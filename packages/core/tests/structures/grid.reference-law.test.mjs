/* Law evidence: GRD-01 GRD-02 GRD-03 GRD-04 GRD-05 GRD-06 GRD-07 GRD-08 GRD-09 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrid, tryCreateGrid } from '../../.verification-dist/structures/grid.js';
import { tryApplySequencePatch } from '../../.verification-dist/structures/sequence.js';
import { ReferenceGrid } from '../../.verification-dist/internal/reference/structures/grid.js';
import { canonicalIDs, powerset, unwrap } from '../support.mjs';

function canonicalGrid(rows, columns, mask) {
  let next = 0;
  const cells = [];
  for (let index = 0; index < rows * columns; index += 1) {
    cells.push((mask & 2 ** index) !== 0 ? `i${next++}` : null);
  }
  return new ReferenceGrid(rows, columns, cells);
}

test('GRD-01..04: reference grid preserves coordinate inverse and ordered row/column projections', () => {
  let models = 0;
  let inverseCases = 0;
  let projectionCases = 0;
  for (let rows = 0; rows <= 3; rows += 1) {
    for (let columns = 0; columns <= 3; columns += 1) {
      const total = 2 ** (rows * columns);
      for (let mask = 0; mask < total; mask += 1) {
        const model = canonicalGrid(rows, columns, mask);
        models += 1;
        for (let row = 0; row < rows; row += 1) {
          const expected = [];
          for (let column = 0; column < columns; column += 1) {
            const id = model.cellAt(row, column);
            if (id !== null) expected.push(id);
          }
          assert.deepEqual(model.row(row).ids, expected);
          projectionCases += 1;
        }
        for (let column = 0; column < columns; column += 1) {
          const expected = [];
          for (let row = 0; row < rows; row += 1) {
            const id = model.cellAt(row, column);
            if (id !== null) expected.push(id);
          }
          assert.deepEqual(model.column(column).ids, expected);
          projectionCases += 1;
        }
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const id = model.cellAt(row, column);
            if (id !== null) {
              assert.deepEqual(model.positionOf(id), { row, column });
              assert.equal(model.cellAt(model.positionOf(id).row, model.positionOf(id).column), id);
              inverseCases += 1;
            }
          }
        }
      }
    }
  }
  assert.equal(models, 689);
  assert.equal(inverseCases, 2_753);
  assert.equal(projectionCases, 3_880);
});

test('GRD-05..07: movement is axis-only, nearest, eligible, and boundary-explicit', () => {
  let cases = 0;
  for (let rows = 0; rows <= 3; rows += 1) {
    for (let columns = 0; columns <= 3; columns += 1) {
      for (let mask = 0; mask < 2 ** (rows * columns); mask += 1) {
        const model = canonicalGrid(rows, columns, mask);
        const ids = [];
        for (let index = 0; index < model.size; index += 1) ids.push(`i${index}`);
        const eligibilities = ids.length <= 6 ? [...powerset(ids)] : [ids];
        for (const eligibleIDs of eligibilities) {
          const eligible = new Set(eligibleIDs);
          for (const current of ids) {
            for (const direction of ['left', 'right', 'up', 'down']) {
              for (const boundary of ['stop', 'wrap-axis']) {
                const result = model.move(current, direction, boundary, {
                  eligible: (id) => eligible.has(id),
                });
                if (result.kind === 'found') {
                  assert.equal(eligible.has(result.id), true);
                  const a = model.positionOf(current);
                  const b = model.positionOf(result.id);
                  if (direction === 'left' || direction === 'right') assert.equal(a.row, b.row);
                  else assert.equal(a.column, b.column);
                }
                cases += 1;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(cases, 554_536);
});

test('GRD-08: geometry is not consulted and directional relations do not define coordinates', () => {
  const compact = new ReferenceGrid(1, 2, ['a', 'b']);
  const gapped = new ReferenceGrid(1, 3, ['a', null, 'b']);
  assert.equal(compact.move('a', 'right').id, 'b');
  assert.equal(gapped.move('a', 'right').id, 'b');
  assert.equal(compact.cellAt(0, 1), 'b');
  assert.equal(gapped.cellAt(0, 1), null);
  assert.equal(gapped.cellAt(0, 2), 'b');
});

test('GRD-09: identity renaming preserves every coordinate observation', () => {
  const source = new ReferenceGrid(2, 3, ['a', null, 'b', 'c', 'd', null]);
  const target = new ReferenceGrid(2, 3, ['α', null, 'β', 'γ', 'δ', null]);
  const map = new Map([['a', 'α'], ['b', 'β'], ['c', 'γ'], ['d', 'δ']]);
  for (const [id, renamed] of map) assert.deepEqual(target.positionOf(renamed), source.positionOf(id));
});

test('grid construction normalizes ragged rows and rejects invalid occupancy', () => {
  const grid = createGrid([['a', null, 'b'], ['c']], { columnCount: 4 });
  assert.equal(grid.rowCount, 2);
  assert.equal(grid.columnCount, 4);
  assert.equal(grid.cellAt(1, 1), null);
  assert.equal(grid.row(-1), null);
  assert.equal(grid.column(4), null);
  assert.deepEqual(grid.domain().ids, ['a', 'b', 'c']);
  assert.equal(grid.domain(), grid.domain());
  assert.equal(grid.row(0), grid.row(0));
  assert.equal(grid.column(0), grid.column(0));
  assert.equal(tryCreateGrid([['a'], ['a']]).error.code, 'duplicate-id');
  assert.equal(tryCreateGrid([], { maxIDCodeUnits: 0 }).error.code, 'invalid-max-id-code-units');
  assert.equal(tryCreateGrid([['a', 'b']], { columnCount: 1 }).error.code, 'column-count-too-small');
  assert.equal(tryCreateGrid([['a']], { columnCount: 2, maxCells: 1 }).error.code, 'cell-ceiling-exceeded');
  const rejected = grid.move('a', 'right', 'stop', { eligible: () => false, maxScan: 1 });
  assert.equal(rejected.kind, 'resource-rejected');
});

test('ISSUE-183: grid construction consumes only captured row and column prefixes', () => {
  let innerReads = 0;
  const growingRow = [];
  Object.defineProperty(growingRow, 0, {
    enumerable: true,
    configurable: true,
    get() {
      innerReads += 1;
      if (growingRow.length === 1) growingRow.push('cell-1');
      return 'cell-0';
    },
  });
  const inner = tryCreateGrid([growingRow], {
    maxRows: 1, maxColumns: 1, maxCells: 1, maxItems: 2,
  });
  assert.equal(inner.ok, true);
  assert.equal(innerReads, 1);
  assert.equal(growingRow.length, 2);
  assert.equal(inner.value.rowCount, 1);
  assert.equal(inner.value.columnCount, 1);
  assert.equal(inner.value.size, 1);
  assert.deepEqual(inner.value.domain().ids, ['cell-0']);
  assert.equal(inner.value.positionOf('cell-1'), null);

  let outerReads = 0;
  const growingRows = [];
  Object.defineProperty(growingRows, 0, {
    enumerable: true,
    configurable: true,
    get() {
      outerReads += 1;
      if (growingRows.length === 1) growingRows.push(['row-1']);
      return ['row-0'];
    },
  });
  const outer = tryCreateGrid(growingRows, {
    maxRows: 1, maxColumns: 1, maxCells: 1, maxItems: 2,
  });
  assert.equal(outer.ok, true);
  assert.equal(outerReads, 1);
  assert.equal(growingRows.length, 2);
  assert.equal(outer.value.rowCount, 1);
  assert.equal(outer.value.size, 1);
  assert.deepEqual(outer.value.domain().ids, ['row-0']);
  assert.equal(outer.value.positionOf('row-1'), null);

  for (const grid of [inner.value, outer.value]) {
    for (const id of grid.domain().ids) {
      const position = grid.positionOf(id);
      assert.ok(position.row >= 0 && position.row < grid.rowCount);
      assert.ok(position.column >= 0 && position.column < grid.columnCount);
      assert.equal(grid.cellAt(position.row, position.column), id);
    }
  }

  let overRowReads = 0;
  const overRows = [];
  for (const [index, id] of ['a', 'b'].entries()) {
    Object.defineProperty(overRows, index, {
      enumerable: true,
      configurable: true,
      get() {
        overRowReads += 1;
        return [id];
      },
    });
  }
  const rejectedRows = tryCreateGrid(overRows, {
    maxRows: 1, maxColumns: 1, maxCells: 2, maxItems: 2,
  });
  assert.equal(rejectedRows.ok, false);
  assert.equal(rejectedRows.error.code, 'row-ceiling-exceeded');
  assert.equal(overRowReads, 0);

  let overColumnReads = 0;
  const overColumns = [];
  for (const [index, id] of ['a', 'b'].entries()) {
    Object.defineProperty(overColumns, index, {
      enumerable: true,
      configurable: true,
      get() {
        overColumnReads += 1;
        return id;
      },
    });
  }
  const rejectedColumns = tryCreateGrid([overColumns], {
    maxRows: 1, maxColumns: 1, maxCells: 2, maxItems: 2,
  });
  assert.equal(rejectedColumns.ok, false);
  assert.equal(rejectedColumns.error.code, 'column-ceiling-exceeded');
  assert.equal(overColumnReads, 0);
});

test('grid sequences preserve raised item ceilings in wide and tall domains', () => {
  const count = 100_001;
  const ids = Array.from({ length: count }, (_, id) => id);
  for (const tall of [false, true]) {
    const grid = createGrid(tall ? ids.map((id) => [id]) : [ids], {
      maxItems: count, maxCells: count, maxRows: count, maxColumns: count,
    });
    for (const view of [grid.domain(), grid.row(0), grid.column(0), grid.row(grid.rowCount - 1), grid.column(grid.columnCount - 1)]) {
      assertGridSequenceLimits(view, count, 1_024);
    }
    assert.equal((tall ? grid.column(0) : grid.row(0)).size, count);
    assert.equal(grid.domain(), grid.domain());
    assert.equal(grid.row(0), grid.row(0));
    assert.equal(grid.column(0), grid.column(0));
    const domain = grid.domain();
    const rejected = tryApplySequencePatch(domain, { type: 'splice', index: count, deleteCount: 0, inserted: ['extra'] });
    assert.equal(rejected.error.code, 'item-ceiling-exceeded');
  }
});

test('grid sequences snapshot custom ID limits for ragged and empty projections', () => {
  const id = '😀'.repeat(750);
  const options = { maxItems: 2, maxIDCodeUnits: 2_000 };
  const grid = createGrid([[id, null], ['a', null], []], options);
  options.maxItems = 0;
  options.maxIDCodeUnits = 1;
  for (const view of [grid.domain(), grid.row(0), grid.row(1), grid.row(2), grid.column(0), grid.column(1)]) {
    assertGridSequenceLimits(view, 2, 2_000);
    const projected = view.project(() => true);
    assertGridSequenceLimits(projected, 2, 2_000);
    assert.deepEqual(projected.ids, view.ids);
    if (view.contains(id)) {
      const replaced = unwrap(tryApplySequencePatch(view, { type: 'splice', index: view.indexOf(id), deleteCount: 1, inserted: [id] }));
      assertGridSequenceLimits(replaced, 2, 2_000);
      assert.deepEqual(replaced.ids, view.ids);
    }
  }
  assert.equal(grid.row(2).size, 0);
  assert.equal(grid.column(1).size, 0);
  const empty = grid.domain().project(() => false);
  assert.equal(tryApplySequencePatch(empty, { type: 'splice', index: 0, deleteCount: 0, inserted: ['x'.repeat(2_001)] }).error.code, 'id-code-unit-ceiling-exceeded');
});

test('grid empty and small views retain their configured limits and unchanged defaults', () => {
  for (const options of [{ maxItems: 0, maxIDCodeUnits: 1 }, { maxItems: 1, maxIDCodeUnits: 3 }, {}]) {
    const grid = createGrid(options.maxItems === 0 ? [[null]] : [['a']], options);
    for (const view of [grid.domain(), grid.row(0), grid.column(0)]) {
      assertGridSequenceLimits(view, options.maxItems ?? 100_000, options.maxIDCodeUnits ?? 1_024);
    }
  }
});

function assertGridSequenceLimits(view, maxItems, maxIDCodeUnits) {
  assert.equal(view.maxItems, maxItems);
  assert.equal(view.maxIDCodeUnits, maxIDCodeUnits);
  assert.ok(view.size <= view.maxItems);
  const result = tryApplySequencePatch(view, { type: 'splice', index: view.size, deleteCount: 0, inserted: [] });
  assert.equal(result.ok, true);
  assert.equal(result.value, view, 'a no-op patch preserves the valid derived view');
}
