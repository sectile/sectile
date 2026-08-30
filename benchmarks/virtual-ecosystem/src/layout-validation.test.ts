import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayoutFixture, expectedVisibleItems } from './layout-fixtures.ts';
import {
  assertLayoutSnapshot,
  type LayoutSnapshot,
} from './layout-validation.ts';

const fixture = createLayoutFixture('flow-grid', 40, 0, undefined, 'uniform');
const first = fixture.items[0]!;

function snapshot(overrides: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  return {
    observedAt: 0,
    revision: fixture.revision,
    scrollWidth: fixture.contentWidth,
    scrollHeight: fixture.contentHeight,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 720,
    viewportHeight: 480,
    items: [{
      id: first.id,
      index: first.index,
      x: first.x,
      y: first.y,
      width: first.width,
      height: first.height,
    }],
    ...overrides,
  };
}

test('estimated validation accepts provisional extents and absolute placement', () => {
  assert.doesNotThrow(() => assertLayoutSnapshot(snapshot({
    scrollHeight: fixture.contentHeight + 500,
    items: [{
      id: first.id,
      index: first.index,
      x: first.x + 20,
      y: first.y + 20,
      width: first.width,
      height: first.height,
    }],
  }), fixture, 'estimated', 3));
});

test('estimated validation still rejects stale identities, incorrect sizes, and blank viewports', () => {
  assert.throws(() => assertLayoutSnapshot(snapshot({ revision: fixture.revision + 1 }), fixture, 'estimated', 3), /stale-revision/);
  assert.throws(() => assertLayoutSnapshot(snapshot({
    items: [{ ...snapshot().items[0]!, id: 'stale' }],
  }), fixture, 'estimated', 3), /stale-item/);
  assert.throws(() => assertLayoutSnapshot(snapshot({
    items: [{ ...snapshot().items[0]!, height: first.height + 10 }],
  }), fixture, 'estimated', 3), /geometry/);
  assert.throws(() => assertLayoutSnapshot(snapshot({ items: [] }), fixture, 'estimated', 3), /empty-viewport/);
});

test('mutation validation requires its rendered witness and removed-item absence', () => {
  assert.doesNotThrow(() => assertLayoutSnapshot(
    snapshot(), fixture, 'estimated', 3,
    { requiredItemIDs: [first.id], excludedItemIDs: ['removed'] },
  ));
  assert.throws(() => assertLayoutSnapshot(
    snapshot(), fixture, 'estimated', 3,
    { requiredItemIDs: ['missing'] },
  ), /missing-required-item/);
  assert.throws(() => assertLayoutSnapshot(
    snapshot(), fixture, 'estimated', 3,
    { excludedItemIDs: [first.id] },
  ), /excluded-item/);
});

test('exact validation retains total extent and absolute geometry checks', () => {
  const visibleItems = expectedVisibleItems(fixture, 0, 0, 0).map((item) => ({
    id: item.id,
    index: item.index,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  }));
  assert.doesNotThrow(() => assertLayoutSnapshot(snapshot({ items: visibleItems }), fixture, 'exact', 3));
  assert.throws(() => assertLayoutSnapshot(snapshot({
    scrollHeight: fixture.contentHeight + 10,
  }), fixture, 'exact', 3), /content-height/);
  assert.throws(() => assertLayoutSnapshot(snapshot({
    items: [{ ...snapshot().items[0]!, y: first.y + 10 }],
  }), fixture, 'exact', 3), /geometry/);
});
