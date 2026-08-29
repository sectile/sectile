import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBlockedVector,
  createOwnedBlockedVector,
} from '../../.verification-dist/internal/blocked-vector.js';

test('blocked vector owns input blocks and path-copies touched leaves', () => {
  const values = Array.from({ length: 130 }, (_, index) => index);
  const vector = createBlockedVector(values);
  values[0] = 999;

  assert.equal(vector.at(0), 0);
  assert.equal(vector.at(64), 64);
  assert.equal(vector.at(129), 129);
  assert.deepEqual([...vector.iterate()], Array.from({ length: 130 }, (_, index) => index));

  const update = vector.updateDetailed([[0, -1], [64, -2], [129, -3]]);
  assert.equal(update.copiedEntries, 130);
  assert.equal(vector.at(0), 0);
  assert.equal(update.vector.at(0), -1);
  assert.equal(update.vector.at(64), -2);
  assert.equal(update.vector.at(129), -3);
  assert.deepEqual(update.vector.view.toArray().slice(-2), [128, -3]);
});

test('owned blocked vector freezes and reuses its internal rebuild array', () => {
  const values = Array.from({ length: 128 }, (_, index) => index);
  const vector = createOwnedBlockedVector(values);

  assert.equal(Object.isFrozen(values), true);
  assert.throws(() => { values[0] = -1; }, TypeError);
  assert.equal(vector.at(0), 0);
  assert.equal(vector.at(127), 127);
});
