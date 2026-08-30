/* Law evidence: SPA-01 SPA-02 SPA-03 SPA-04 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/core/sequence';
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

test('spatial construction reuses an aligned canonical domain', () => {
  const items = [
    { id: 'a', rect: { x: 0, y: 0, width: 10, height: 10 } },
    { id: 'b', rect: { x: 20, y: 0, width: 10, height: 10 } },
  ];
  const domain = createSequence(items.map(({ id }) => id));
  const state = createSpatialLayout(items, { domain });
  assert.equal(state.domain, domain);
  assert.throws(
    () => createSpatialLayout(items, { domain: createSequence(['b', 'a']) }),
    /identities must align/u,
  );
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

test('spatial move and permutation patches preserve geometry without rebuilding the packed tree', () => {
  const items = Array.from({ length: 4_096 }, (_, index) => ({
    id: `item-${index}`,
    rect: { x: (index % 64) * 11, y: Math.floor(index / 64) * 13, width: 10, height: 12 },
  }));
  const state = createSpatialLayout(items);
  const moved = applySpatialMutation(state, {
    type: 'patch',
    patch: { type: 'move', from: 1_000, to: 2_000, count: 1 },
    inserted: [],
  }).state;
  assert.equal(readRepairDiagnostics(moved)?.rebuiltItems, 0);
  assert.equal(moved.domain.at(2_000), 'item-1000');
  assert.deepEqual(spatialRectAt(moved, 'item-1000'), items[1_000].rect);

  const replacement = [moved.items.at(1_501), moved.items.at(1_500)];
  const permuted = applySpatialMutation(moved, {
    type: 'patch',
    patch: {
      type: 'splice',
      index: 1_500,
      deleteCount: 2,
      inserted: replacement.map(({ id }) => id),
    },
    inserted: replacement,
  }).state;
  assert.equal(readRepairDiagnostics(permuted)?.rebuiltItems, 0);
  assert.deepEqual(
    permuted.items.toArray().map(({ id }) => id),
    permuted.domain.ids,
  );
  const viewport = { x: 0, y: 0, width: 704, height: 832 };
  assert.deepEqual(
    querySpatialLayout(permuted, { viewport }).placements.map(({ id, index }) => [id, index]),
    referenceQuery(permuted.items.toArray(), viewport).map((id) => [id, permuted.domain.indexOf(id)]),
  );
});

test('spatial structural overlays stay bounded and rebuild on boundary shrink or density', () => {
  const items = Array.from({ length: 4_096 }, (_, index) => ({
    id: `item-${index}`,
    rect: { x: (index % 64) * 11, y: Math.floor(index / 64) * 13, width: 10, height: 12 },
  }));
  const state = createSpatialLayout(items);
  const inserted = { id: 'inserted', rect: { x: 5, y: 5, width: 3, height: 3 } };
  const sparse = applySpatialMutation(state, {
    type: 'patch',
    patch: { type: 'splice', index: 10, deleteCount: 0, inserted: [inserted.id] },
    inserted: [inserted],
  }).state;
  const sparseWork = readRepairDiagnostics(sparse);
  assert.equal(sparseWork?.mode, 'incremental');
  assert.equal(sparseWork?.rebuiltItems, 0);
  assert.ok(sparseWork.copiedEntries <= sparseWork.repairBound);
  assert.deepEqual(spatialRectAt(sparse, inserted.id), inserted.rect);
  assert.deepEqual(
    querySpatialLayout(sparse, { viewport: { x: 0, y: 0, width: 20, height: 20 } })
      .placements.find(({ id }) => id === inserted.id),
    {
      id: inserted.id,
      index: 10,
      zIndex: 0,
      rect: inserted.rect,
      visible: true,
    },
  );

  const boundary = applySpatialMutation(sparse, {
    type: 'patch',
    patch: { type: 'splice', index: sparse.domain.indexOf('item-4095'), deleteCount: 1, inserted: [] },
    inserted: [],
  }).state;
  assert.equal(readRepairDiagnostics(boundary)?.mode, 'rebuild');
  assert.equal(spatialRectAt(boundary, 'item-4095'), null);

  const denseInserted = Array.from({ length: 67 }, (_, index) => ({
    id: `added-${index}`,
    rect: { x: index, y: index, width: 1, height: 1 },
  }));
  const dense = applySpatialMutation(state, {
    type: 'patch',
    patch: {
      type: 'splice',
      index: 100,
      deleteCount: 0,
      inserted: denseInserted.map(({ id }) => id),
    },
    inserted: denseInserted,
  }).state;
  assert.equal(readRepairDiagnostics(dense)?.mode, 'rebuild');
  assert.deepEqual(dense.items.toArray().map(({ id }) => id), dense.domain.ids);
});

test('spatial value-only patches repair touched blocks without rebuilding the domain', () => {
  const items = Array.from({ length: 4_096 }, (_, index) => ({
    id: `item-${index}`,
    rect: { x: (index % 64) * 11, y: Math.floor(index / 64) * 13, width: 10, height: 12 },
  }));
  const state = createSpatialLayout(items);
  const changedItem = {
    ...items[2_048],
    rect: { ...items[2_048].rect, width: 19 },
  };
  const changed = applySpatialMutation(state, {
    type: 'patch',
    patch: { type: 'splice', index: 2_048, deleteCount: 1, inserted: [changedItem.id] },
    inserted: [changedItem],
  }).state;
  const work = readRepairDiagnostics(changed);
  assert.equal(changed.domain, state.domain);
  assert.equal(work?.mode, 'incremental');
  assert.equal(work?.changed, 1);
  assert.equal(work?.rebuiltItems, 0);
  assert.ok(work.copiedEntries <= work.repairBound);
  assert.ok(work.copiedNodes <= work.repairBound);
  assert.deepEqual(spatialRectAt(changed, changedItem.id), changedItem.rect);
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

  const fullMeasurements = dense.items.toArray().map((item) => ({
    id: item.id,
    rect: { ...item.rect, width: item.rect.width + 1 },
  }));
  const full = applySpatialMeasurements(dense, {
    generation: dense.generation,
    measurements: fullMeasurements,
  }).state;
  assert.equal(readRepairDiagnostics(full)?.mode, 'rebuild');
  assert.deepEqual(full.items.toArray().map(({ rect }) => rect.width), fullMeasurements.map(({ rect }) => rect.width));
});
