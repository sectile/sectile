import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldCommitMeasuredHeight } from './react-virtualized-measurement.ts';

test('commits an unmeasured react-virtualized row once', () => {
  assert.equal(shouldCommitMeasuredHeight(false, 72, 72), true);
});

test('does not recompute a react-virtualized row when its measured height is stable', () => {
  assert.equal(shouldCommitMeasuredHeight(true, 72, 72), false);
});

test('recomputes a react-virtualized row after its height changes', () => {
  assert.equal(shouldCommitMeasuredHeight(true, 72, 96), true);
});
