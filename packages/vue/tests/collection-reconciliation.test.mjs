import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileCollectionState } from '../dist/internal/collection.js';

test('collection reconciliation follows domain order and removes stale identities', () => {
  const result = reconcileCollectionState(
    ['c', 'a'],
    ['a', 'missing', 'c'],
    'missing',
    [],
    'multiple',
  );
  assert.deepEqual(result.selected, ['c', 'a']);
  assert.equal(result.current, 'c');
  assert.equal(result.selectionChanged, true);
  assert.equal(result.currentChanged, true);
});

test('collection reconciliation narrows single selection and skips disabled focus', () => {
  const result = reconcileCollectionState(['a', 'b'], ['a', 'b'], 'a', ['a'], 'single');
  assert.deepEqual(result.selected, ['a']);
  assert.equal(result.current, 'b');
});
