import assert from 'node:assert/strict';
import test from 'node:test';
import { createCascadeSelect } from '../.verification-dist/cascade-select.js';

const nodes = [{ id: 'a', parentID: null }, { id: 'b', parentID: null }, { id: 'a1', parentID: 'a' }, { id: 'a2', parentID: 'a' }];

test('Terminal cascade select traverses levels and commits leaves', () => {
  const select = createCascadeSelect({ nodes, defaultOpen: true, defaultHighlightedValue: 'a' });
  assert.equal(select.handleKeyboardInput({ key: 'right' }), true); assert.equal(select.getSnapshot().state.highlighted, 'a1');
  assert.equal(select.handleKeyboardInput({ key: 'down' }), true); assert.equal(select.getSnapshot().state.highlighted, 'a2');
  assert.equal(select.handleKeyboardInput({ key: 'enter' }), true); assert.equal(select.getSnapshot().state.value, 'a2'); assert.deepEqual(select.getValuePath(), ['a', 'a2']);
});

test('Terminal cascade select skips disabled siblings', () => {
  const select = createCascadeSelect({ nodes, disabledItems: ['b'], defaultOpen: true, defaultHighlightedValue: 'a' });
  select.handleKeyboardInput({ key: 'down' }); assert.equal(select.getSnapshot().state.highlighted, 'a');
});
