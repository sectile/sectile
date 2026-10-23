import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree } from '../../.verification-dist/structures/tree.js';
import { createTreeSelection, tryCreateTreeSelection, createTreeViewState, createTreeViewCheckState, tryCreateTreeViewCheckState, reconcileTreeViewState, tryCreateTreeViewState, applyTreeViewCheckEvent } from '../../.verification-dist/tree-view.js';
import { unwrap, powerset } from '../support.mjs';

const nodes = [
  { id: 'root', parentID: null }, { id: 'branch', parentID: 'root' },
  { id: 'a', parentID: 'branch' }, { id: 'b', parentID: 'branch' }, { id: 'c', parentID: 'root' },
];
test('checked state admission and acceptance share one canonical selection without accepting proposals early', () => {
  const tree = createTree(nodes), checking = createTreeSelection(tree, { selected: ['a'] });
  const initial = createTreeViewCheckState(tree, checking, { expanded: ['root', 'branch'], current: 'branch' });
  assert.equal(initial.selection.selected, checking.selected);
  const proposed = unwrap(applyTreeViewCheckEvent(tree, initial, 'toggle-select', checking));
  const accepted = unwrap(reconcileTreeViewState(tree, initial, proposed.state));
  assert.equal(accepted, proposed.state); assert.equal(accepted.selection, proposed.state.selection); assert.deepEqual(checking.selected, ['a']);
  const update = unwrap(checking.accept(accepted.selection));
  assert.equal(update.selected, accepted.selection.selected); assert.equal(checking.selected, accepted.selection.selected); assert.equal(checking.getChecked('branch'), true);
  unwrap(checking.accept(initial.selection)); assert.equal(checking.selected, initial.selection.selected); assert.equal(checking.getChecked('branch'), 'mixed');
});

test('canonical acceptance refuses foreign, prototype-forged and wrapped selections without reading their fields', () => {
  const tree = createTree(nodes), model = createTreeSelection(tree, { selected: ['a'] });
  const own = createTreeViewCheckState(tree, model), other = createTreeViewCheckState(tree, createTreeSelection(tree));
  const before = model.selected;
  const fake = Object.create(Object.getPrototypeOf(own.selection));
  Object.defineProperty(fake, 'anchor', { get() { throw Error('foreign anchor read'); } });
  for (const selection of [other.selection, createTreeViewState(tree, { selected: ['a'] }).selection, fake, new Proxy(own.selection, { get() { throw Error('wrapped selection read'); } })]) {
    assert.equal(model.accept(selection).error.code, 'tree-selection-owner-mismatch'); assert.equal(model.selected, before);
  }
  const foreignTree = createTree(nodes);
  assert.equal(tryCreateTreeViewCheckState(foreignTree, model, { get selected() { throw Error('foreign input read'); } }).error.code, 'tree-selection-owner-mismatch');
  const emptyTree = createTree([]), emptyA = createTreeSelection(emptyTree), emptyB = createTreeSelection(emptyTree);
  assert.equal(emptyA.accept(createTreeViewCheckState(emptyTree, emptyB).selection).error.code, 'tree-selection-owner-mismatch');
});

test('canonical TreeView reconciliation preserves constructor semantics for every controlled part combination', () => {
  const tree = createTree(nodes);
  const previous = createTreeViewState(tree, { selected: ['a'], expanded: ['root', 'branch'], current: 'a' });
  const proposed = createTreeViewState(tree, { selected: ['b'], expanded: ['root'], current: 'c' });
  for (const selection of [false, true]) for (const expansion of [false, true]) for (const cursor of [false, true]) {
    const expected = tryCreateTreeViewState(tree, { selected: (selection ? previous : proposed).selection.selected,
      expanded: (expansion ? previous : proposed).expansion.ids, current: (cursor ? previous : proposed).cursor.current });
    const result = reconcileTreeViewState(tree, previous, proposed, { selection, expansion, cursor });
    assert.equal(result.ok, expected.ok);
    if (!expected.ok) assert.equal(result.error.code, expected.error.code);
    else { assert.equal(result.value.selection, (selection ? previous : proposed).selection); assert.equal(result.value.expansion, (expansion ? previous : proposed).expansion); assert.equal(result.value.cursor, (cursor ? previous : proposed).cursor); }
  }
  const forged = { ...previous, selection: { selected: ['outside'], anchor: null } };
  assert.equal(reconcileTreeViewState(tree, previous, forged).error.code, 'selected-id-outside-domain');
  const many = createTreeViewState(tree, { selected: ['a', 'b'] });
  assert.equal(reconcileTreeViewState(tree, many, many, {}, 'single').error.code, 'invalid-selection-cardinality');
  assert.equal(reconcileTreeViewState(tree, previous, proposed, { selection: 'yes' }).error.code, 'invalid-boundary');
});

test('pure checked-state construction bounds external values and refuses hidden cursors without publication', () => {
  const tree = createTree(nodes), checking = createTreeSelection(tree, { selected: ['a'] }), before = checking.selected;
  const selected = ['b', 'b']; selected[Symbol.iterator] = () => { throw Error('external iterator'); };
  const proposed = unwrap(tryCreateTreeViewCheckState(tree, checking, { selected })); assert.deepEqual(proposed.selection.selected, ['b']); assert.equal(checking.selected, before);
  assert.equal(tryCreateTreeViewCheckState(tree, checking, { selected, current: 'b' }).error.code, 'tree-view-cursor-hidden'); assert.equal(checking.selected, before);
  assert.equal(tryCreateTreeViewCheckState(tree, checking, { anchor: 'a' }).error.code, 'selection-anchor-outside-domain');
  const oversized = []; oversized.length = tree.preorder().maxItems + 1; Object.defineProperty(oversized, 0, { get() { throw Error('over-ceiling read'); } });
  assert.equal(tryCreateTreeViewCheckState(tree, checking, { selected: oversized }).error.code, 'item-ceiling-exceeded');
});
test('tree selection normalization admits bounded leaf values without accepting checked state', () => {
  const model = createTreeSelection(createTree(nodes), { selected: ['a'] });
  const before = model.selected, source = ['b', 'a', 'b'];
  source[Symbol.iterator] = () => { throw Error('untrusted iterator'); };
  assert.deepEqual(unwrap(model.normalize(source)), ['a', 'b']);
  assert.equal(model.selected, before); assert.equal(model.getChecked('branch'), 'mixed');
  assert.equal(model.normalize(['branch']).ok, false); assert.equal(model.selected, before);
  const input = []; Object.defineProperty(input, 0, { get() { assert.equal(model.replace(['b']).error.code, 'tree-selection-reentrant'); return 'b'; } });
  assert.deepEqual(unwrap(model.normalize(input)), ['b']); assert.equal(model.selected, before);
});
test('a retained canonical checked snapshot does not retain its retired aggregation owner', { skip: typeof global.gc !== 'function' }, async () => {
  const retained = canonicalSnapshot();
  for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(retained.owner.deref(), undefined); assert.deepEqual(retained.state.selection.selected, ['a']); assert.equal(retained.state.selection.has('a'), true);
});
function canonicalSnapshot() {
  const tree = createTree(nodes), model = createTreeSelection(tree, { selected: ['a'] });
  return { owner: new WeakRef(model), state: createTreeViewCheckState(tree, model) };
}
test('checked TreeView events propose leaf values without accepting them or changing cursor ownership', () => {
  const tree = createTree(nodes), checking = createTreeSelection(tree, { selected: ['a'] });
  const state = createTreeViewState(tree, { selected: checking.selected, expanded: ['root', 'branch'], current: 'branch' });
  const checked = unwrap(applyTreeViewCheckEvent(tree, state, 'toggle-select', checking));
  assert.deepEqual(checked.state.selection.selected, ['a', 'b']); assert.deepEqual(checking.selected, ['a']);
  assert.deepEqual(state.selection.selected, ['a']); assert.equal(checked.state.cursor.current, 'branch'); assert.deepEqual(checked.commands, []);
  assert.equal(checked.state.selection.anchor, null); assert.ok(Object.isFrozen(checked.state.selection.selected));
  unwrap(checking.replace(checked.state.selection.selected));
  const unchecked = unwrap(applyTreeViewCheckEvent(tree, checked.state, { type: 'toggle-select', id: 'branch' }, checking));
  assert.deepEqual(unchecked.state.selection.selected, []); assert.deepEqual(unchecked.commands, [{ type: 'focus', id: 'branch' }]);
  assert.deepEqual(checking.selected, ['a', 'b']); assert.deepEqual(checked.state.selection.selected, ['a', 'b']);
});
test('checked TreeView navigation reuses expansion/focus without reading selected aggregation', () => {
  const tree = createTree(nodes), checking = createTreeSelection(tree, { selected: ['a'] });
  const state = createTreeViewState(tree, { selected: checking.selected, expanded: ['root'], current: 'branch' });
  const prototype = Object.getPrototypeOf(checking), descriptor = Object.getOwnPropertyDescriptor(prototype, 'selected'); let reads = 0;
  Object.defineProperty(prototype, 'selected', { ...descriptor, get() { reads++; return descriptor.get.call(this); } });
  try {
    const expanded = unwrap(applyTreeViewCheckEvent(tree, state, 'right', checking));
    const moved = unwrap(applyTreeViewCheckEvent(tree, expanded.state, 'next', checking));
    assert.equal(expanded.state.expansion.has('branch'), true); assert.equal(moved.state.cursor.current, 'a');
    assert.deepEqual(moved.commands, [{ type: 'focus', id: 'a' }]); assert.ok(moved.state.selection === state.selection); assert.equal(reads, 0);
  } finally { Object.defineProperty(prototype, 'selected', descriptor); }
});
test('checked TreeView refuses hidden, disabled, stale and mismatched check proposals atomically', () => {
  const tree = createTree(nodes), checking = createTreeSelection(tree, { selected: ['a'], disabled: ['branch'] });
  const state = createTreeViewState(tree, { selected: checking.selected, expanded: ['root', 'branch'], current: 'root' });
  assert.equal(applyTreeViewCheckEvent(tree, state, { type: 'toggle-select', id: 'branch' }, checking).error.code, 'tree-selection-target-disabled');
  const hidden = createTreeViewState(tree, { selected: checking.selected, current: 'root' });
  assert.equal(applyTreeViewCheckEvent(tree, hidden, { type: 'toggle-select', id: 'a' }, checking).error.code, 'tree-view-target-hidden');
  assert.equal(applyTreeViewCheckEvent(tree, state, 'next', createTreeSelection(createTree(nodes))).error.code, 'tree-selection-owner-mismatch');
  assert.equal(applyTreeViewCheckEvent(tree, state, 'toggle-select', checking, { selectionMode: 'single' }).error.code, 'invalid-selection-mode');
  unwrap(checking.replace(['b']));
  assert.equal(applyTreeViewCheckEvent(tree, state, 'toggle-select', checking).error.code, 'tree-selection-stale');
  unwrap(checking.replace(['a']));
  const stale = applyTreeViewCheckEvent(tree, state, 'toggle-select', checking, { eligible: () => { unwrap(checking.replace(['b'])); return true; } });
  assert.equal(stale.error.code, 'tree-selection-stale'); assert.deepEqual(state.selection.selected, ['a']); assert.deepEqual(checking.selected, ['b']);
});
test('checked TreeView detects projection replacement during a borrowed subtree proposal', () => {
  const original = createTree(nodes), domain = original.preorder(); let checking, mutate = false;
  const order = new Proxy(domain, { get(target, key) {
    if (key === 'at') return index => { if (mutate) { mutate = false; unwrap(checking.replace(['b'])); } return target.at(index); };
    const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
  } });
  const tree = new Proxy(original, { get(target, key) { if (key === 'preorder') return () => order; const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; } });
  checking = createTreeSelection(tree, { selected: ['a'] });
  const state = createTreeViewState(tree, { selected: checking.selected, expanded: ['root', 'branch'], current: 'root' });
  mutate = true; const result = applyTreeViewCheckEvent(tree, state, 'toggle-select', checking);
  assert.equal(result.error.code, 'tree-selection-stale'); assert.deepEqual(state.selection.selected, ['a']); assert.deepEqual(checking.selected, ['b']);
});
test('tree selection proposes leaf values and publishes checked/mixed changes only after acceptance', () => {
  const model = createTreeSelection(createTree(nodes), { selected: ['b'] });
  assert.equal(model.getChecked('root'), 'mixed'); assert.equal(model.getChecked('branch'), 'mixed');
  assert.equal(model.getChecked('a'), false); assert.equal(model.getChecked('b'), true); assert.equal(model.getChecked('missing'), null);
  const before = model.selected, proposal = unwrap(model.propose('branch', true));
  assert.deepEqual(proposal, ['a', 'b']); assert.ok(Object.isFrozen(proposal)); assert.ok(model.selected === before);
  const update = unwrap(model.replace(proposal)); assert.deepEqual(new Set(update.changed), new Set(['a', 'branch']));
  assert.equal(model.getChecked('branch'), true); assert.equal(model.getChecked('root'), 'mixed'); assert.deepEqual(before, ['b']);
  assert.ok(unwrap(model.propose('branch', true)) === model.selected);
  const accepted = model.selected; assert.deepEqual(unwrap(model.replace(['b', 'a'])).changed, []); assert.ok(model.selected === accepted);
  assert.equal(model.replace(['branch']).ok, false); assert.ok(model.selected === accepted);
  assert.equal(model.propose('missing', true).ok, false); assert.equal(model.propose('a', 'mixed').ok, false);
});
test('tree selection excludes disabled leaves from aggregation while preserving their controlled values', () => {
  const subtree = createTreeSelection(createTree(nodes), { disabled: ['branch'], selected: ['a'] });
  assert.equal(subtree.isDisabled('a'), true); assert.equal(subtree.getChecked('a'), true); assert.equal(subtree.getChecked('branch'), false);
  assert.equal(subtree.getChecked('root'), false); assert.equal(subtree.propose('branch', true).error.code, 'tree-selection-target-disabled');
  assert.deepEqual(unwrap(subtree.propose('root', true)), ['a', 'c']);
  const self = createTreeSelection(createTree(nodes), { disabled: ['branch'], disabledPropagation: 'self' });
  assert.equal(self.isDisabled('branch'), true); assert.equal(self.isDisabled('a'), false);
  assert.deepEqual(unwrap(self.propose('root', true)), ['a', 'b', 'c']);
  const disabledLeaf = createTreeSelection(createTree(nodes), { disabled: ['a'], selected: ['a'] });
  assert.deepEqual(unwrap(disabledLeaf.replace([])).changed, ['a']); assert.equal(disabledLeaf.getChecked('branch'), false);
  assert.equal(tryCreateTreeSelection(createTree(nodes), { disabled: ['unknown'] }).ok, false);
});
test('tree selection sparse and dense changes agree with independent descendant aggregation', () => {
  const tree = createTree(nodes), leaves = ['a', 'b', 'c'];
  for (const propagation of ['self', 'subtree']) for (const disabled of [[], ['branch'], ['b']]) {
    const model = createTreeSelection(tree, { disabled, disabledPropagation: propagation });
    const unavailable = id => disabled.includes(id) || propagation === 'subtree' && tree.ancestorsOf(id).some(parent => disabled.includes(parent));
    for (const selected of powerset(leaves)) {
      const before = new Map(nodes.map(node => [node.id, model.getChecked(node.id)]));
      const update = unwrap(model.replace(selected));
      for (const { id } of nodes) {
        const relevant = leaves.filter(leaf => (leaf === id || tree.ancestorsOf(leaf).includes(id)) && !unavailable(leaf));
        const count = relevant.filter(leaf => selected.includes(leaf)).length;
        const expected = leaves.includes(id) ? selected.includes(id) : count === 0 ? false : count === relevant.length ? true : 'mixed';
        assert.equal(model.getChecked(id), expected, JSON.stringify({ propagation, disabled, selected, id }));
        assert.equal(update.changed.includes(id), expected !== before.get(id));
      }
    }
  }
});
test('tree selection bounds sparse writes independently of tree size and switches dense work to one fold', () => {
  for (const size of [1, 128, 4096]) {
    const tree = createTree([{ id: 'root', parentID: null }, ...Array.from({ length: size }, (_, id) => ({ id, parentID: 'root' }))]);
    const domain = tree.preorder(); let reads = 0;
    const order = new Proxy(domain, { get(target, key) { if (key === 'at') return index => { reads++; return target.at(index); }; const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; } });
    const model = createTreeSelection({ ...tree, size: tree.size, preorder: () => order, parentOf: id => tree.parentOf(id), subtreeIntervalOf: id => tree.subtreeIntervalOf(id) });
    const measured = action => { let writes = 0; const set = Map.prototype.set; Map.prototype.set = function(...args) { writes++; return set.apply(this, args); };
      try { reads = 0; const result = unwrap(action()); return { result, writes, reads }; } finally { Map.prototype.set = set; } };
    const sparse = measured(() => model.replace([0]));
    assert.deepEqual(new Set(sparse.result.changed), new Set(['root', 0])); assert.ok(sparse.writes <= 16, JSON.stringify({ size, ...sparse }));
    if (size > 1) assert.equal(sparse.reads, 0, 'a sparse value change does not scan the tree order');
    const dense = measured(() => model.replace(Array.from({ length: size }, (_, id) => id)));
    assert.equal(model.getChecked('root'), true); assert.ok(dense.writes <= 3 * (size + 1)); assert.ok(dense.reads <= 2 * (size + 1));
    const lookup = measured(() => ({ ok: true, value: model.getChecked('root') }));
    assert.equal(lookup.reads, 0); assert.equal(lookup.writes, 0);
  }
});
test('tree selection rejects oversized/reentrant admissions atomically and handles empty trees', () => {
  const tree = createTree([{ id: 'a', parentID: null }], { maxItems: 1 });
  const oversized = Array(2); let reads = 0; Object.defineProperty(oversized, 0, { get() { reads++; throw Error('must not read'); } });
  assert.equal(tryCreateTreeSelection(tree, { selected: oversized }).error.code, 'item-ceiling-exceeded');
  assert.equal(tryCreateTreeSelection(tree, { disabledPropagation: 'unknown' }).error.code, 'invalid-boundary');
  assert.equal(tryCreateTreeSelection({ size: 1, preorder: () => tree.preorder(), parentOf: () => null,
    subtreeIntervalOf: () => ({ start: 0, endExclusive: 2 }) }).error.code, 'invalid-boundary');
  const model = createTreeSelection(tree); assert.equal(model.replace(oversized).error.code, 'item-ceiling-exceeded'); assert.equal(reads, 0);
  let nested; const selected = ['a']; Object.defineProperty(selected, 0, { get() { nested = model.replace([]); return 'a'; } });
  assert.equal(model.replace(selected).ok, true); assert.equal(nested.error.code, 'tree-selection-reentrant'); assert.deepEqual(model.selected, ['a']);
  const custom = ['a']; custom[Symbol.iterator] = () => { throw Error('input iterator must not execute'); };
  assert.equal(model.replace(custom).ok, true); assert.deepEqual(createTreeSelection(tree, { selected: custom, disabled: custom }).selected, ['a']);
  const proxied = new Proxy(['a'], { get(target, key) { if (key === 'length') nested = model.replace([]); return target[key]; } });
  assert.equal(model.replace(proxied).ok, true); assert.equal(nested.error.code, 'tree-selection-reentrant');
  const empty = createTreeSelection(createTree([])); assert.equal(empty.size, 0); assert.equal(empty.getChecked('none'), null); assert.equal(empty.isDisabled('none'), null);
  assert.deepEqual(unwrap(empty.replace([])), { selected: [], changed: [] }); assert.equal(empty.propose('none', true).ok, false);
});
