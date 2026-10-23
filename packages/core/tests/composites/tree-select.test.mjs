import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree } from '../../.verification-dist/structures/tree.js';
import { createTreeViewState, applyTreeViewEvent } from '../../.verification-dist/tree-view.js';
import { createTreeSelectResults, tryCreateTreeSelectResults, createTreeSelectState, tryCreateTreeSelectState, applyTreeSelectEvent } from '../../.verification-dist/tree-select.js';
import { ownsTreeSelectResults } from '../../.verification-dist/internal/composites/tree-select.js';
import { reconcileTreeSelectState, synchronizeTreeSelectState } from '../../.verification-dist/tree-select.js';

const nodes = [{ id: 'root', parentID: null }, { id: 'branch', parentID: 'root' }, { id: 'a', parentID: 'branch' },
  { id: 'b', parentID: 'branch' }, { id: 'c', parentID: 'root' }, { id: 'other', parentID: null }];
function step(tree, state, event, policies) {
  const result = applyTreeSelectEvent(tree, state, event, policies);
  assert.equal(result.ok, true, result.error?.message); return result.value;
}
test('controlled TreeSelect parts compose canonical snapshots and reject hidden mixed cursors', () => {
  const tree = createTree(nodes), before = createTreeSelectState(tree, { open: true, selectionMode: 'multiple', selected: ['a'], expanded: ['root', 'branch'], current: 'a' });
  let proposed = step(tree, before, { type: 'select', id: 'b' }).state;
  proposed = step(tree, proposed, { type: 'set-expanded', id: 'branch', open: false }).state;
  proposed = step(tree, proposed, 'close').state;
  for (let mask = 0; mask < 32; mask++) {
    const flags = Object.fromEntries(['selection', 'open', 'query', 'expansion', 'cursor'].map((key, index) => [key, !!(mask & 1 << index)]));
    const result = reconcileTreeSelectState(tree, before, proposed, flags);
    if (flags.cursor && !flags.expansion) { assert.equal(result.ok, false); assert.equal(result.error.code, 'tree-view-cursor-hidden'); continue; }
    assert.equal(result.ok, true, result.error?.message);
    assert.equal(result.value.selection, (flags.selection ? before : proposed).selection);
    assert.equal(result.value.open, (flags.open ? before : proposed).open);
    assert.equal(result.value.expansion, (flags.expansion ? before : proposed).expansion);
    assert.equal(result.value.view.cursor.current, (flags.cursor ? before : proposed).view.cursor.current);
  }
  assert.equal(reconcileTreeSelectState(tree, before, proposed).value, proposed);
  assert.equal(reconcileTreeSelectState(tree, before, proposed, { selection: true, open: true, query: true, expansion: true, cursor: true }).value, before);
  assert.equal(reconcileTreeSelectState(tree, before, proposed, { open: 'yes' }).error.code, 'invalid-boundary');
});
test('external expansion can repair an uncontrolled hidden cursor through the existing first-eligible owner', () => {
  const tree = createTree(nodes), initial = createTreeSelectState(tree, { expanded: ['root', 'branch'], current: 'a', open: true, selected: ['a'] });
  assert.equal(synchronizeTreeSelectState(tree, initial, { expanded: [] }).error.code, 'tree-view-cursor-hidden');
  const repaired = synchronizeTreeSelectState(tree, initial, { expanded: [], cursorFallback: 'first' });
  assert.equal(repaired.ok, true); assert.equal(repaired.value.state.view.cursor.current, 'root'); assert.equal(repaired.value.state.selection, initial.selection);
  assert.equal(synchronizeTreeSelectState(tree, initial, { expanded: [], current: 'a', cursorFallback: 'first' }).error.code, 'tree-view-cursor-hidden');
  assert.equal(synchronizeTreeSelectState(tree, initial, { cursorFallback: 'anything' }).error.code, 'invalid-boundary');
});
test('raw search responses are admitted only after request identity checks', () => {
  const tree = createTree(nodes), initial = createTreeSelectState(tree, { query: 'delivery', selected: ['other'] });
  const response = step(tree, initial, { type: 'results', request: initial.request, results: ['b'] }).state;
  assert.deepEqual(response.results.matches, ['b']); assert.equal(response.selection, initial.selection);
  const next = step(tree, initial, { type: 'query', query: 'next' }).state, stale = Array(1);
  Object.defineProperty(stale, 0, { get() { throw Error('stale raw match read'); } });
  assert.equal(applyTreeSelectEvent(tree, next, { type: 'results', request: initial.request, results: stale }).error.code, 'tree-select-stale-results');
  assert.equal(applyTreeSelectEvent(tree, initial, { type: 'results', request: initial.request, results: ['missing'] }).error.code, 'tree-select-match-outside-tree');
});
test('controlled query refusal retains its protocol while same-request results remain admissible', () => {
  const tree = createTree(nodes), before = createTreeSelectState(tree, { open: true, expanded: ['root'], current: 'root' });
  const query = step(tree, before, { type: 'query', query: 'a' }).state;
  assert.equal(reconcileTreeSelectState(tree, before, query, { query: true }).value, before);
  const result = step(tree, query, { type: 'results', request: query.request, results: createTreeSelectResults(tree, ['a']) }).state;
  const accepted = reconcileTreeSelectState(tree, query, result, { query: true }).value;
  assert.equal(accepted.request, query.request); assert.equal(accepted.pending, false); assert.equal(accepted.results, result.results);
  const foreign = createTree(nodes);
  assert.equal(reconcileTreeSelectState(foreign, before, query).error.code, 'tree-select-state-owner-mismatch');
});
test('external TreeSelect sync preserves requests, hidden values and canonical no-op owners', () => {
  const tree = createTree(nodes), initial = createTreeSelectState(tree, { open: true, query: 'a', results: createTreeSelectResults(tree, ['a']), selected: ['other'], expanded: ['root'] });
  const same = synchronizeTreeSelectState(tree, initial, { selected: ['other'], expanded: ['root'], query: 'a' });
  assert.equal(same.ok, true); assert.equal(same.value.state, initial); assert.deepEqual(same.value.commands, []);
  const changed = synchronizeTreeSelectState(tree, initial, { selected: ['b'], open: false });
  assert.equal(changed.ok, true); assert.equal(changed.value.state.request, initial.request); assert.equal(changed.value.state.results, initial.results);
  assert.deepEqual(changed.value.state.selection.selected, ['b']); assert.deepEqual(changed.value.commands, [{ type: 'close-popup' }]);
  assert.deepEqual(initial.selection.selected, ['other']);
  const invalid = synchronizeTreeSelectState(tree, initial, { query: 'new query', selected: ['a', 'b'] });
  assert.equal(invalid.error.code, 'invalid-selection-cardinality'); assert.equal(initial.pending, false); assert.equal(initial.request.query, 'a');
});
test('external synchronization admits coordinated result/current changes and refuses stale payloads atomically', () => {
  const tree = createTree(nodes), initial = createTreeSelectState(tree, { open: true, query: 'delivery' });
  const resolved = synchronizeTreeSelectState(tree, initial, { results: { request: initial.request, results: createTreeSelectResults(tree, ['b']) }, current: 'b', selected: ['a'] });
  assert.equal(resolved.ok, true); assert.equal(resolved.value.state.view.cursor.current, 'b'); assert.equal(resolved.value.state.pending, false);
  assert.deepEqual(resolved.value.state.selection.selected, ['a']); assert.deepEqual(resolved.value.commands, [{ type: 'focus', id: 'b' }]);
  const queried = step(tree, initial, { type: 'query', query: 'changed' }).state;
  const stale = synchronizeTreeSelectState(tree, queried, { results: { request: initial.request, get results() { throw Error('stale sync payload read'); } } });
  assert.equal(stale.error.code, 'tree-select-stale-results');
  const selected = ['b']; selected[Symbol.iterator] = () => { throw Error('selected iterator'); };
  const updated = synchronizeTreeSelectState(tree, resolved.value.state, { selected }); assert.equal(updated.ok, true);
  const over = Array(tree.preorder().maxItems + 1); Object.defineProperty(over, 0, { get() { throw Error('over-ceiling sync read'); } });
  assert.equal(synchronizeTreeSelectState(tree, resolved.value.state, { expanded: over }).error.code, 'item-ceiling-exceeded');
});
test('TreeSelect combines independent selection, popup and tree navigation through pure proposals', () => {
  const tree = createTree(nodes), initial = createTreeSelectState(tree, { selected: ['a'], expanded: ['root', 'branch'], current: 'a' });
  const opened = step(tree, initial, 'open'); assert.equal(opened.state.open, true); assert.deepEqual(opened.commands, [{ type: 'focus', id: 'a' }]);
  assert.equal(step(tree, opened.state, 'open').state, opened.state);
  const moved = step(tree, opened.state, 'next'); assert.equal(moved.state.view.cursor.current, 'b'); assert.equal(moved.state.selection, initial.selection);
  const proposal = step(tree, moved.state, 'select'); assert.deepEqual(proposal.state.selection.selected, ['b']); assert.equal(proposal.state.open, false);
  assert.deepEqual(proposal.commands, [{ type: 'close-popup' }]); assert.deepEqual(initial.selection.selected, ['a']); assert.equal(initial.open, false);
  assert.equal(applyTreeSelectEvent(tree, initial, 'select').error.code, 'tree-select-popup-closed');
  const multiple = createTreeSelectState(tree, { open: true, selectionMode: 'multiple', selected: ['a'], expanded: ['root', 'branch'] });
  const next = step(tree, multiple, { type: 'select', id: 'b' }); assert.deepEqual(next.state.selection.selected, ['a', 'b']); assert.equal(next.state.open, true);
  assert.deepEqual(step(tree, next.state, { type: 'select', id: 'a' }).state.selection.selected, ['b']);
  assert.equal(step(tree, multiple, { type: 'select', id: 'b' }, { closeOnSelect: true }).state.open, false);
  assert.equal(step(tree, opened.state, { type: 'select', id: 'b' }, { closeOnSelect: false }).state.open, true);
  assert.deepEqual(step(tree, next.state, 'clear').state.selection.selected, []);
});
test('search request identity refuses A-to-B-to-A responses before reading their payload', () => {
  const tree = createTree(nodes), original = createTreeSelectState(tree, { selected: ['other'], expanded: ['root'] });
  const first = step(tree, original, { type: 'query', query: 'A' });
  assert.equal(first.state.pending, true); assert.equal(first.commands[0].request, first.state.request);
  assert.equal(step(tree, first.state, { type: 'query', query: 'A' }).state, first.state);
  const second = step(tree, first.state, { type: 'query', query: 'B' }).state;
  const third = step(tree, second, { type: 'query', query: 'A' }).state; assert.notEqual(third.request, first.state.request);
  assert.equal(applyTreeSelectEvent(tree, third, { type: 'results', request: first.state.request, get results() { throw Error('stale response read'); } }).error.code, 'tree-select-stale-results');
  assert.equal(applyTreeSelectEvent(tree, third, { type: 'select', id: 'a' }).error.code, 'tree-select-search-pending');
  assert.equal(applyTreeSelectEvent(tree, third, 'next').error.code, 'tree-select-search-pending');
  const resolved = step(tree, third, { type: 'results', request: third.request, results: createTreeSelectResults(tree, ['a']) });
  assert.equal(resolved.state.pending, false); assert.equal(resolved.state.selection, original.selection); assert.deepEqual(resolved.commands, []);
  assert.equal(resolved.state.view.expansion.has('branch'), true); assert.equal(resolved.state.expansion.has('branch'), false);
  assert.equal(resolved.state.view.cursor.current, 'root');
  const restored = step(tree, resolved.state, { type: 'query', query: '' }).state;
  assert.equal(restored.results, null); assert.equal(restored.expansion, original.expansion); assert.equal(restored.view.expansion.has('branch'), false);
});
test('search context expansion is temporary while explicit branch changes persist on the source tree', () => {
  const tree = createTree(nodes); let state = createTreeSelectState(tree, { open: true, query: 'a', results: createTreeSelectResults(tree, ['a']) });
  assert.equal(state.view.expansion.has('root'), true); assert.equal(state.expansion.has('root'), false);
  state = step(tree, state, { type: 'set-expanded', id: 'root', open: false }).state;
  assert.equal(state.view.expansion.has('root'), false); assert.equal(state.expansion.has('root'), false);
  state = step(tree, state, { type: 'set-expanded', id: 'root', open: true }).state;
  assert.equal(state.expansion.has('root'), true);
  state = step(tree, state, { type: 'query', query: '' }).state; assert.equal(state.view.expansion.has('root'), true); assert.equal(state.view.expansion.has('branch'), false);
});
test('branch selection uses original topology and disabled eligibility independently from expansion', () => {
  const tree = createTree(nodes), state = createTreeSelectState(tree, { open: true, query: 'branch', results: createTreeSelectResults(tree, ['branch']) });
  assert.equal(state.results.tree.isLeaf('branch'), true);
  assert.equal(applyTreeSelectEvent(tree, state, { type: 'select', id: 'branch' }).error.code, 'tree-select-target-unselectable');
  const selected = step(tree, state, { type: 'select', id: 'branch' }, { selectable: (_id, leaf) => !leaf });
  assert.deepEqual(selected.state.selection.selected, ['branch']);
  assert.equal(applyTreeSelectEvent(tree, state, { type: 'select', id: 'branch' }, { eligible: id => id !== 'branch', selectable: () => true }).error.code, 'tree-view-target-ineligible');
  const edge = createTreeViewState(tree, { expanded: ['root', 'branch'], current: 'b' });
  assert.equal(applyTreeViewEvent(tree, edge, 'first', { eligible: id => id !== 'root' }).value.state.cursor.current, 'branch');
  assert.equal(applyTreeViewEvent(tree, edge, 'last', { eligible: id => id !== 'other' }).value.state.cursor.current, 'c');
});
test('TreeSelect validates issued owners, mode, text, event vocabulary and bounded indexed construction', () => {
  const tree = createTree(nodes), state = createTreeSelectState(tree), other = createTree(nodes);
  assert.equal(applyTreeSelectEvent(other, state, 'open').error.code, 'tree-select-state-owner-mismatch');
  assert.throws(() => Reflect.construct(Object.getPrototypeOf(state).constructor, [Symbol('sectile.tree-select.issuer'), tree, state]), TypeError);
  const projection = createTreeSelectResults(tree, ['a']);
  assert.throws(() => Reflect.construct(Object.getPrototypeOf(projection).constructor, [Symbol('sectile.tree-select.issuer'), tree, tree, [], new Set()]), TypeError);
  for (const foreign of [Object.create(Object.getPrototypeOf(state)), new Proxy(state, { get() { throw Error('wrapped state read'); } })])
    assert.equal(applyTreeSelectEvent(tree, foreign, 'open').error.code, 'tree-select-state-owner-mismatch');
  assert.equal(tryCreateTreeSelectState(tree, { results: createTreeSelectResults(other, []), get selected() { throw Error('foreign selected read'); } }).error.code, 'tree-select-results-owner-mismatch');
  assert.equal(tryCreateTreeSelectState(tree, { selectionMode: 'single', selected: ['a', 'b'] }).error.code, 'invalid-selection-cardinality');
  assert.equal(tryCreateTreeSelectState(tree, { query: '\ud800' }).error.code, 'invalid-tree-select-query');
  assert.equal(applyTreeSelectEvent(tree, state, { type: 'query', query: '\ud800' }).error.code, 'invalid-tree-select-query');
  for (const event of ['toggle-select', { type: 'toggle-select', id: 'root' }]) assert.equal(applyTreeSelectEvent(tree, state, event).error.code, 'invalid-tree-select-event');
  const ids = ['a']; ids[Symbol.iterator] = () => { throw Error('iterator read'); };
  assert.deepEqual(createTreeSelectState(tree, { selected: ids }).selection.selected, ['a']);
  const overflow = Array(tree.preorder().maxItems + 1); Object.defineProperty(overflow, 0, { get() { throw Error('over-ceiling getter'); } });
  assert.equal(tryCreateTreeSelectState(tree, { selected: overflow }).error.code, 'item-ceiling-exceeded');
  assert.equal(tryCreateTreeSelectState(tree, { expanded: new Proxy([], { get(target, key) { return key === 'length' ? -1 : Reflect.get(target, key); } }) }).error.code, 'invalid-boundary');
  const empty = createTree([]), opened = step(empty, createTreeSelectState(empty), 'open'); assert.equal(opened.state.open, true); assert.equal(opened.state.view.cursor.current, null);
  const pending = step(empty, opened.state, { type: 'query', query: 'nothing' }).state;
  const resolved = step(empty, pending, { type: 'results', request: pending.request, results: createTreeSelectResults(empty, []) }).state;
  assert.equal(resolved.pending, false); assert.equal(resolved.view.cursor.current, null); assert.equal(resolved.open, true);
});
test('canonical navigation and search reuse selected snapshots without selected-tuple sorting', () => {
  for (const size of [32, 512, 4096]) {
    const leaves = Array.from({ length: size }, (_, index) => 'leaf' + index);
    const tree = createTree([{ id: 'root', parentID: null }, ...leaves.map(id => ({ id, parentID: 'root' }))]);
    const results = createTreeSelectResults(tree, [leaves[0], leaves.at(-1)]);
    let state = createTreeSelectState(tree, { open: true, selectionMode: 'multiple', selected: leaves.filter((_, index) => index % 2 === 0), expanded: ['root'] });
    const selected = state.selection, originalSort = Array.prototype.sort; let sorts = 0;
    Array.prototype.sort = function(compare) { if (this.length && Array.isArray(this[0])) sorts++; return originalSort.call(this, compare); };
    try {
      for (const event of ['first', 'last', 'previous', { type: 'query', query: 'delivery' }]) state = step(tree, state, event).state;
      state = step(tree, state, { type: 'results', request: state.request, results }).state;
      state = step(tree, state, { type: 'query', query: '' }).state;
      state = step(tree, state, 'close').state; state = step(tree, state, 'open').state;
      state = synchronizeTreeSelectState(tree, state, { selected: state.selection.selected, query: state.request.query }).value.state;
      state = reconcileTreeSelectState(tree, state, state, { selection: true, query: true }).value;
      assert.equal(state.selection, selected); assert.equal(sorts, 0);
    } finally { Array.prototype.sort = originalSort; }
  }
});
test('search results include each ancestor once in source order while values retain the full tree', () => {
  const tree = createTree(nodes), selected = createTreeViewState(tree, { selected: ['other'] });
  const first = createTreeSelectResults(tree, ['c', 'a']);
  assert.deepEqual(first.matches, ['a', 'c']);
  assert.deepEqual(first.tree.preorder().ids, ['root', 'branch', 'a', 'c']);
  assert.equal(first.tree.parentOf('a'), 'branch'); assert.equal(first.isMatch('branch'), false); assert.equal(first.isMatch('a'), true);
  const navigation = createTreeViewState(first.tree, { expanded: ['root', 'branch'], current: 'branch' });
  assert.equal(applyTreeViewEvent(first.tree, navigation, 'right').value.state.cursor.current, 'a');
  assert.deepEqual(selected.selection.selected, ['other'], 'the search projection does not re-admit or alter values');
  const branch = createTreeSelectResults(tree, ['branch']);
  assert.equal(branch.tree.isLeaf('branch'), true); assert.equal(tree.isLeaf('branch'), false, 'selection eligibility must use the full source tree');
  assert.deepEqual(first.matches, ['a', 'c']); assert.ok(Object.isFrozen(first) && Object.isFrozen(first.matches));
  assert.equal(ownsTreeSelectResults(tree, first), true); assert.equal(ownsTreeSelectResults(createTree(nodes), first), false);
  assert.equal(ownsTreeSelectResults(tree, Object.create(Object.getPrototypeOf(first))), false);
  assert.equal(ownsTreeSelectResults(tree, new Proxy(first, { get() { throw Error('foreign getter'); } })), false);
});
test('empty and complete result sets preserve canonical identity and source ceilings', () => {
  const tree = createTree(nodes), all = createTreeSelectResults(tree, ['other', 'c', 'b', 'a', 'branch', 'root']);
  assert.equal(all.tree, tree); assert.deepEqual(all.matches, tree.preorder().ids);
  const empty = createTreeSelectResults(tree, []); assert.equal(empty.tree.size, 0); assert.equal(empty.tree.preorder().maxItems, tree.preorder().maxItems);
  assert.equal(empty.isMatch('a'), false); const zero = createTree([]); assert.equal(createTreeSelectResults(zero, []).tree, zero);
  const numeric = createTree([{ id: 0, parentID: null }, { id: 1, parentID: 0 }]);
  assert.deepEqual(createTreeSelectResults(numeric, [1]).tree.preorder().ids, [0, 1]);
});
test('result admission is bounded indexed data, rejects invalid matches and snapshots caller input', () => {
  const tree = createTree(nodes), input = ['a']; let reads = 0;
  Object.defineProperty(input, 0, { get() { reads++; return 'a'; } });
  input[Symbol.iterator] = () => { throw Error('custom iterator must not run'); };
  const results = createTreeSelectResults(tree, input); assert.equal(reads, 1); assert.deepEqual(results.matches, ['a']);
  const mutable = ['b'], saved = createTreeSelectResults(tree, mutable); mutable[0] = 'c'; assert.equal(saved.isMatch('b'), true); assert.equal(saved.isMatch('c'), false);
  const tooMany = Array(tree.size + 1); Object.defineProperty(tooMany, 0, { get() { throw Error('over-ceiling input read'); } });
  assert.equal(tryCreateTreeSelectResults(tree, tooMany).error.code, 'item-ceiling-exceeded');
  assert.equal(tryCreateTreeSelectResults(tree, ['missing']).error.code, 'tree-select-match-outside-tree');
  assert.equal(tryCreateTreeSelectResults(tree, ['a', 'a']).error.code, 'tree-select-duplicate-match');
  assert.equal(tryCreateTreeSelectResults(tree, new Set(['a'])).error.code, 'invalid-boundary');
  assert.equal(tryCreateTreeSelectResults(tree, new Proxy([], { get(target, key) { return key === 'length' ? NaN : Reflect.get(target, key); } })).error.code, 'invalid-boundary');
});
test('shared deep ancestor paths are walked at most once before emitting their parent links', () => {
  for (const depth of [1, 128, 2048]) {
    const nodes = Array.from({ length: depth }, (_, id) => ({ id, parentID: id === 0 ? null : id - 1 }));
    nodes.push({ id: depth, parentID: depth - 1 }, { id: depth + 1, parentID: depth - 1 });
    const tree = createTree(nodes, { maxDepth: depth + 1 }); let parents = 0;
    const counted = { ...tree, preorder: () => tree.preorder(), parentOf(id) { parents++; return tree.parentOf(id); } };
    const results = createTreeSelectResults(counted, [depth + 1, depth]);
    assert.equal(results.tree.size, depth + 2); assert.equal(parents, 2 * results.tree.size);
    assert.deepEqual(results.matches, [depth, depth + 1]); assert.equal(results.tree.depthOf(depth), depth);
  }
});
