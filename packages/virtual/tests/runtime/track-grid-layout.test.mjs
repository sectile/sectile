/* Law evidence: GRD-01 GRD-02 GRD-03 GRD-04 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtentIndex } from '../../.verification-dist/extent-index.js';
import {
  applyGridMeasurements,
  applyTrackGridMutation,
  createTrackGridLayout,
  queryTrackGridLayout,
  trackGridRegionRect,
  tryApplyGridMeasurements,
  tryApplyTrackGridMutation,
  tryCreateTrackGridLayout,
} from '../../.verification-dist/track-grid-layout.js';

const exact = (value) => ({ kind: 'exact', value });

function intersects(left, right) {
  return left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height;
}

test('GRD-01: sparse region queries equal a full region scan', () => {
  const rows = createExtentIndex(Array.from({ length: 80 }, (_, index) => exact(10 + (index % 7))));
  const columns = createExtentIndex(Array.from({ length: 50 }, (_, index) => exact(12 + (index % 5))));
  const regions = Array.from({ length: 200 }, (_, index) => ({
    id: `cell-${index}`,
    row: Math.floor(index / 10) * 3,
    column: (index % 10) * 4,
    rowSpan: index % 3 === 0 ? 2 : 1,
    columnSpan: index % 4 === 0 ? 3 : 1,
  }));
  const state = createTrackGridLayout(rows, columns, regions, { rowGap: 1, columnGap: 2 });
  for (let step = 0; step < 48; step += 1) {
    const viewport = { x: (step * 79) % 600, y: (step * 101) % 900, width: 137, height: 149 };
    const expected = regions.filter(({ id }) => intersects(trackGridRegionRect(state, id), viewport)).map(({ id }) => id);
    assert.deepEqual(queryTrackGridLayout(state, { viewport }).placements.map(({ id }) => id), expected);
  }
});

test('GRD-02: merged regions reflect exactly across reversed row and column flows', () => {
  const rows = createExtentIndex([exact(20), exact(30), exact(40)]);
  const columns = createExtentIndex([exact(50), exact(60), exact(70)]);
  const regions = [
    { id: 'merged', row: 0, column: 0, rowSpan: 2, columnSpan: 2 },
    { id: 'tail', row: 2, column: 2 },
  ];
  const forward = createTrackGridLayout(rows, columns, regions, { rowGap: 2, columnGap: 3 });
  const reverse = createTrackGridLayout(rows, columns, regions, {
    rowGap: 2,
    columnGap: 3,
    rowFlow: 'reverse',
    columnFlow: 'reverse',
  });
  const content = queryTrackGridLayout(forward, { viewport: { x: 0, y: 0, width: 1_000, height: 1_000 } }).contentSize;
  for (const { id } of regions) {
    const left = trackGridRegionRect(forward, id);
    const right = trackGridRegionRect(reverse, id);
    assert.equal(left.x + right.x + left.width, content.width);
    assert.equal(left.y + right.y + left.height, content.height);
  }
});

test('GRD-03: overlap and region-splitting track mutations reject atomically', () => {
  const rows = createExtentIndex([exact(10), exact(10), exact(10)]);
  const columns = createExtentIndex([exact(10), exact(10), exact(10)]);
  assert.equal(tryCreateTrackGridLayout(rows, columns, [
    { id: 'left', row: 0, column: 0, columnSpan: 2 },
    { id: 'overlap', row: 0, column: 1 },
  ]).ok, false);

  const state = createTrackGridLayout(rows, columns, [{ id: 'merged', row: 0, column: 0, rowSpan: 2 }]);
  const rejected = tryApplyTrackGridMutation(state, {
    type: 'splice-tracks',
    axis: 'row',
    index: 1,
    deleteCount: 0,
    inserted: [exact(5)],
  });
  assert.equal(rejected.ok, false);
  assert.equal(state.rows.size, 3);
  assert.deepEqual(trackGridRegionRect(state, 'merged'), { x: 0, y: 0, width: 10, height: 20 });
});

test('GRD-04: row and column measurements preserve the index, anchor, and generation contract', () => {
  const state = createTrackGridLayout(
    createExtentIndex([exact(10), exact(20), exact(30)]),
    createExtentIndex([exact(40), exact(50), exact(60)]),
    [{ id: 'anchor', row: 2, column: 2 }],
  );
  const anchor = { id: 'anchor', viewportOffset: { x: 0, y: 0 } };
  const before = trackGridRegionRect(state, anchor.id);
  const measured = applyGridMeasurements(state, {
    generation: state.generation,
    anchor,
    measurements: [
      { axis: 'row', index: 0, extent: exact(15) },
      { axis: 'column', index: 1, extent: exact(70) },
    ],
  });
  const after = trackGridRegionRect(measured.state, anchor.id);
  assert.deepEqual(measured.scrollDelta, { x: after.x - before.x, y: after.y - before.y });
  assert.equal(tryApplyGridMeasurements(measured.state, { generation: state.generation, measurements: [] }).ok, false);

  const inserted = applyTrackGridMutation(measured.state, {
    type: 'splice-tracks', axis: 'row', index: 0, deleteCount: 0, inserted: [exact(7)],
  }, anchor);
  assert.deepEqual(inserted.state.regions, [{ id: 'anchor', row: 3, column: 2 }]);
  assert.ok(trackGridRegionRect(inserted.state, anchor.id) !== null);
});
