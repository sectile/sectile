import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySequenceReorderEvent,
  applyTreeReorderEvent,
  createSequenceReorderState,
  createTreeReorderState,
} from '../../.verification-dist/reorder.js';

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
