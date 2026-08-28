import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionBranchIDs, reconcileCollectionState } from '../.verification-dist/internal/collection.js';

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

test('collection reconciliation preserves an explicit null focus when requested', () => {
  const result = reconcileCollectionState(
    ['a', 'b'],
    ['a'],
    null,
    [],
    'single',
    { preserveNullCurrent: true },
  );
  assert.deepEqual(result.selected, ['a']);
  assert.equal(result.current, null);
  assert.equal(result.currentChanged, false);
});

test('collection branch reconciliation preserves domain order in linear time', () => {
  assert.deepEqual(collectionBranchIDs([
    { id: 'root', parentID: null },
    { id: 'branch', parentID: 'root' },
    { id: 'leaf', parentID: 'branch' },
  ]), ['root', 'branch']);
});
