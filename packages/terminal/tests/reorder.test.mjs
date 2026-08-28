import assert from 'node:assert/strict';
import test from 'node:test';
import { createReorder } from '../.verification-dist/reorder.js';

test('terminal sequence reorder exposes explicit identity movement keys', () => {
  const reorder = createReorder({ ids: ['a', 'b', 'c'], currentID: 'b' });
  assert.equal(reorder.handleKeyboardInput({ key: 'move-down' }), true);
  assert.deepEqual(reorder.getSnapshot().state.ids, ['a', 'c', 'b']);
  assert.equal(reorder.handleKeyboardInput({ key: 'move-start' }), true);
  assert.deepEqual(reorder.getSnapshot().state.ids, ['b', 'a', 'c']);
});

test('terminal tree reorder moves siblings and changes hierarchy explicitly', () => {
  const reorder = createReorder({
    currentID: 'c',
    nodes: [
      { id: 'a', parentID: null },
      { id: 'b', parentID: null },
      { id: 'c', parentID: null },
    ],
  });
  assert.equal(reorder.handleKeyboardInput({ key: 'move-up' }), true);
  assert.deepEqual(reorder.getSnapshot().state.nodes.map((node) => node.id), ['a', 'c', 'b']);
  assert.equal(reorder.handleKeyboardInput({ key: 'indent' }), true);
  assert.equal(reorder.getSnapshot().state.nodes.find((node) => node.id === 'c').parentID, 'a');
  assert.equal(reorder.handleKeyboardInput({ key: 'outdent' }), true);
  assert.equal(reorder.getSnapshot().state.nodes.find((node) => node.id === 'c').parentID, null);
});
