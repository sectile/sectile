import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prepareVirtualList,
  updatePreparedVirtualList,
} from '../.verification-dist/internal/virtual-collection-model.js';

const key = (value) => value.id;

test('Vue virtual collection compatibility delegates to the Virtual-owned projection', () => {
  const source = Object.freeze([
    Object.freeze({ id: 'a' }),
    Object.freeze({ id: 'b' }),
  ]);
  const prepared = prepareVirtualList(source, key, 10);
  const inserted = Object.freeze({ id: 'x' });
  const next = updatePreparedVirtualList(
    prepared,
    Object.freeze([source[0], inserted, source[1]]),
    key,
  );

  assert.equal(prepared.items, source);
  assert.equal(prepared.getID, key);
  assert.deepEqual(next.change, {
    index: 1,
    deleteCount: 0,
    inserted: ['x'],
  });
});
