/* Law evidence: PTG-01 PTG-02 PTG-03 PTG-04 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPartitionedTrackGridMeasurements,
  applyPartitionedTrackGridMutation,
  createPartitionedTrackGridLayout,
  partitionedTrackGridScrollTarget,
  queryPartitionedTrackGridLayout,
  restorePartitionedTrackGridLayout,
  snapshotPartitionedTrackGridLayout,
  tryApplyPartitionedTrackGridMeasurements,
  tryApplyPartitionedTrackGridMutation,
  tryCreatePartitionedTrackGridLayout,
} from '../../.verification-dist/partitioned-track-grid-layout.js';
import { readRepairDiagnostics } from '../../.verification-dist/internal/repair-diagnostics.js';

const exact = (value) => ({ kind: 'exact', value });
const estimated = (value) => ({ kind: 'estimated', value });

function fixture() {
  return createPartitionedTrackGridLayout(
    [
      { id: 'header', partition: 'start', extent: exact(10) },
      { id: 'body-a', partition: 'center', extent: exact(20) },
      { id: 'body-b', partition: 'center', extent: exact(30) },
      { id: 'footer', partition: 'end', extent: exact(15) },
    ],
    [
      { id: 'left', partition: 'start', extent: exact(40) },
      { id: 'middle', partition: 'center', extent: estimated(100) },
      { id: 'right', partition: 'end', extent: exact(50) },
    ],
    [
      { id: 'header-left', row: 'header', column: 'left' },
      { id: 'header-middle', row: 'header', column: 'middle' },
      { id: 'body-left', row: 'body-a', column: 'left' },
      { id: 'body-middle', row: 'body-a', column: 'middle' },
      { id: 'body-right', row: 'body-b', column: 'right' },
      { id: 'footer-right', row: 'footer', column: 'right' },
    ],
  );
}

test('PTG-01: logical partitions project to viewport edges with deterministic overlap layers', () => {
  const state = fixture();
  const viewport = { x: 60, y: 15, width: 180, height: 100 };
  const plan = queryPartitionedTrackGridLayout(state, { viewport });
  const byID = new Map(plan.placements.map((placement) => [placement.id, placement]));

  assert.deepEqual(byID.get('header-left')?.rect, { x: 60, y: 15, width: 40, height: 10 });
  assert.equal(byID.get('header-left')?.zIndex, 2);
  assert.deepEqual(byID.get('body-left')?.rect, { x: 60, y: 10, width: 40, height: 20 });
  assert.equal(byID.get('body-left')?.zIndex, 1);
  assert.deepEqual(byID.get('body-right')?.rect, { x: 190, y: 30, width: 50, height: 30 });
  assert.equal(byID.get('body-right')?.zIndex, 1);
  assert.deepEqual(byID.get('footer-right')?.rect, { x: 190, y: 100, width: 50, height: 15 });
  assert.equal(byID.get('footer-right')?.zIndex, 2);
  assert.equal(plan.pinnedStartWidth, 40);
  assert.equal(plan.pinnedEndWidth, 50);
  assert.equal(plan.pinnedStartHeight, 10);
  assert.equal(plan.pinnedEndHeight, 15);
});

test('PTG-02: measurement follows track identity across reorder and partition mutation', () => {
  const state = fixture();
  const measured = applyPartitionedTrackGridMeasurements(state, {
    generation: state.generation,
    measurements: [{ axis: 'column', id: 'middle', extent: exact(120) }],
  }).state;
  const changed = applyPartitionedTrackGridMutation(measured, {
    type: 'replace-column-tracks',
    tracks: [
      { id: 'left', partition: 'center', extent: estimated(1) },
      { id: 'right', partition: 'end', extent: estimated(1) },
      { id: 'middle', partition: 'start', extent: estimated(1) },
    ],
  }).state;

  assert.deepEqual(changed.columns.toArray().map(({ id, partition, extent }) => [id, partition, extent]), [
    ['middle', 'start', exact(120)],
    ['left', 'center', exact(40)],
    ['right', 'end', exact(50)],
  ]);
  assert.equal(changed.generation, 2);
  assert.equal(queryPartitionedTrackGridLayout(changed, {
    viewport: { x: 0, y: 0, width: 200, height: 100 },
  }).placements.some(({ id }) => id === 'body-middle'), true);
});

test('PTG-03: stale measurement and cross-partition spans reject atomically', () => {
  const state = fixture();
  const measured = applyPartitionedTrackGridMeasurements(state, {
    generation: state.generation,
    measurements: [{ axis: 'row', id: 'body-a', extent: exact(25) }],
  }).state;
  assert.equal(tryApplyPartitionedTrackGridMeasurements(measured, {
    generation: state.generation,
    measurements: [{ axis: 'row', id: 'body-a', extent: exact(30) }],
  }).ok, false);
  assert.equal(measured.rows.toArray().find(({ id }) => id === 'body-a')?.extent.value, 25);

  const invalid = tryCreatePartitionedTrackGridLayout(
    [
      { id: 'pinned', partition: 'start', extent: exact(10) },
      { id: 'scrolling', partition: 'center', extent: exact(10) },
    ],
    [{ id: 'column', partition: 'center', extent: exact(10) }],
    [{ id: 'crossing', row: 'pinned', column: 'column', rowSpan: 2 }],
  );
  assert.equal(invalid.ok, false);
  assert.equal(tryApplyPartitionedTrackGridMutation(state, {
    type: 'replace-row-tracks',
    tracks: state.rows.toArray().filter(({ id }) => id !== 'body-a'),
  }).ok, false);
  assert.equal(state.generation, 0);
});

test('PTG-04: pinned axes do not request scrolling and snapshots preserve observations', () => {
  const state = fixture();
  const viewport = { x: 60, y: 15, width: 80, height: 40 };
  assert.deepEqual(partitionedTrackGridScrollTarget(state, 'header-left', viewport), { x: 60, y: 15 });
  assert.deepEqual(partitionedTrackGridScrollTarget(state, 'body-middle', viewport, 'start'), { x: 40, y: 10 });

  const restored = restorePartitionedTrackGridLayout(snapshotPartitionedTrackGridLayout(state));
  assert.deepEqual(
    queryPartitionedTrackGridLayout(restored, { viewport }),
    queryPartitionedTrackGridLayout(state, { viewport }),
  );
});

test('PTG-01: an all-pinned grid remains queryable without a center partition', () => {
  const state = createPartitionedTrackGridLayout(
    [
      { id: 'top', partition: 'start', extent: exact(20) },
      { id: 'bottom', partition: 'end', extent: exact(20) },
    ],
    [
      { id: 'left', partition: 'start', extent: exact(30) },
      { id: 'right', partition: 'end', extent: exact(30) },
    ],
    [
      { id: 'top-left', row: 'top', column: 'left' },
      { id: 'bottom-right', row: 'bottom', column: 'right' },
    ],
  );
  const plan = queryPartitionedTrackGridLayout(state, {
    viewport: { x: 100, y: 50, width: 200, height: 120 },
  });
  assert.deepEqual(plan.placements.map(({ id, visible, zIndex }) => [id, visible, zIndex]), [
    ['top-left', true, 2],
    ['bottom-right', true, 2],
  ]);
});

test('PTG-01: partitioned queries equal an independent full geometry scan', () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    id: `row-${index}`,
    partition: index === 0 ? 'start' : index === 11 ? 'end' : 'center',
    extent: exact(10 + (index % 3)),
  }));
  const columns = Array.from({ length: 10 }, (_, index) => ({
    id: `column-${index}`,
    partition: index < 2 ? 'start' : index >= 8 ? 'end' : 'center',
    extent: exact(15 + (index % 4)),
  }));
  const regions = rows.flatMap((row, rowIndex) => columns.map((column, columnIndex) => ({
    id: `${rowIndex}:${columnIndex}`,
    row: row.id,
    column: column.id,
  })));
  const state = createPartitionedTrackGridLayout(rows, columns, regions, { rowGap: 1, columnGap: 2 });
  const rowGeometry = referenceTracks(rows, 1);
  const columnGeometry = referenceTracks(columns, 2);

  for (let step = 0; step < 32; step += 1) {
    const viewport = { x: (step * 37) % 140, y: (step * 29) % 100, width: 91, height: 73 };
    const expected = regions.filter((region) => {
      const row = rowGeometry.byID.get(region.row);
      const column = columnGeometry.byID.get(region.column);
      const rect = {
        x: referenceProjection(column, columnGeometry, viewport.x, viewport.width),
        y: referenceProjection(row, rowGeometry, viewport.y, viewport.height),
        width: column.extent,
        height: row.extent,
      };
      return intersects(rect, viewport);
    }).map(({ id }) => id).sort();
    const actual = queryPartitionedTrackGridLayout(state, { viewport }).placements.map(({ id }) => id).sort();
    assert.deepEqual(actual, expected);
  }
});

test('PTG-02: mixed-axis sparse batches commit once and dense batches rebuild', () => {
  const rows = Array.from({ length: 1_024 }, (_, index) => ({ id: `row-${index}`, partition: 'center', extent: exact(10) }));
  const columns = Array.from({ length: 64 }, (_, index) => ({ id: `column-${index}`, partition: 'center', extent: exact(12) }));
  const regions = [{ id: 'region', row: 'row-500', column: 'column-32' }];
  const state = createPartitionedTrackGridLayout(rows, columns, regions);
  const combined = applyPartitionedTrackGridMeasurements(state, {
    generation: state.generation,
    measurements: [
      { axis: 'row', id: 'row-500', extent: exact(17) },
      { axis: 'column', id: 'column-32', extent: exact(19) },
    ],
  }).state;
  assert.equal(combined.generation, state.generation + 1);
  const sparseWork = readRepairDiagnostics(combined);
  assert.equal(sparseWork?.mode, 'incremental');
  assert.equal(sparseWork?.changed, 2);
  assert.ok(sparseWork.copiedEntries <= sparseWork.repairBound);
  assert.deepEqual(combined.rows.at(500).extent, exact(17));
  assert.deepEqual(combined.columns.at(32).extent, exact(19));
  const same = applyPartitionedTrackGridMeasurements(combined, {
    generation: combined.generation,
    measurements: [
      { axis: 'row', id: 'row-500', extent: exact(17) },
      { axis: 'column', id: 'column-32', extent: exact(19) },
    ],
  }).state;
  assert.equal(same, combined);

  const measurements = Array.from({ length: 16 }, (_, index) => ({ axis: 'row', id: `row-${index}`, extent: exact(11) }));
  const dense = applyPartitionedTrackGridMeasurements(combined, { generation: combined.generation, measurements }).state;
  assert.equal(readRepairDiagnostics(dense)?.mode, 'rebuild');
  const rebuilt = createPartitionedTrackGridLayout(dense.rows.toArray(), dense.columns.toArray(), regions);
  const viewport = { x: 350, y: 4_800, width: 300, height: 300 };
  assert.deepEqual(
    queryPartitionedTrackGridLayout(dense, { viewport }).placements,
    queryPartitionedTrackGridLayout(rebuilt, { viewport }).placements,
  );
});

function referenceTracks(tracks, gap) {
  const ordered = ['start', 'center', 'end'].flatMap((partition) => tracks.filter((track) => track.partition === partition));
  let offset = 0;
  const byID = new Map();
  const ranges = {};
  for (const partition of ['start', 'center', 'end']) {
    const first = offset;
    for (const track of ordered.filter((candidate) => candidate.partition === partition)) {
      byID.set(track.id, { partition, offset, extent: track.extent.value });
      offset += track.extent.value + gap;
    }
    if (offset > first) offset -= gap;
    ranges[partition] = { offset: first, extent: offset - first };
    if (ordered.some((track) => track.partition === partition)) offset += gap;
  }
  if (offset > 0) offset -= gap;
  return { byID, ranges };
}

function referenceProjection(track, geometry, viewportStart, viewportExtent) {
  if (track.partition === 'start') return viewportStart + track.offset - geometry.ranges.start.offset;
  if (track.partition === 'end') return viewportStart + viewportExtent - geometry.ranges.end.extent + track.offset - geometry.ranges.end.offset;
  return track.offset;
}

function intersects(left, right) {
  return left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height;
}
