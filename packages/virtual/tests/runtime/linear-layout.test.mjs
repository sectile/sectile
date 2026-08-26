/* Law evidence: VRT-01 VRT-02 VRT-03 VRT-04 VRT-05 VRT-06 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCollectionWindowState } from '@sectile/core/collection-window';
import { createSequence } from '@sectile/core/sequence';
import { createExtentIndex } from '../../.verification-dist/extent-index.js';
import {
  applyLinearMeasurements,
  applyLinearPatch,
  collectionWindowEventForLinearPlan,
  createLinearLayout,
  linearScrollTarget,
  queryLinearLayout,
  tryApplyLinearMeasurements,
} from '../../.verification-dist/linear-layout.js';
import {
  applyGridMeasurements,
  applyTrackGridMutation,
  createTrackGridLayout,
  queryTrackGridLayout,
  trackGridRegionRect,
} from '../../.verification-dist/track-grid-layout.js';
import {
  applyMasonryMeasurements,
  applyMasonryMutation,
  createMasonryLayout,
  masonryRectAt,
  queryMasonryLayout,
} from '../../.verification-dist/masonry-layout.js';

const estimated = (value) => ({ kind: 'estimated', value });
const exact = (value) => ({ kind: 'exact', value });
const domain = (size, prefix = 'item') => createSequence(
  Array.from({ length: size }, (_, index) => `${prefix}-${index}`),
  { maxItems: Math.max(size, 1) },
);

test('VRT-01: render placements contain visible placements across axes and flows', () => {
  const state = createLinearLayout(domain(100), createExtentIndex(Array(100).fill(estimated(10))), { crossExtent: 100 });
  const plan = queryLinearLayout(state, { viewport: { x: 0, y: 250, width: 100, height: 100 }, overscan: 50 });
  assert.deepEqual(plan.placements.map(({ index }) => index), Array.from({ length: 20 }, (_, index) => index + 20));
  assert.deepEqual(plan.placements.filter(({ visible }) => visible).map(({ index }) => index), Array.from({ length: 10 }, (_, index) => index + 25));

  const horizontalReverse = createLinearLayout(domain(3), createExtentIndex([exact(10), exact(20), exact(30)]), {
    axis: 'horizontal', flow: 'reverse', gap: 2, crossExtent: 40,
  });
  assert.deepEqual(queryLinearLayout(horizontalReverse, { viewport: { x: 0, y: 0, width: 64, height: 40 } }).placements.map(({ index, rect }) => [index, rect.x]), [[0, 54], [1, 32], [2, 0]]);
});

test('VRT-02, VRT-03: measurements preserve the anchor and reject stale generations', () => {
  const state = createLinearLayout(domain(100), createExtentIndex(Array(100).fill(estimated(10))), { crossExtent: 100 });
  const plan = queryLinearLayout(state, { viewport: { x: 0, y: 250, width: 100, height: 100 } });
  const changed = applyLinearMeasurements(state, {
    generation: plan.generation,
    anchor: plan.anchor,
    measurements: [{ index: 0, extent: exact(15) }],
  });
  assert.deepEqual(changed.scrollDelta, { x: 0, y: 5 });
  assert.equal(tryApplyLinearMeasurements(changed.state, { generation: plan.generation, measurements: [] }).ok, false);
});

test('VRT-04: sequence patches preserve surviving viewport anchors', () => {
  const state = createLinearLayout(domain(10), createExtentIndex(Array(10).fill(exact(10))), { crossExtent: 100 });
  const plan = queryLinearLayout(state, { viewport: { x: 0, y: 50, width: 100, height: 30 } });
  const changed = applyLinearPatch(state, {
    patch: { type: 'splice', index: 0, deleteCount: 0, inserted: ['inserted'] },
    insertedExtents: [exact(20)],
  }, plan.anchor);
  assert.equal(changed.state.domain.at(0), 'inserted');
  assert.deepEqual(changed.scrollDelta, { x: 0, y: 20 });
});

test('VRT-05: target scrolling returns an explicit two-dimensional offset', () => {
  const state = createLinearLayout(domain(20), createExtentIndex(Array(20).fill(exact(10))), { crossExtent: 100 });
  assert.deepEqual(linearScrollTarget(state, 'item-15', { x: 0, y: 0, width: 100, height: 50 }, 'center'), { x: 0, y: 130 });
});

test('VRT-06: data loading remains a generation-bound collection-window concern', () => {
  const state = createLinearLayout(domain(100), createExtentIndex(Array(100).fill(exact(10))), { crossExtent: 100 });
  const plan = queryLinearLayout(state, { viewport: { x: 0, y: 500, width: 100, height: 50 }, overscan: 20 });
  const collection = createCollectionWindowState({ start: 50, size: 5, total: 100 });
  assert.deepEqual(collectionWindowEventForLinearPlan(plan, collection, domain(5, 'loaded')), { ok: true, value: { type: 'request-window', direction: 'after', anchor: 'loaded-4' } });
});

test('VRT-01, VRT-05: sparse track grids project merged, reversed, two-dimensional regions', () => {
  const grid = createTrackGridLayout(
    createExtentIndex([exact(20), exact(30), exact(40)]),
    createExtentIndex([exact(50), exact(60), exact(70)]),
    [
      { id: 'title', row: 0, column: 0, columnSpan: 2 },
      { id: 'value', row: 2, column: 2 },
    ],
    { rowGap: 2, columnGap: 3, rowFlow: 'reverse' },
  );
  assert.deepEqual(trackGridRegionRect(grid, 'title'), { x: 0, y: 74, width: 113, height: 20 });
  const plan = queryTrackGridLayout(grid, { viewport: { x: 40, y: 0, width: 100, height: 100 } });
  assert.deepEqual(plan.rowRange, { start: 0, end: 3 });
  assert.deepEqual(plan.placements.map(({ id }) => id), ['title', 'value']);
});

test('VRT-02, VRT-03, VRT-04: grid measurements and track splices preserve explicit anchors', () => {
  const grid = createTrackGridLayout(
    createExtentIndex([exact(20), estimated(20), exact(20)]),
    createExtentIndex([exact(50)]),
    [{ id: 'anchor', row: 2, column: 0 }],
  );
  const measured = applyGridMeasurements(grid, {
    generation: 0,
    anchor: { id: 'anchor', viewportOffset: { x: 0, y: 0 } },
    measurements: [{ axis: 'row', index: 0, extent: exact(30) }],
  });
  assert.deepEqual(measured.scrollDelta, { x: 0, y: 10 });
  const inserted = applyTrackGridMutation(measured.state, {
    type: 'splice-tracks', axis: 'row', index: 0, deleteCount: 0, inserted: [exact(5)],
  }, { id: 'anchor', viewportOffset: { x: 0, y: 0 } });
  assert.deepEqual(trackGridRegionRect(inserted.state, 'anchor'), { x: 0, y: 55, width: 50, height: 20 });
  assert.deepEqual(inserted.scrollDelta, { x: 0, y: 5 });
});

test('VRT-01, VRT-05: masonry queries balanced lanes across axes and reverse flow', () => {
  const masonry = createMasonryLayout(
    domain(4),
    createExtentIndex([exact(40), exact(20), exact(30), exact(50)]),
    { laneCount: 2, laneExtent: 100, laneGap: 10, itemGap: 5, flow: 'reverse' },
  );
  assert.deepEqual(masonryRectAt(masonry, 'item-0'), { x: 0, y: 55, width: 100, height: 40 });
  assert.deepEqual(masonryRectAt(masonry, 'item-3'), { x: 0, y: 0, width: 100, height: 50 });
  assert.deepEqual(queryMasonryLayout(masonry, { viewport: { x: 105, y: 0, width: 105, height: 60 } }).placements.map(({ id }) => id), ['item-2']);
});

test('VRT-02, VRT-03, VRT-04: masonry measurements and responsive geometry preserve anchors', () => {
  const masonry = createMasonryLayout(
    domain(4),
    createExtentIndex([exact(40), estimated(20), exact(30), exact(50)]),
    { laneCount: 2, laneExtent: 100, itemGap: 5 },
  );
  const measured = applyMasonryMeasurements(masonry, {
    generation: 0,
    anchor: { id: 'item-3', viewportOffset: { x: 0, y: 0 } },
    measurements: [{ index: 1, extent: exact(60) }],
  });
  assert.deepEqual(measured.scrollDelta, { x: 100, y: 20 });
  const responsive = applyMasonryMutation(measured.state, {
    type: 'geometry', laneCount: 1, laneExtent: 200,
  }, { id: 'item-3', viewportOffset: { x: 0, y: 0 } });
  assert.deepEqual(masonryRectAt(responsive.state, 'item-3'), { x: 0, y: 145, width: 200, height: 50 });
});
