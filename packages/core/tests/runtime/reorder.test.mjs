import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySequenceReorderEvent,
  applyTreeReorderEvent,
  canMoveTreeReorderNode,
  createSequenceReorderState,
  createTreeReorderState,
  tryCreateTreeReorderState,
  getSequenceReorderOrder,
  getTreeReorderHierarchy,
} from '../../.verification-dist/reorder.js';

test('Reorder borrows canonical owners and revalidates structural caller states', () => {
  const ids = ['a', 'b', 'c'];
  const state = createSequenceReorderState(ids);
  const order = getSequenceReorderOrder(state);
  assert.equal(order, getSequenceReorderOrder(state));
  assert.equal(order.ids, state.ids);
  assert.equal(order.indexOf('c'), 2);
  const next = applySequenceReorderEvent(state, { type: 'move-to-start', id: 'c' }).value.state;
  assert.equal(getSequenceReorderOrder(next).indexOf('c'), 0);
  assert.equal(order.indexOf('c'), 2);
  const external = { ids };
  assert.deepEqual(getSequenceReorderOrder(external).ids, ids);
  ids.reverse();
  assert.equal(getSequenceReorderOrder(external).indexOf('c'), 0);
  ids.push('a');
  assert.throws(() => getSequenceReorderOrder(external));

  const nodes = [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }];
  const treeState = createTreeReorderState(nodes);
  const tree = getTreeReorderHierarchy(treeState);
  assert.equal(tree, getTreeReorderHierarchy(treeState));
  assert.equal(tree.childrenOf('root'), tree.childrenOf('root'));
  assert.equal(tree.childrenOf('root').indexOf('b'), 1);
  assert.equal(tree.depthOf('b'), 1);
  nodes[2] = { id: 'b', parentID: null };
  assert.equal(getTreeReorderHierarchy({ nodes }).depthOf('b'), 0);
  assert.equal(tree.depthOf('b'), 1);
  nodes[0] = { id: 'root', parentID: 'a' };
  assert.throws(() => getTreeReorderHierarchy({ nodes }));
});

test('tree movement availability borrows admission without changing state or bypassing policy', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null },
    { id: 'a', parentID: 'left' }, { id: 'child', parentID: 'a' }, { id: 'b', parentID: 'left' }]);
  const before = state.nodes;
  const cases = [
    [{ id: 'b', parentID: 'right' }, undefined, true],
    [{ id: 'missing', parentID: 'right' }, undefined, false],
    [{ id: 'b', parentID: 'missing' }, undefined, false],
    [{ id: 'a', parentID: 'child' }, undefined, false],
    [{ id: 'b', parentID: 'right', beforeID: 'a' }, undefined, false],
    [{ id: 'a', parentID: 'right' }, { maxDepth: 1 }, false],
    [{ id: 'a', parentID: 'right' }, { maxDepth: 2 }, true],
    [{ id: 'left', parentID: 'right' }, { preserveRoots: true }, false],
    [{ id: 'left', parentID: null, beforeID: 'right' }, { preserveRoots: true }, true],
    [{ id: 'b', parentID: 'right' }, { capacity: () => 0 }, false],
    [{ id: 'b', parentID: 'right' }, { capacity: () => 1 }, true],
    [{ id: 'b', parentID: 'right' }, { capacity: () => -1 }, false],
    [{ id: 'b', parentID: 'right' }, { canMove: () => false }, false],
    [{ id: 'b', parentID: 'left', beforeID: 'b' }, { canMove: () => false }, true],
  ];
  for (const [placement, policy, expected] of cases) {
    const event = { type: 'move-node', ...placement };
    assert.equal(canMoveTreeReorderNode(state, event, policy), expected, JSON.stringify(placement));
    assert.equal(state.nodes, before);
    assert.equal(applyTreeReorderEvent(state, event, policy).ok, expected);
  }
  assert.equal(getTreeReorderHierarchy(state).parentOf('b'), 'left');
});
test('tree availability validates structural callers and captures event and policy fields once', () => {
  const nodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }];
  const reads = { id: 0, parent: 0, before: 0, permission: 0, capacity: 0 }; let calls = 0;
  assert.equal(canMoveTreeReorderNode({ nodes }, { type: 'move-node', get id() { reads.id++; return 'a'; },
    get parentID() { reads.parent++; return 'right'; }, get beforeID() { reads.before++; return null; } }, {
    get canMove() { reads.permission++; return () => { calls++; return true; }; }, get capacity() { reads.capacity++; return () => 1; },
  }), true);
  assert.deepEqual(reads, { id: 1, parent: 1, before: 1, permission: 1, capacity: 1 }); assert.equal(calls, 1);
  assert.equal(nodes[2].parentID, 'left');
  assert.equal(canMoveTreeReorderNode({ nodes: [...nodes, nodes[2]] }, { type: 'move-node', id: 'a', parentID: 'right' }), false);
  for (const policy of [null, [], { maxDepth: -1 }, { canMove: true }, { capacity: 1 }])
    assert.equal(canMoveTreeReorderNode({ nodes }, { type: 'move-node', id: 'a', parentID: 'right' }, policy), false);
});
test('tree availability propagates application failures and rechecks mutable permissions at commit', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }]);
  const event = { type: 'move-node', id: 'a', parentID: 'right' }, failure = Error('move permission');
  assert.throws(() => canMoveTreeReorderNode(state, event, { canMove: () => { throw failure; } }), error => error === failure);
  let allowed = true; const policy = { canMove: () => allowed };
  assert.equal(canMoveTreeReorderNode(state, event, policy), true); allowed = false;
  assert.equal(applyTreeReorderEvent(state, event, policy).error.code, 'reorder-tree-move-rejected');
  assert.equal(getTreeReorderHierarchy(state).parentOf('a'), 'left');
});
test('warm canonical leaf availability never constructs a next-tree position index', () => {
  const nodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null },
    ...Array.from({ length: 512 }, (_, index) => ({ id: `card-${index}`, parentID: 'left' }))];
  const state = createTreeReorderState(nodes), tree = getTreeReorderHierarchy(state);
  void tree.childrenOf('right').ids;
  const event = { type: 'move-node', id: 'card-0', parentID: 'right' }, policy = { maxDepth: 1, preserveRoots: true, capacity: () => 1 };
  const original = Map.prototype.set; let writes = 0, accepted = 0;
  Map.prototype.set = function(...args) { writes++; return original.apply(this, args); };
  try { for (let index = 0; index < 100; index++) if (canMoveTreeReorderNode(state, event, policy)) accepted++; }
  finally { Map.prototype.set = original; }
  assert.equal(accepted, 100); assert.equal(writes, 0);
  assert.deepEqual(tree.childrenOf('right').ids, []); assert.equal(state.nodes.length, 514);
});

test('ORD-01: sequence reorder preserves identity and applies before, after, and edge moves', () => {
  let state = createSequenceReorderState(['a', 'b', 'c', 'd']);
  state = applySequenceReorderEvent(state, {
    type: 'move-before', id: 'd', targetID: 'b',
  }).value.state;
  assert.deepEqual(state.ids, ['a', 'd', 'b', 'c']);
  state = applySequenceReorderEvent(state, {
    type: 'move-after', id: 'a', targetID: 'c',
  }).value.state;
  assert.deepEqual(state.ids, ['d', 'b', 'c', 'a']);
  assert.deepEqual(applySequenceReorderEvent(state, {
    type: 'move-to-start', id: 'a',
  }).value.state.ids, ['a', 'd', 'b', 'c']);
});

test('ORD-02: sequence reorder rejects unknown identities without partial state', () => {
  const state = createSequenceReorderState(['a', 'b']);
  const result = applySequenceReorderEvent(state, {
    type: 'move-before', id: 'a', targetID: 'missing',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'reorder-id-missing');
  assert.deepEqual(state.ids, ['a', 'b']);
});

test('sequence reorder captures caller-owned event fields once before semantic decisions', () => {
  const state = createSequenceReorderState(['a', 'b', 'c']);
  const reads = { type: 0, id: 0, targetID: 0 };
  const result = applySequenceReorderEvent(state, {
    get type() {
      reads.type += 1;
      return reads.type === 1 ? 'move-before' : 'move-to-end';
    },
    get id() {
      reads.id += 1;
      return reads.id === 1 ? 'a' : 'c';
    },
    get targetID() {
      reads.targetID += 1;
      return reads.targetID === 1 ? 'c' : 'a';
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(reads, { type: 1, id: 1, targetID: 1 });
  assert.deepEqual(result.value.state.ids, ['b', 'a', 'c']);
  assert.deepEqual(result.value.commands, [{
    type: 'sequence-order-changed',
    patch: { type: 'move', from: 0, to: 1, count: 1 },
  }]);

  let invalidIDReads = 0;
  let invalidTargetReads = 0;
  const invalid = applySequenceReorderEvent(state, {
    type: 'move-before',
    get id() {
      invalidIDReads += 1;
      return invalidIDReads === 1 ? 'missing' : 'a';
    },
    get targetID() {
      invalidTargetReads += 1;
      return invalidTargetReads === 1 ? 'c' : 'b';
    },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'reorder-id-missing');
  assert.equal(invalidIDReads, 1);
  assert.equal(invalidTargetReads, 1);
});

test('ORD-04: tree reorder changes parent and sibling order atomically', () => {
  let state = createTreeReorderState([
    { id: 'root', parentID: null },
    { id: 'a', parentID: 'root' },
    { id: 'b', parentID: 'root' },
    { id: 'leaf', parentID: 'a' },
  ]);
  state = applyTreeReorderEvent(state, {
    type: 'move-node', id: 'leaf', parentID: 'root', beforeID: 'b',
  }).value.state;
  assert.deepEqual(state.nodes, [
    { id: 'root', parentID: null },
    { id: 'a', parentID: 'root' },
    { id: 'leaf', parentID: 'root' },
    { id: 'b', parentID: 'root' },
  ]);
});

test('tree reorder captures caller-owned structural fields once before validation and output', () => {
  const state = createTreeReorderState([
    { id: 'root', parentID: null },
    { id: 'a', parentID: 'root' },
    { id: 'b', parentID: 'root' },
    { id: 'leaf', parentID: 'a' },
    { id: 'other', parentID: null },
  ]);
  const reads = { id: 0, parentID: 0, beforeID: 0 };
  const result = applyTreeReorderEvent(state, {
    type: 'move-node',
    get id() {
      reads.id += 1;
      return reads.id === 1 ? 'leaf' : 'other';
    },
    get parentID() {
      reads.parentID += 1;
      return reads.parentID === 1 ? 'root' : null;
    },
    get beforeID() {
      reads.beforeID += 1;
      return reads.beforeID === 1 ? null : 'b';
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(reads, { id: 1, parentID: 1, beforeID: 1 });
  assert.equal(result.value.state.nodes.find((node) => node.id === 'leaf').parentID, 'root');

  let invalidParentReads = 0;
  let invalidBeforeReads = 0;
  const invalid = applyTreeReorderEvent(state, {
    type: 'move-node',
    id: 'leaf',
    get parentID() {
      invalidParentReads += 1;
      return invalidParentReads === 1 ? 'missing' : 'root';
    },
    get beforeID() {
      invalidBeforeReads += 1;
      return invalidBeforeReads === 1 ? null : 'b';
    },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'reorder-id-missing');
  assert.equal(invalidParentReads, 1);
  assert.equal(invalidBeforeReads, 1);
});

test('ORD-03: tree reorder rejects cycles and unrelated sibling targets', () => {
  const state = createTreeReorderState([
    { id: 'root', parentID: null },
    { id: 'branch', parentID: 'root' },
    { id: 'leaf', parentID: 'branch' },
    { id: 'other', parentID: null },
  ]);
  assert.equal(applyTreeReorderEvent(state, {
    type: 'move-node', id: 'branch', parentID: 'leaf',
  }).error.code, 'reorder-tree-cycle');
  assert.equal(applyTreeReorderEvent(state, {
    type: 'move-node', id: 'leaf', parentID: 'root', beforeID: 'other',
  }).error.code, 'reorder-tree-sibling-invalid');
});

test('tree batch reorder moves disjoint subtrees in requested order with one atomic command', () => {
  const state = createTreeReorderState([
    { id: 'left', parentID: null }, { id: 'right', parentID: null },
    { id: 'a', parentID: 'left' }, { id: 'child', parentID: 'a' },
    { id: 'b', parentID: 'left' }, { id: 'c', parentID: 'right' },
  ]);
  const result = applyTreeReorderEvent(state, { type: 'move-nodes', ids: ['b','a'], parentID: 'right', beforeID: 'c' });
  assert.equal(result.ok, true);
  const next = result.value.state, tree = getTreeReorderHierarchy(next);
  assert.deepEqual(tree.childrenOf('left').ids, []);
  assert.deepEqual(tree.childrenOf('right').ids, ['b','a','c']);
  assert.deepEqual(tree.childrenOf('a').ids, ['child']);
  assert.deepEqual(getTreeReorderHierarchy(state).childrenOf('left').ids, ['a','b']);
  assert.equal(result.value.commands.length, 1);
  assert.equal(result.value.commands[0].nodes, next.nodes);
  assert.equal(Object.isFrozen(next.nodes), true);
  const external = applyTreeReorderEvent({ nodes: state.nodes }, { type: 'move-nodes', ids: ['b','a'], parentID: 'right', beforeID: 'c' });
  assert.deepEqual(external.value.state.nodes, next.nodes);
});

test('tree batch reorder rejects invalid roots and destinations without a partial source change', () => {
  const state = createTreeReorderState([
    { id: 'left', parentID: null }, { id: 'right', parentID: null },
    { id: 'a', parentID: 'left' }, { id: 'child', parentID: 'a' }, { id: 'b', parentID: 'left' },
  ]);
  for (const [event, code] of [
    [{ ids: ['b','missing'], parentID: 'right' }, 'reorder-id-missing'],
    [{ ids: ['a','a'], parentID: 'right' }, 'reorder-tree-ids-duplicate'],
    [{ ids: ['child','a'], parentID: 'right' }, 'reorder-tree-move-overlap'],
    [{ ids: ['a','b'], parentID: 'child' }, 'reorder-tree-cycle'],
    [{ ids: ['a','b'], parentID: 'left', beforeID: 'b' }, 'reorder-tree-sibling-invalid'],
    [{ ids: ['a'], parentID: 'right', beforeID: 'b' }, 'reorder-tree-sibling-invalid'],
    [{ ids: [], parentID: 'missing' }, 'reorder-id-missing'],
  ]) {
    const rejected = applyTreeReorderEvent(state, { type: 'move-nodes', ...event });
    assert.equal(rejected.ok, false); assert.equal(rejected.error.code, code);
    assert.deepEqual(getTreeReorderHierarchy(state).childrenOf('left').ids, ['a','b']);
  }
  let reads = 0;
  const oversized = Array(6); Object.defineProperty(oversized, 0, { get() { reads++; throw Error('not admitted'); } });
  assert.equal(applyTreeReorderEvent(state, { type: 'move-nodes', ids: oversized, parentID: 'right' }).error.code, 'reorder-tree-ids-duplicate');
  assert.equal(reads, 0);
  const invalidLength = new Proxy([], { get(target,key) { return key === 'length' ? NaN : Reflect.get(target,key); } });
  assert.equal(applyTreeReorderEvent(state, { type: 'move-nodes', ids: invalidLength, parentID: 'right' }).error.code, 'invalid-boundary');
});

test('tree batch reorder preserves empty and unchanged state identity across interleaved source records', () => {
  const state = createTreeReorderState([
    { id: 'left', parentID: null }, { id: 'right', parentID: null },
    { id: 'a', parentID: 'left' }, { id: 'c', parentID: 'right' }, { id: 'b', parentID: 'left' },
  ]);
  for (const event of [
    { ids: [], parentID: 'right' },
    { ids: ['a','b'], parentID: 'left' },
    { ids: ['a'], parentID: 'left', beforeID: 'b' },
  ]) {
    const update = applyTreeReorderEvent(state, { type: 'move-nodes', ...event }).value;
    assert.equal(update.state, state); assert.deepEqual(update.commands, []);
  }
  const roots = applyTreeReorderEvent(state, { type: 'move-nodes', ids: ['b','a'], parentID: null, beforeID: 'right' }).value.state;
  assert.deepEqual(getTreeReorderHierarchy(roots).roots.ids, ['left','b','a','right']);
});

test('tree batch reorder captures caller fields once and never rereads mutable IDs', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }]);
  const reads = { ids: 0, id: 0, parent: 0, before: 0 };
  const ids = []; Object.defineProperty(ids, 0, { get() { reads.id++; return reads.id === 1 ? 'a' : 'missing'; } });
  const result = applyTreeReorderEvent(state, { type: 'move-nodes',
    get ids() { reads.ids++; return ids; }, get parentID() { reads.parent++; return 'right'; }, get beforeID() { reads.before++; return null; },
  });
  assert.equal(result.ok, true); assert.deepEqual(reads, { ids: 1, id: 1, parent: 1, before: 1 });
  assert.deepEqual(getTreeReorderHierarchy(result.value.state).childrenOf('right').ids, ['a']);
});

test('tree batch reorder constructs one next owner rather than one tree per selected root', () => {
  for (const size of [16,128,4096]) for (const policies of [undefined, { maxDepth: 1, preserveRoots: true, capacity: () => size, canMove: () => true }]) {
    const ids = Array.from({ length: size }, (_, i) => i);
    const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null }, ...ids.map(id => ({ id, parentID: 'left' }))]);
    let writes = 0; const set = Map.prototype.set;
    Map.prototype.set = function(...args) { writes++; return set.apply(this, args); };
    let result;
    try { result = applyTreeReorderEvent(state, { type: 'move-nodes', ids, parentID: 'right' }, policies); }
    finally { Map.prototype.set = set; }
    assert.equal(result.ok, true);
    assert.ok(writes <= 16 * (size + 2), JSON.stringify({ size, writes }));
    assert.deepEqual(getTreeReorderHierarchy(result.value.state).childrenOf('right').ids, ids);
  }
});

test('constrained tree moves keep columns rooted while cards move into empty columns', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null },
    { id: 'a', parentID: 'left' }, { id: 'b', parentID: 'left' }], { maxDepth: 1 });
  const policy = { maxDepth: 1, preserveRoots: true };
  const move = (id, parentID, beforeID = null) => applyTreeReorderEvent(state, { type: 'move-node', id, parentID, beforeID }, policy);
  const reordered = move('right', null, 'left'); assert.equal(reordered.ok, true);
  assert.deepEqual(getTreeReorderHierarchy(reordered.value.state).roots.ids, ['right','left']);
  const assigned = move('a', 'right'); assert.equal(assigned.ok, true);
  assert.deepEqual(getTreeReorderHierarchy(assigned.value.state).childrenOf('right').ids, ['a']);
  assert.equal(move('a', null).error.code, 'reorder-tree-move-rejected');
  assert.equal(move('right', 'left').error.code, 'reorder-tree-move-rejected');
  assert.equal(move('a', 'b').error.code, 'reorder-tree-depth-exceeded');
  assert.deepEqual(getTreeReorderHierarchy(state).childrenOf('left').ids, ['a','b']);
  assert.deepEqual(getTreeReorderHierarchy(state).childrenOf('right').ids, []);
  assert.equal(tryCreateTreeReorderState(state.nodes, { maxDepth: 0 }).error.code, 'reorder-tree-depth-exceeded');
});

test('tree destination capacity counts only incoming roots and permits overfull local reordering', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'middle', parentID: null }, { id: 'right', parentID: null },
    { id: 'a', parentID: 'left' }, { id: 'b', parentID: 'middle' }, { id: 'c', parentID: 'right' }, { id: 'd', parentID: 'right' }]);
  const calls = [], policy = { preserveRoots: true, maxDepth: 1, capacity: parent => { calls.push(parent); return 3; } };
  const refused = applyTreeReorderEvent(state, { type: 'move-nodes', ids: ['a','b','c'], parentID: 'right' }, policy);
  assert.equal(refused.error.code, 'reorder-tree-capacity-exceeded'); assert.deepEqual(calls, ['right']);
  assert.equal(refused.error.details.incoming, 2); assert.equal(refused.error.details.size, 2);
  const accepted = applyTreeReorderEvent(state, { type: 'move-nodes', ids: ['c','a'], parentID: 'right' }, policy);
  assert.equal(accepted.ok, true); assert.deepEqual(getTreeReorderHierarchy(accepted.value.state).childrenOf('right').ids, ['d','c','a']);
  let checked = 0;
  const local = applyTreeReorderEvent(state, { type: 'move-node', id: 'd', parentID: 'right', beforeID: 'c' }, { capacity: () => { checked++; return 0; } });
  assert.equal(local.ok, true); assert.equal(checked, 0); assert.deepEqual(getTreeReorderHierarchy(local.value.state).childrenOf('right').ids, ['d','c']);
  assert.equal(applyTreeReorderEvent(state, { type: 'move-node', id: 'a', parentID: 'right' }, { capacity: () => undefined }).ok, true);
  for (const capacity of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = applyTreeReorderEvent(state, { type: 'move-node', id: 'a', parentID: 'right' }, { capacity: () => capacity });
    assert.equal(result.error.code, capacity === 0 ? 'reorder-tree-capacity-exceeded' : 'invalid-boundary');
  }
});

test('tree permissions and policy getters are captured once before any next owner is constructed', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }, { id: 'b', parentID: 'left' }]);
  const fields = { maxDepth: 0, preserveRoots: 0, canMove: 0, capacity: 0 }, seen = [];
  const policies = Object.fromEntries(Object.entries({ maxDepth: 1, preserveRoots: true,
    canMove: move => { seen.push(move); return move.id !== 'b'; }, capacity: () => { throw Error('capacity must not run after a refusal'); },
  }).map(([key,value]) => [key, { get() { fields[key]++; return value; } }]));
  const supplied = Object.defineProperties({}, policies);
  let writes = 0; const set = Map.prototype.set; Map.prototype.set = function(...args) { writes++; return set.apply(this,args); };
  let rejected;
  try { rejected = applyTreeReorderEvent(state, { type: 'move-nodes', ids: ['a','b'], parentID: 'right' }, supplied); }
  finally { Map.prototype.set = set; }
  assert.equal(rejected.error.code, 'reorder-tree-move-rejected'); assert.equal(writes, 0);
  assert.deepEqual(fields, { maxDepth: 1, preserveRoots: 1, canMove: 1, capacity: 1 });
  assert.deepEqual(seen, [{ id: 'a', previousParentID: 'left', parentID: 'right' }, { id: 'b', previousParentID: 'left', parentID: 'right' }]);
  const fault = Error('application permission failure');
  assert.throws(() => applyTreeReorderEvent(state, { type: 'move-node', id: 'a', parentID: 'right' }, { canMove: () => { throw fault; } }), error => error === fault);
  assert.deepEqual(getTreeReorderHierarchy(state).childrenOf('right').ids, []);
});

test('tree depth constraints cover the entire moved subtree and reject invalid configuration', () => {
  const state = createTreeReorderState([{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }, { id: 'child', parentID: 'a' }]);
  const deep = applyTreeReorderEvent(state, { type: 'move-node', id: 'left', parentID: 'right' }, { maxDepth: 2 });
  assert.equal(deep.error.code, 'reorder-tree-depth-exceeded');
  const lifted = applyTreeReorderEvent(state, { type: 'move-nodes', ids: ['a'], parentID: null }, { maxDepth: 1 });
  assert.equal(lifted.ok, true); assert.equal(getTreeReorderHierarchy(lifted.value.state).depthOf('child'), 1);
  for (const maxDepth of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(tryCreateTreeReorderState(state.nodes, { maxDepth }).error.code, 'invalid-boundary');
    assert.equal(applyTreeReorderEvent(state, { type: 'move-node', id: 'a', parentID: 'right' }, { maxDepth }).error.code, 'invalid-boundary');
  }
  for (const policy of [null, false, [], { preserveRoots: 1 }, { canMove: true }, { capacity: 1 }]) {
    assert.equal(applyTreeReorderEvent(state, { type: 'move-node', id: 'a', parentID: 'right' }, policy).error.code, 'invalid-boundary');
  }
  assert.equal(tryCreateTreeReorderState(state.nodes, []).error.code, 'invalid-boundary');
  let reads = 0; assert.equal(tryCreateTreeReorderState(state.nodes, { get maxDepth() { reads++; return 2; } }).ok, true); assert.equal(reads, 1);
});
