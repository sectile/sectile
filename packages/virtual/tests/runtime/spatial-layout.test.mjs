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
  assert.deepEqual(updated.domain.ids, updated.items.map(({ id }) => id));
  for (const item of updated.items) assert.deepEqual(spatialRectAt(updated, item.id), item.rect);
  assert.equal(spatialRectAt(updated, 'item-0'), null);
  assert.equal(spatialRectAt(updated, 'item-39'), null);
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
