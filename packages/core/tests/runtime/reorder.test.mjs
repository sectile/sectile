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
