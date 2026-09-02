import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attainableViewportOffset,
  correctedTargetScroll,
  initialTargetScroll,
  intersectsViewportGeometry,
  sameTargetPositionGeometry,
} from './target-position.ts';

test('places start, middle, and end targets in the library coordinate space', () => {
  const common = { itemCount: 100, scrollHeight: 7_200, targetHeight: 72, viewportHeight: 480 } as const;
  assert.equal(initialTargetScroll({ ...common, targetIndex: 0, location: 'start' }), 0);
  assert.equal(initialTargetScroll({ ...common, targetIndex: 50, location: 'middle' }), 3_396);
  assert.equal(initialTargetScroll({ ...common, targetIndex: 99, location: 'end' }), 6_720);
});

test('corrects from a rendered reference row using the current average size', () => {
  assert.equal(correctedTargetScroll({
    itemCount: 100,
    scrollHeight: 7_200,
    targetHeight: 72,
    targetIndex: 50,
    referenceIndex: 60,
    referenceViewportTop: 12,
    currentScrollTop: 4_300,
    location: 'middle',
    viewportHeight: 480,
  }), 3_388);
});

test('accepts the closest attainable target offset for short and edge-clamped content', () => {
  assert.equal(attainableViewportOffset(72, 408, 480, 480), 72);
  assert.equal(attainableViewportOffset(3_600, 204, 480, 7_200), 204);
  assert.equal(attainableViewportOffset(72, 204, 480, 7_200), 72);
  assert.equal(attainableViewportOffset(7_128, 0, 480, 7_200), 408);
});

test('rejects retained rows outside the current viewport', () => {
  assert.equal(intersectsViewportGeometry(120, 192, 100, 580, 2), true);
  assert.equal(intersectsViewportGeometry(20, 92, 100, 580, 2), false);
  assert.equal(intersectsViewportGeometry(588, 660, 100, 580, 2), false);
});

test('requires scroll and target geometry to settle together', () => {
  const settled = {
    scrollTop: 12_477_020,
    scrollHeight: 12_477_500,
    targetViewportTop: 389,
    targetHeight: 91,
    scrollLeft: 2_400,
    targetViewportLeft: 312,
    targetWidth: 96,
  } as const;
  assert.equal(sameTargetPositionGeometry(settled, {
    ...settled,
    scrollTop: settled.scrollTop + 1,
    targetViewportTop: settled.targetViewportTop - 1,
  }, 2), true);
  assert.equal(sameTargetPositionGeometry(settled, {
    ...settled,
    scrollHeight: settled.scrollHeight - 34,
  }, 2), false);
  assert.equal(sameTargetPositionGeometry(settled, {
    ...settled,
    targetHeight: settled.targetHeight + 34,
  }, 2), false);
  assert.equal(sameTargetPositionGeometry(settled, {
    ...settled,
    targetViewportLeft: settled.targetViewportLeft + 34,
  }, 2), false);
});
