import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alignRect,
  boundRects,
  boundsOfRects,
  clampRect,
  createInsets,
  createPoint,
  createRect,
  createSize,
  insetRect,
  intersectRects,
  isFinitePoint,
  isFiniteRect,
  isFiniteSize,
  outsetRect,
  pointDelta,
  rectContainsPoint,
  rectContainsRect,
  rectOverflow,
  rectanglesIntersect,
  tryCreatePoint,
  tryCreateRect,
  tryCreateSize,
} from '../../.verification-dist/structures/geometry.js';

test('finite geometry factories preserve fractional and negative coordinates', () => {
  assert.deepEqual(createPoint({ x: -1.5, y: 2.25 }), { x: -1.5, y: 2.25 });
  assert.deepEqual(createSize({ width: 0, height: 3.5 }), { width: 0, height: 3.5 });
  assert.deepEqual(createRect({ x: -5, y: -4, width: 10, height: 8 }), { x: -5, y: -4, width: 10, height: 8 });
  assert.deepEqual(createInsets({ top: 1, left: 2 }), { top: 1, right: 0, bottom: 0, left: 2 });
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(tryCreateRect({ x: value, y: 0, width: 1, height: 1 }).error.code, 'invalid-boundary');
  }
  assert.equal(tryCreateRect({ x: 0, y: 0, width: -1, height: 1 }).error.code, 'invalid-boundary');
});

test('ISSUE-087: finite geometry factories retain the scalar observation they validate', () => {
  let pointReads = 0;
  const point = tryCreatePoint({
    get x() { pointReads += 1; return pointReads === 1 ? 1 : Number.NaN; },
    y: 2,
  });
  assert.equal(point.ok, true);
  assert.equal(pointReads, 1);
  assert.equal(isFinitePoint(point.value), true);
  assert.deepEqual(point.value, { x: 1, y: 2 });

  let sizeReads = 0;
  const size = tryCreateSize({
    get width() { sizeReads += 1; return sizeReads === 1 ? 3 : -1; },
    height: 4,
  });
  assert.equal(size.ok, true);
  assert.equal(sizeReads, 1);
  assert.equal(isFiniteSize(size.value), true);
  assert.deepEqual(size.value, { width: 3, height: 4 });

  let rectXReads = 0;
  let rectWidthReads = 0;
  const rect = tryCreateRect({
    get x() { rectXReads += 1; return rectXReads === 1 ? 5 : Number.POSITIVE_INFINITY; },
    y: 6,
    get width() { rectWidthReads += 1; return rectWidthReads === 1 ? 7 : -1; },
    height: 8,
  });
  assert.equal(rect.ok, true);
  assert.deepEqual([rectXReads, rectWidthReads], [1, 1]);
  assert.equal(isFiniteRect(rect.value), true);
  assert.deepEqual(rect.value, { x: 5, y: 6, width: 7, height: 8 });
});

test('intersection, containment, and bounds agree with scalar references', () => {
  for (let leftIndex = 0; leftIndex < 64; leftIndex += 1) {
    const left = rectAt(leftIndex);
    for (let rightIndex = 0; rightIndex < 64; rightIndex += 1) {
      const right = rectAt(rightIndex);
      const intersection = intersectRects(left, right);
      const reference = intersectReference(left, right);
      assert.deepEqual(intersection, reference);
      assert.equal(rectanglesIntersect(left, right), reference !== null);
      assert.equal(rectanglesIntersect(left, right), rectanglesIntersect(right, left));
      const bounds = boundRects(left, right);
      assert.equal(rectContainsRect(bounds, left), true);
      assert.equal(rectContainsRect(bounds, right), true);
    }
  }
  const rects = [rectAt(1), rectAt(17), rectAt(42)];
  assert.deepEqual(boundsOfRects(rects), rects.slice(1).reduce(boundRects, rects[0]));
  assert.equal(boundsOfRects([]), null);
  assert.equal(rectContainsPoint({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 10 }), true);
});

test('ISSUE-082: derived rectangle algebra rejects non-finite output without shrinking the valid boundary', () => {
  const endpointOverflow = createRect({ x: 1e308, y: 0, width: 1e308, height: 1 });
  for (const derive of [
    () => boundRects(endpointOverflow, endpointOverflow),
    () => boundsOfRects([endpointOverflow]),
    () => intersectRects(endpointOverflow, endpointOverflow),
  ]) {
    assert.throws(derive, { code: 'invalid-boundary' });
  }

  const farLeft = createRect({ x: -1e308, y: 0, width: 1, height: 1 });
  const farRight = createRect({ x: 1e308, y: 0, width: 1, height: 1 });
  assert.throws(() => boundRects(farLeft, farRight), { code: 'invalid-boundary' });
  assert.throws(() => boundsOfRects([farLeft, farRight]), { code: 'invalid-boundary' });

  const halfMaximum = Number.MAX_VALUE / 2;
  const left = createRect({ x: 0, y: 0, width: halfMaximum, height: 1 });
  const right = createRect({ x: halfMaximum, y: 0, width: halfMaximum, height: 1 });
  const bounds = boundRects(left, right);
  assert.equal(isFiniteRect(bounds), true);
  assert.equal(bounds.width, Number.MAX_VALUE);
  assert.equal(isFiniteRect(boundsOfRects([left, right])), true);
  assert.equal(isFiniteRect(intersectRects(createRect({ x: 0, y: 0, width: Number.MAX_VALUE, height: 1 }), createRect({ x: 0, y: 0, width: Number.MAX_VALUE, height: 1 }))), true);
});

test('inset, outset, overflow, clamp, alignment, and delta are deterministic', () => {
  const rect = createRect({ x: -10, y: 5, width: 100, height: 50 });
  const insets = createInsets({ top: 2, right: 3, bottom: 4, left: 5 });
  assert.deepEqual(insetRect(rect, insets), { x: -5, y: 7, width: 92, height: 44 });
  assert.deepEqual(outsetRect(insetRect(rect, insets), insets), rect);
  assert.deepEqual(rectOverflow({ x: -5, y: 95, width: 20, height: 20 }, { x: 0, y: 0, width: 100, height: 100 }), {
    top: 0, right: 0, bottom: 15, left: 5, total: 20, maximum: 15,
  });
  assert.deepEqual(clampRect({ x: -5, y: 95, width: 20, height: 20 }, { x: 0, y: 0, width: 100, height: 100 }), { x: 0, y: 80, width: 20, height: 20 });
  assert.deepEqual(alignRect({ x: 10, y: 20, width: 40, height: 30 }, { width: 10, height: 8 }, 'top', 'end', 2), { x: 40, y: 10, width: 10, height: 8 });
  assert.deepEqual(pointDelta({ x: -2, y: 4 }, { x: 3, y: -1 }), { x: 5, y: -5 });
});

test('bounds enforce explicit input ceilings', () => {
  assert.throws(() => boundsOfRects([rectAt(0)], { maxRects: 0 }), { code: 'item-ceiling-exceeded' });
  assert.throws(() => boundsOfRects([rectAt(0)], { maxRects: Number.NaN }), { code: 'invalid-boundary' });
});

function rectAt(index) {
  return { x: (index % 8) - 4.5, y: Math.floor(index / 8) - 3.25, width: index % 5, height: (index * 3) % 7 };
}

function intersectReference(left, right) {
  if (!(left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height)) return null;
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const rightEdge = Math.min(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.min(left.y + left.height, right.y + right.height);
  return { x, y, width: Math.max(0, rightEdge - x), height: Math.max(0, bottomEdge - y) };
}
