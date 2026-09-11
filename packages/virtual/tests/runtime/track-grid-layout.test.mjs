/* Law evidence: GRD-01 GRD-02 GRD-03 GRD-04 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtentIndex, createUniformExtentIndex } from '../../.verification-dist/extent-index.js';
import { createRegionOverlapWork, findRegionOverlap } from '../../.verification-dist/internal/region-overlap.js';
import {
  applyGridMeasurements,
  applyTrackGridMutation,
  createDenseTrackGridLayout,
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

test('ISSUE-092: sparse region overlap validation stays subquadratic for wide active sets', () => {
  const count = 4_096;
  const rows = createUniformExtentIndex(1, exact(1), { maxItems: 1 });
  const columns = createUniformExtentIndex(count, exact(1), { maxItems: count });
  const regions = Array.from({ length: count }, (_, column) => ({ id: `wide-${column}`, row: 0, column }));
  const created = tryCreateTrackGridLayout(rows, columns, regions, { maxRegions: count });
  assert.equal(created.ok, true);
  assert.equal(created.value.regions.size, count);

  const sameRow = Array.from({ length: count }, (_, index) => ({
    value: { id: `same-${index}`, row: 0, column: index * 2 },
    index,
    rowEnd: 1,
    columnEnd: index * 2 + 1,
  }));
  const longSpan = Array.from({ length: count }, (_, index) => ({
    value: { id: `span-${index}`, row: index, column: index * 2 },
    index,
    rowEnd: count + index + 1,
    columnEnd: index * 2 + 1,
  }));
  const logarithmicCeiling = Math.ceil(Math.log2(count)) + 1;
  for (const fixture of [sameRow, longSpan]) {
    const work = createRegionOverlapWork();
    assert.equal(findRegionOverlap(fixture, work), null);
    assert.equal(work.insertions, count);
    assert.ok(work.candidateChecks <= count - 1, work);
    assert.ok(work.binarySearchSteps <= 2 * count * logarithmicCeiling, work);
    assert.ok(work.treeSteps <= 3 * count * logarithmicCeiling, work);
  }

  const overlapping = [
    { value: { id: 'left', row: 0, column: 0 }, index: 0, rowEnd: 10, columnEnd: 3 },
    { value: { id: 'right', row: 5, column: 2 }, index: 1, rowEnd: 6, columnEnd: 4 },
  ];
  assert.deepEqual(findRegionOverlap(overlapping)?.map(({ value }) => value.id), ['left', 'right']);
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
  assert.deepEqual(inserted.state.regions.toArray(), [{ id: 'anchor', row: 3, column: 2 }]);
  assert.ok(trackGridRegionRect(inserted.state, anchor.id) !== null);
});

test('dense grid patches derive regions and visible placements from sequence indices', () => {
  const rows = createExtentIndex(Array.from({ length: 4 }, () => exact(20)));
  const columns = createExtentIndex(Array.from({ length: 3 }, () => exact(30)));
  const state = createDenseTrackGridLayout(rows, columns, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(state.regions.at(4), { id: 'e', row: 1, column: 1 });
  const changed = applyTrackGridMutation(state, {
    type: 'patch-dense-regions',
    patch: { type: 'splice', index: 1, deleteCount: 2, inserted: ['x', 'y', 'z'] },
  }).state;
  assert.equal(changed.regions.size, 6);
  assert.deepEqual([...changed.regions.iterate()].map(({ id, row, column }) => [id, row, column]), [
    ['a', 0, 0],
    ['x', 0, 1],
    ['y', 0, 2],
    ['z', 1, 0],
    ['d', 1, 1],
    ['e', 1, 2],
  ]);
  assert.deepEqual(
    queryTrackGridLayout(changed, { viewport: { x: 0, y: 20, width: 90, height: 20 } })
      .placements.map(({ id, index }) => [id, index]),
    [['z', 3], ['d', 4], ['e', 5]],
  );
  assert.deepEqual(trackGridRegionRect(changed, 'd'), { x: 30, y: 20, width: 30, height: 20 });
});
