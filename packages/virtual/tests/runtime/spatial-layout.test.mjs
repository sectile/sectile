/* Law evidence: SPA-01 SPA-02 SPA-03 SPA-04 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySpatialMeasurements,
  applySpatialMutation,
  createSpatialLayout,
  querySpatialLayout,
  spatialRectAt,
  tryApplySpatialMeasurements,
} from '../../.verification-dist/spatial-layout.js';
import { readRepairDiagnostics } from '../../.verification-dist/internal/repair-diagnostics.js';

function intersects(left, right) {
  return left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height;
}

function referenceQuery(items, viewport) {
  return items
    .map((item, index) => ({ item, index, zIndex: item.zIndex ?? 0 }))
    .filter(({ item }) => intersects(item.rect, viewport))
    .sort((left, right) => left.zIndex - right.zIndex || left.index - right.index)
    .map(({ item }) => item.id);
}

test('SPA-01: packed spatial queries equal a full rectangle scan', () => {
  const items = Array.from({ length: 513 }, (_, index) => ({
    id: `item-${index}`,
    rect: {
      x: (index * 47) % 1_003,
      y: (index * 83) % 907,
      width: 5 + (index % 37),
      height: 7 + ((index * 11) % 41),
    },
    zIndex: (index % 9) - 4,
  }));
  const state = createSpatialLayout(items);
  for (let step = 0; step < 64; step += 1) {
    const viewport = { x: (step * 97) % 950, y: (step * 61) % 850, width: 113, height: 127 };
    assert.deepEqual(querySpatialLayout(state, { viewport }).placements.map(({ id }) => id), referenceQuery(items, viewport));
  }
});

test('SPA-02: z-index and declaration order produce deterministic paint order', () => {
  const rect = { x: 0, y: 0, width: 10, height: 10 };
  const state = createSpatialLayout([
    { id: 'second', rect, zIndex: 2 },
    { id: 'first-a', rect, zIndex: 1 },
    { id: 'first-b', rect, zIndex: 1 },
    { id: 'back', rect, zIndex: -1 },
  ]);
  const query = () => querySpatialLayout(state, { viewport: rect }).placements.map(({ id }) => id);
  assert.deepEqual(query(), ['back', 'first-a', 'first-b', 'second']);
  assert.deepEqual(query(), query());
});

test('SPA-03: measurement, update, and removal keep domain and index observations aligned', () => {
  const state = createSpatialLayout(Array.from({ length: 40 }, (_, index) => ({
    id: `item-${index}`,
    rect: { x: index * 20, y: index * 10, width: 12, height: 12 },
  })));
  const measured = applySpatialMeasurements(state, {
    generation: 0,
    measurements: [{ id: 'item-10', rect: { x: 5, y: 7, width: 30, height: 40 } }],
  }).state;
  const updated = applySpatialMutation(measured, {
    type: 'update',
    remove: ['item-0', 'item-39'],
    upsert: [
      { id: 'item-1', rect: { x: 200, y: 300, width: 20, height: 20 } },
      { id: 'added', rect: { x: 2, y: 3, width: 4, height: 5 } },
    ],
  }).state;
  assert.deepEqual(updated.domain.ids, updated.items.toArray().map(({ id }) => id));
  for (const item of updated.items.iterate()) assert.deepEqual(spatialRectAt(updated, item.id), item.rect);
  assert.equal(spatialRectAt(updated, 'item-0'), null);
  assert.equal(spatialRectAt(updated, 'item-39'), null);
});

test('spatial splice patches preserve declaration order and validate inserted identities', () => {
  const rect = (x) => ({ x, y: 0, width: 10, height: 10 });
  const state = createSpatialLayout([
    { id: 'a', rect: rect(0) },
    { id: 'b', rect: rect(20) },
    { id: 'c', rect: rect(40) },
  ]);
  const changed = applySpatialMutation(state, {
    type: 'patch',
    patch: { type: 'splice', index: 1, deleteCount: 1, inserted: ['x', 'y'] },
    inserted: [
      { id: 'x', rect: rect(10) },
      { id: 'y', rect: rect(30) },
    ],
  }).state;
  assert.deepEqual(changed.domain.ids, ['a', 'x', 'y', 'c']);
  assert.deepEqual(changed.items.toArray().map(({ id }) => id), changed.domain.ids);
  assert.deepEqual(
    querySpatialLayout(changed, { viewport: { x: 0, y: 0, width: 60, height: 20 } })
      .placements.map(({ id, index }) => [id, index]),
    [['a', 0], ['x', 1], ['y', 2], ['c', 3]],
  );
  assert.throws(() => applySpatialMutation(state, {
    type: 'patch',
    patch: { type: 'splice', index: 0, deleteCount: 0, inserted: ['wrong'] },
    inserted: [{ id: 'different', rect: rect(0) }],
  }), /inserted items must match/);
});

test('SPA-04: boundaries, zero-size rectangles, anchors, and stale generations are explicit', () => {
  const state = createSpatialLayout([
    { id: 'anchor', rect: { x: 10, y: 10, width: 20, height: 20 } },
    { id: 'touching', rect: { x: 30, y: 10, width: 20, height: 20 } },
    { id: 'zero', rect: { x: 15, y: 15, width: 0, height: 0 } },
  ]);
  assert.deepEqual(
    querySpatialLayout(state, { viewport: { x: 10, y: 10, width: 20, height: 20 } }).placements.map(({ id }) => id),
    ['anchor', 'zero'],
  );
  const changed = applySpatialMeasurements(state, {
    generation: 0,
    anchor: { id: 'anchor', viewportOffset: { x: 0, y: 0 } },
    measurements: [{ id: 'anchor', rect: { x: 13, y: 17, width: 20, height: 20 } }],
  });
  assert.deepEqual(changed.scrollDelta, { x: 3, y: 7 });
  assert.equal(tryApplySpatialMeasurements(changed.state, { generation: 0, measurements: [] }).ok, false);
});

test('SPA-03: sparse measurements path-copy bounded blocks and dense batches rebuild', () => {
  const items = Array.from({ length: 4_096 }, (_, index) => ({
    id: `item-${index}`,
    rect: { x: (index % 64) * 11, y: Math.floor(index / 64) * 13, width: 10, height: 12 },
  }));
  const state = createSpatialLayout(items);
  const sparse = applySpatialMeasurements(state, {
    generation: state.generation,
    measurements: [{ id: 'item-2048', rect: { ...items[2048].rect, width: 17 } }],
  }).state;
  const sparseWork = readRepairDiagnostics(sparse);
  assert.equal(sparseWork?.mode, 'incremental');
  assert.equal(sparseWork?.changed, 1);
  assert.ok(sparseWork.copiedEntries <= sparseWork.repairBound);
  assert.ok(sparseWork.copiedNodes <= sparseWork.repairBound);
  assert.equal(Object.isFrozen(sparse.items), true);
  assert.deepEqual(
    querySpatialLayout(sparse, { viewport: { x: 0, y: 300, width: 800, height: 300 } }).placements.map(({ id }) => id),
    referenceQuery(sparse.items.toArray(), { x: 0, y: 300, width: 800, height: 300 }),
  );
  const same = applySpatialMeasurements(sparse, {
    generation: sparse.generation,
    measurements: [{ id: 'item-2048', rect: sparse.items.at(2048).rect }],
  }).state;
  assert.equal(same, sparse);

  const measurements = Array.from({ length: 1_024 }, (_, index) => ({
    id: `item-${index}`,
    rect: { ...sparse.items.at(index).rect, height: 14 },
  }));
  const dense = applySpatialMeasurements(sparse, { generation: sparse.generation, measurements }).state;
  assert.equal(readRepairDiagnostics(dense)?.mode, 'rebuild');
  const rebuilt = createSpatialLayout(dense.items.toArray());
  const viewport = { x: 100, y: 0, width: 300, height: 500 };
  assert.deepEqual(querySpatialLayout(dense, { viewport }).placements, querySpatialLayout(rebuilt, { viewport }).placements);
});
