import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { createGrid } from '../../.verification-dist/structures/grid.js';
import { createTree } from '../../.verification-dist/structures/tree.js';
import { applyListboxEvent, createListboxState } from '../../.verification-dist/listbox.js';
import { applyGridEvent, createGridState } from '../../.verification-dist/grid-control.js';
import { applyTreeViewEvent, createTreeViewState } from '../../.verification-dist/tree-view.js';
import { applyMenuEvent, createMenuState } from '../../.verification-dist/menu.js';
import { applyTreeGridEvent, createTreeGridModel, createTreeGridState } from '../../.verification-dist/tree-grid.js';

test('canonical provenance skips validation and is bound to the exact domain owner', () => {
  const first = counted(createSequence(['a', 'b', 'c']));
  const state = createListboxState(first.value, { current: 'a', selected: ['a'] });
  first.reset();
  assert.equal(applyListboxEvent(first.value, state, 'next').ok, true);
  assert.equal(first.calls.contains ?? 0, 0);
  assert.equal(first.calls.indexOf ?? 0, 0);
  assert.equal(first.calls.ids ?? 0, 0);

  const external = Object.freeze({ ...state });
  assert.equal(applyListboxEvent(first.value, external, 'next').ok, true);
  assert.ok((first.calls.contains ?? 0) + (first.calls.indexOf ?? 0) + (first.calls.ids ?? 0) > 0);

  const second = counted(createSequence(['a', 'b', 'c']));
  assert.equal(applyListboxEvent(second.value, state, 'next').ok, true);
  assert.ok((second.calls.contains ?? 0) + (second.calls.indexOf ?? 0) + (second.calls.ids ?? 0) > 0);
});

test('canonical grid and tree derivations are retained by immutable owner identity', () => {
  const grid = counted(createGrid([['a', 'b'], ['c', 'd']]));
  const gridState = createGridState(grid.value, { current: 'a', selected: ['a'] });
  const cellReads = grid.calls.cellAt ?? 0;
  assert.equal(applyGridEvent(grid.value, gridState, 'right').ok, true);
  assert.equal(grid.calls.cellAt ?? 0, cellReads);

  const tree = counted(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
    { id: 'second', parentID: null },
  ]));
  const treeState = createTreeViewState(tree.value, { expanded: ['root'], current: 'root' });
  const visibleReads = tree.calls.visible ?? 0;
  assert.equal(applyTreeViewEvent(tree.value, treeState, 'next').ok, true);
  assert.equal(tree.calls.visible ?? 0, visibleReads);
  assert.equal(applyTreeViewEvent(tree.value, Object.freeze({ ...treeState }), 'next').ok, true);
  assert.ok((tree.calls.visible ?? 0) > visibleReads);

  const hiddenBranch = createTreeViewState(tree.value, { expanded: [], current: 'root' });
  const hiddenExpansion = applyTreeViewEvent(tree.value, hiddenBranch, { type: 'set-expanded', id: 'child', open: true });
  assert.equal(hiddenExpansion.ok, false);
  assert.equal(hiddenExpansion.error.code, 'tree-view-target-hidden');

  const menuState = createMenuState(tree.value, true, 'root');
  const menuVisibleReads = tree.calls.visible ?? 0;
  assert.equal(applyMenuEvent(tree.value, menuState, { type: 'focus', id: 'second' }).ok, true);
  assert.equal(tree.calls.visible ?? 0, menuVisibleReads);
});

test('tree-grid retains flattened all-cell and visible-cell domains', () => {
  const tree = counted(createTree([
    { id: 'r0', parentID: null },
    { id: 'r1', parentID: null },
  ]));
  const grid = counted(createGrid([['a', 'b'], ['c', 'd']]));
  const model = createTreeGridModel(tree.value, grid.value, ['r0', 'r1']);
  const state = createTreeGridState(model, { current: 'a' });
  const cellReads = grid.calls.cellAt ?? 0;
  const visibleReads = tree.calls.visible ?? 0;
  assert.equal(applyTreeGridEvent(model, state, 'right').ok, true);
  assert.equal(grid.calls.cellAt ?? 0, cellReads);
  assert.equal(tree.calls.visible ?? 0, visibleReads);
});

function counted(target) {
  const calls = Object.create(null);
  const value = new Proxy(target, {
    get(object, property) {
      const member = Reflect.get(object, property, object);
      if (typeof member !== 'function') {
        if (typeof property === 'string') calls[property] = (calls[property] ?? 0) + 1;
        return member;
      }
      return (...args) => {
        if (typeof property === 'string') calls[property] = (calls[property] ?? 0) + 1;
        return Reflect.apply(member, object, args);
      };
    },
  });
  return {
    calls,
    value,
    reset() { for (const key of Object.keys(calls)) delete calls[key]; },
  };
}
