/* Law evidence: SUR-01 SUR-02 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/core/sequence';
import { createExtentIndex } from '../../.verification-dist/extent-index.js';
import {
  createLinearLayout,
  queryLinearLayout,
} from '../../.verification-dist/linear-layout.js';
import {
  createMasonryLayout,
  queryMasonryLayout,
} from '../../.verification-dist/masonry-layout.js';
import {
  createPartitionedTrackGridLayout,
  queryPartitionedTrackGridLayout,
} from '../../.verification-dist/partitioned-track-grid-layout.js';
import {
  createSpatialLayout,
  querySpatialLayout,
} from '../../.verification-dist/spatial-layout.js';
import {
  createVirtualSurfaceFrame,
  surfaceFrameScrollDelta,
  toScrollportPoint,
  toVirtualViewport,
} from '../../.verification-dist/surface.js';
import {
  createTrackGridLayout,
  queryTrackGridLayout,
} from '../../.verification-dist/track-grid-layout.js';
import { normalizeQuery } from '../../.verification-dist/layout.js';

const exact = (value) => ({ kind: 'exact', value });

function assertGeometryFailure(operation) {
  assert.throws(operation, (error) =>
    error !== null
    && typeof error === 'object'
    && error.code === 'virtual-layout-geometry-invalid');
}

function assertNonNegativeRect(rect) {
  assert.equal(Number.isFinite(rect.x), true);
  assert.equal(Number.isFinite(rect.y), true);
  assert.equal(Number.isFinite(rect.width), true);
  assert.equal(Number.isFinite(rect.height), true);
  assert.equal(rect.x >= 0, true);
  assert.equal(rect.y >= 0, true);
  assert.equal(rect.width >= 0, true);
  assert.equal(rect.height >= 0, true);
}

test('SUR-01: surface frames project viewport and target coordinates through one inverse contract', () => {
  const frame = createVirtualSurfaceFrame({
    origin: { x: 40, y: 120 },
    viewportInsets: { top: 10, right: 5, bottom: 20, left: 15 },
  });

  assert.deepEqual(toVirtualViewport(
    { x: 7, y: 50, width: 200, height: 100 },
    frame,
  ), {
    x: -18,
    y: -60,
    width: 180,
    height: 70,
  });

  const surfaceTarget = { x: 30, y: 80 };
  const scrollportTarget = toScrollportPoint(surfaceTarget, frame);
  assert.deepEqual(scrollportTarget, { x: 55, y: 190 });
  assert.deepEqual(toVirtualViewport({
    x: scrollportTarget.x,
    y: scrollportTarget.y,
    width: 0,
    height: 0,
  }, frame), {
    x: surfaceTarget.x,
    y: surfaceTarget.y,
    width: 0,
    height: 0,
  });

  const next = createVirtualSurfaceFrame({
    origin: { x: 55, y: 130 },
    viewportInsets: { top: 4, right: 5, bottom: 20, left: 20 },
  });
  assert.deepEqual(surfaceFrameScrollDelta(frame, next), { x: 10, y: 16 });
  assert.equal(Object.isFrozen(frame), true);
  assert.equal(Object.isFrozen(frame.origin), true);
  assert.equal(Object.isFrozen(frame.viewportInsets), true);
});

test('surface frame boundaries reject forged, negative, and overflowing geometry', () => {
  assertGeometryFailure(() => createVirtualSurfaceFrame({
    origin: { x: Number.NaN },
  }));
  assertGeometryFailure(() => createVirtualSurfaceFrame({
    viewportInsets: { top: -1 },
  }));
  assertGeometryFailure(() => toVirtualViewport(
    { x: 0, y: 0, width: -1, height: 10 },
    createVirtualSurfaceFrame(),
  ));
  assertGeometryFailure(() => toVirtualViewport(
    { x: 0, y: 0, width: 10, height: 10 },
    {
      origin: { x: 0, y: 0 },
      viewportInsets: { top: 0, right: 0, bottom: 0, left: Number.POSITIVE_INFINITY },
    },
  ));
  assertGeometryFailure(() => toScrollportPoint(
    { x: Number.MAX_VALUE, y: 0 },
    createVirtualSurfaceFrame({ origin: { x: Number.MAX_VALUE } }),
  ));
});

test('SUR-02: negative viewports keep their origin while render bounds normalize each edge', () => {
  const normalized = normalizeQuery({
    viewport: { x: -30, y: -12, width: 10, height: 4 },
    overscan: { top: 3, right: 25, bottom: 20, left: 7 },
  });
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.value.viewport, {
    x: -30,
    y: -12,
    width: 10,
    height: 4,
  });
  assert.deepEqual(normalized.value.renderBounds, {
    x: 0,
    y: 0,
    width: 5,
    height: 12,
  });

  const overflow = normalizeQuery({
    viewport: {
      x: Number.MAX_VALUE,
      y: 0,
      width: Number.MAX_VALUE,
      height: 1,
    },
  });
  assert.equal(overflow.ok, false);
  assert.equal(overflow.error.code, 'virtual-layout-geometry-invalid');
});

test('SUR-02: every Virtual layout accepts the same negative-origin and overscan contract', () => {
  const linearDomain = createSequence(['linear']);
  const linearExtents = createExtentIndex([exact(10)]);
  const layouts = [
    {
      name: 'linear vertical',
      id: 'linear',
      query: (input) => queryLinearLayout(
        createLinearLayout(linearDomain, linearExtents, { crossExtent: 10 }),
        input,
      ),
    },
    {
      name: 'linear horizontal',
      id: 'linear-horizontal',
      query: (input) => queryLinearLayout(
        createLinearLayout(
          createSequence(['linear-horizontal']),
          createExtentIndex([exact(10)]),
          { axis: 'horizontal', crossExtent: 10 },
        ),
        input,
      ),
    },
    {
      name: 'masonry',
      id: 'masonry',
      query: (input) => queryMasonryLayout(
        createMasonryLayout(
          createSequence(['masonry']),
          createExtentIndex([exact(10)]),
          { laneCount: 1, laneExtent: 10 },
        ),
        input,
      ),
    },
    {
      name: 'track grid',
      id: 'grid',
      query: (input) => queryTrackGridLayout(
        createTrackGridLayout(
          createExtentIndex([exact(10)]),
          createExtentIndex([exact(10)]),
          [{ id: 'grid', row: 0, column: 0 }],
        ),
        input,
      ),
    },
    {
      name: 'partitioned track grid',
      id: 'partitioned',
      query: (input) => queryPartitionedTrackGridLayout(
        createPartitionedTrackGridLayout(
          [{ id: 'row', partition: 'center', extent: exact(10) }],
          [{ id: 'column', partition: 'center', extent: exact(10) }],
          [{ id: 'partitioned', row: 'row', column: 'column' }],
        ),
        input,
      ),
    },
    {
      name: 'spatial',
      id: 'spatial',
      query: (input) => querySpatialLayout(
        createSpatialLayout([
          { id: 'spatial', rect: { x: 0, y: 0, width: 10, height: 10 } },
        ]),
        input,
      ),
    },
  ];

  for (const layout of layouts) {
    const before = layout.query({
      viewport: { x: -20, y: -20, width: 10, height: 10 },
    });
    assert.deepEqual(before.renderBounds, {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }, `${layout.name} before-surface render bounds`);
    assert.deepEqual(before.placements, [], `${layout.name} before-surface placements`);

    const overscanned = layout.query({
      viewport: { x: -20, y: -20, width: 10, height: 10 },
      overscan: { right: 15, bottom: 15 },
    });
    assertNonNegativeRect(overscanned.renderBounds);
    assert.deepEqual(
      overscanned.placements.map(({ id, visible }) => [id, visible]),
      [[layout.id, false]],
      `${layout.name} trailing overscan placements`,
    );

    const entered = layout.query({
      viewport: { x: -5, y: -5, width: 10, height: 10 },
    });
    assertNonNegativeRect(entered.renderBounds);
    assert.deepEqual(
      entered.placements.map(({ id, visible }) => [id, visible]),
      [[layout.id, true]],
      `${layout.name} entered-surface placements`,
    );
  }
});
