/* Composite evidence: authoritative row/cell mapping, visible navigation, expansion, selection, edit mode */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTreeGridEvent,
  createTreeGridModel,
  createTreeGridState,
} from '../../.verification-dist/internal/composites/tree-grid.js';
import {
  applyReferenceTreeGridEvent,
  createReferenceTreeGridState,
} from '../../.verification-dist/internal/reference/composites/tree-grid.js';
import { createGrid } from '../../.verification-dist/structures/grid.js';
import { createTree } from '../../.verification-dist/structures/tree.js';
import { createTreeGridModelFromRows } from '../../.verification-dist/tree-grid.js';
import { enumerateOrderedForests, powerset, unwrap } from '../support.mjs';

const EVENTS = [
  'left',
  'right',
  'up',
  'down',
  'expand',
  'collapse',
  'select',
  'start-edit',
  'commit-edit',
  'cancel-edit',
];

test('tree-grid row input constructs and validates its tree, grid, and mapping atomically', () => {
  const result = createTreeGridModelFromRows([
    { id: 'root', parentID: null, cells: ['root-name', 'root-status'] },
    { id: 'child', parentID: 'root', cells: ['child-name', null] },
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.rowIDs, ['root', 'child']);
  assert.equal(result.value.tree.parentOf('child'), 'root');
  assert.equal(result.value.grid.cellAt(1, 0), 'child-name');

  const invalid = createTreeGridModelFromRows([
    { id: 'child', parentID: 'missing', cells: ['child-name'] },
  ]);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'missing-parent');
});

test('tree-grid composition matches its independent reference across bounded row trees and cell grids', () => {
  let models = 0;
  let transitions = 0;
  for (let size = 0; size <= 3; size += 1) {
    for (const raw of enumerateOrderedForests(size)) {
      const tree = unwrap(createTree(stringTree(raw)));
      const rowIDs = tree.preorder().ids;
      for (let mask = 0; mask < 2 ** (size * 2); mask += 1) {
        const rows = rowIDs.map((_, row) => [0, 1].map((column) => {
          const index = row * 2 + column;
          return (mask & 2 ** index) === 0 ? null : `c${row}-${column}`;
        }));
        const grid = unwrap(createGrid(rows, { columnCount: 2 }));
        const model = unwrap(createTreeGridModel(tree, grid, rowIDs));
        const branches = rowIDs.filter((id) => tree.isLeaf(id) === false);
        for (const expanded of powerset(branches)) {
          const visibleRows = new Set(tree.visible(expanded).ids);
          const visibleCells = cells(model).filter((id) => visibleRows.has(model.rowOfCell(id)));
          for (const current of [null, ...visibleCells]) {
            const start = unwrap(createTreeGridState(model, { expanded, current }));
            const referenceStart = createReferenceTreeGridState(model, { expanded, current });
            assert.deepEqual(stateObservation(start), stateObservation(referenceStart));
            models += 1;
            for (const boundary of ['stop', 'wrap-axis']) {
              for (const eligible of [() => true, (id) => id.endsWith('-1')]) {
                const policies = { boundary, eligible };
                for (const event of EVENTS) {
                  const left = applyTreeGridEvent(model, start, event, policies);
                  const repeated = applyTreeGridEvent(model, start, event, policies);
                  const reference = applyReferenceTreeGridEvent(model, start, event, policies);
                  assert.deepEqual(observe(left), observe(repeated));
                  assert.deepEqual(observe(left), observeReference(reference));
                  assertState(model, left.ok ? left.value.state : start);
                  transitions += 1;
                }
              }
            }
            if (current !== null) {
              const editing = unwrap(createTreeGridState(model, {
                expanded,
                current,
                editMode: 'editing',
              }));
              for (const event of EVENTS) {
                const left = applyTreeGridEvent(model, editing, event);
                const reference = applyReferenceTreeGridEvent(model, editing, event);
                assert.deepEqual(observe(left), observeReference(reference));
                assertState(model, left.ok ? left.value.state : editing);
                transitions += 1;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(models, 5_881);
  assert.equal(transitions, 276_720);
});

test('tree-grid keeps expansion, cell movement, selection, and editing distinct', () => {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
    { id: 'leaf', parentID: 'child' },
  ]));
  const grid = unwrap(createGrid([
    ['root-name', 'root-value'],
    ['child-name', 'child-value'],
    ['leaf-name', 'leaf-value'],
  ]));
  const model = unwrap(createTreeGridModel(tree, grid, ['root', 'child', 'leaf']));
  const start = unwrap(createTreeGridState(model, { current: 'root-name' }));

  const opened = unwrap(applyTreeGridEvent(model, start, 'expand'));
  assert.deepEqual(opened.state.expansion.ids, ['root']);
  assert.equal(opened.state.cursor.current, 'root-name');

  const down = unwrap(applyTreeGridEvent(model, opened.state, 'down'));
  assert.equal(down.state.cursor.current, 'child-name');
  assert.deepEqual(down.commands, [{ type: 'focus', id: 'child-name' }]);

  const right = unwrap(applyTreeGridEvent(model, down.state, 'right'));
  assert.equal(right.state.cursor.current, 'child-value');
  const selected = unwrap(applyTreeGridEvent(model, right.state, 'select'));
  assert.deepEqual(selected.state.selection.selected, ['child-value']);

  const editing = unwrap(applyTreeGridEvent(model, selected.state, 'start-edit'));
  assert.equal(editing.state.editMode, 'editing');
  assert.deepEqual(editing.commands, [{ type: 'begin-edit', id: 'child-value' }]);
  assert.equal(applyTreeGridEvent(model, editing.state, 'left').error.code, 'tree-grid-edit-active');

  const committed = unwrap(applyTreeGridEvent(model, editing.state, 'commit-edit'));
  assert.equal(committed.state.editMode, 'navigation');
  assert.deepEqual(committed.commands, [{ type: 'commit-edit', id: 'child-value' }]);
});

test('tree-grid validates mapping and rejects malformed state atomically', () => {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
  ]));
  const grid = unwrap(createGrid([
    ['a', 'b'],
    ['c', 'd'],
  ]));
  assert.equal(
    createTreeGridModel(tree, grid, ['root']).error.code,
    'tree-grid-row-count-mismatch',
  );
  assert.equal(
    createTreeGridModel(tree, grid, ['root', 'root']).error.code,
    'duplicate-tree-grid-row',
  );
  assert.equal(
    createTreeGridModel(tree, grid, ['root', 'missing']).error.code,
    'tree-grid-row-outside-tree',
  );

  const reversed = unwrap(createTreeGridModel(tree, grid, ['child', 'root']));
  assert.equal(reversed.rowOfCell('a'), 'child');
  assert.equal(reversed.rowIndexOf('root'), 1);

  const model = unwrap(createTreeGridModel(tree, grid, ['root', 'child']));
  assert.equal(createTreeGridState(model, { current: 'c' }).error.code, 'tree-grid-cursor-hidden');
  assert.equal(
    createTreeGridState(model, { editMode: 'editing' }).error.code,
    'tree-grid-edit-without-cursor',
  );
  const start = unwrap(createTreeGridState(model));
  assert.equal(applyTreeGridEvent(model, start, 'select').error.code, 'no-cursor');
  assert.equal(applyTreeGridEvent(model, start, 'commit-edit').error.code, 'tree-grid-not-editing');
  assert.equal(applyTreeGridEvent(model, start, 'unknown').error.code, 'invalid-tree-grid-event');
  assert.equal(
    applyTreeGridEvent(model, start, 'right', { boundary: 'wrap' }).error.code,
    'invalid-tree-grid-boundary',
  );

  const current = unwrap(createTreeGridState(model, { current: 'a' }));
  const ceiling = applyTreeGridEvent(model, current, 'down', { maxScan: 0 });
  assert.equal(ceiling.ok, false);
  assert.equal(ceiling.error.class, 'resource-rejection');
  assert.equal(ceiling.error.code, 'scan-ceiling-reached');

  const hidden = Object.freeze({
    ...start,
    cursor: Object.freeze({ current: 'c' }),
  });
  const rejected = applyTreeGridEvent(model, hidden, 'down');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'tree-grid-cursor-hidden');
  assert.equal(hidden.cursor.current, 'c');
});

function stringTree(nodes) {
  return nodes.map(({ id, parentID }) => ({
    id: `r${id}`,
    parentID: parentID === null ? null : `r${parentID}`,
  }));
}

function cells(model) {
  const result = [];
  for (let row = 0; row < model.grid.rowCount; row += 1) {
    for (let column = 0; column < model.grid.columnCount; column += 1) {
      const id = model.grid.cellAt(row, column);
      if (id !== null) result.push(id);
    }
  }
  return result;
}

function assertState(model, state) {
  const visibleRows = new Set(model.tree.visible(state.expansion).ids);
  assert.equal(
    state.cursor.current === null || visibleRows.has(model.rowOfCell(state.cursor.current)),
    true,
  );
  assert.equal(state.selection.selected.length <= 1, true);
  assert.equal(state.selection.selected.every((id) => model.grid.positionOf(id) !== null), true);
  assert.equal(state.editMode !== 'editing' || state.cursor.current !== null, true);
}

function stateObservation(state) {
  return {
    expanded: state.expansion.ids,
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
    editMode: state.editMode,
  };
}

function observe(result) {
  return result.ok
    ? { ok: true, ...stateObservation(result.value.state), commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReference(result) {
  return result.ok
    ? { ok: true, ...stateObservation(result.value.state), commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
