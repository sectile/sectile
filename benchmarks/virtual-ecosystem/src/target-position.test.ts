import assert from 'node:assert/strict';
import test from 'node:test';
import {
  correctedTargetScroll,
  initialTargetScroll,
  intersectsViewportGeometry,
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

test('rejects retained rows outside the current viewport', () => {
  assert.equal(intersectsViewportGeometry(120, 192, 100, 580, 2), true);
  assert.equal(intersectsViewportGeometry(20, 92, 100, 580, 2), false);
  assert.equal(intersectsViewportGeometry(588, 660, 100, 580, 2), false);
});
