/* Law evidence: GRD-01 GRD-02 GRD-03 GRD-04 GRD-05 GRD-06 GRD-07 GRD-08 GRD-09 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrid } from '../../.verification-dist/structures/grid.js';
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
  const grid = unwrap(createGrid([['a', null, 'b'], ['c']], { columnCount: 4 }));
  assert.equal(grid.rowCount, 2);
  assert.equal(grid.columnCount, 4);
  assert.equal(grid.cellAt(1, 1), null);
  assert.equal(grid.row(-1), null);
  assert.equal(grid.column(4), null);
  assert.equal(createGrid([['a'], ['a']]).error.code, 'duplicate-id');
  assert.equal(createGrid([], { maxIDCodeUnits: 0 }).error.code, 'invalid-max-id-code-units');
  assert.equal(createGrid([['a', 'b']], { columnCount: 1 }).error.code, 'column-count-too-small');
  assert.equal(createGrid([['a']], { columnCount: 2, maxCells: 1 }).error.code, 'cell-ceiling-exceeded');
  const rejected = grid.move('a', 'right', 'stop', { eligible: () => false, maxScan: 1 });
  assert.equal(rejected.kind, 'resource-rejected');
});
