import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampedScrollOffset,
  expectedScrollerExtent,
  expectedScrollerExtentDelta,
  requiresExactTotalHeight,
  visibleContentRange,
} from './baseline-policy.ts';

test('uniform baselines require exact total height in every size mode', () => {
  assert.equal(requiresExactTotalHeight('uniform'), true);
});

test('heterogeneous baselines report unseen-height error separately', () => {
  assert.equal(requiresExactTotalHeight('heterogeneous'), false);
});

test('browser scroll extent is floored by the viewport extent', () => {
  assert.equal(expectedScrollerExtent(144, 480), 480);
  assert.equal(expectedScrollerExtent(504, 480), 504);
  assert.equal(expectedScrollerExtentDelta(144, 216, 480), 0);
  assert.equal(expectedScrollerExtentDelta(432, 504, 480), 24);
  assert.equal(expectedScrollerExtentDelta(7_200, 7_272, 480), 72);
});

test('scroll requests clamp to the browser scroll range', () => {
  assert.equal(clampedScrollOffset(300, 480, 480), 0);
  assert.equal(clampedScrollOffset(800, 720, 480), 240);
  assert.equal(clampedScrollOffset(-20, 720, 480), 0);
});

test('visible content coverage stops at a short collection boundary', () => {
  assert.deepEqual(visibleContentRange(144, 480, 0), { start: 0, end: 144 });
  assert.deepEqual(visibleContentRange(720, 480, 120), { start: 0, end: 480 });
  assert.equal(visibleContentRange(144, 480, 200), null);
});
