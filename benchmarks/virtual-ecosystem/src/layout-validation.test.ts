import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayoutFixture, createLayoutMutationScenario, expectedVisibleItems } from './layout-fixtures.ts';
import {
  assertLayoutSnapshot,
  layoutMutationObserved,
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
  }), fixture, 'estimated', 3), new RegExp(
    `geometry:${first.id}:actual=[^:]*,${first.height + 10}:expected=[^:]*,${first.height}`,
  ));
  assert.throws(() => assertLayoutSnapshot(snapshot({ items: [] }), fixture, 'estimated', 3), /empty-viewport/);
});

test('mutation observation requires the changed DOM state rather than an unrelated witness', () => {
  for (const operation of ['insert', 'move', 'remove', 'resize'] as const) {
    const scenario = createLayoutMutationScenario(fixture, operation, 'middle');
    const affected = scenario.after.items
      .filter((item) => scenario.affectedIDs.includes(item.id))
      .map((item) => ({
        id: item.id,
        index: item.index,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      }));
    const observed = snapshot({ revision: scenario.after.revision, items: affected });
    assert.equal(layoutMutationObserved(observed, scenario, 3), true, operation);
    assert.equal(layoutMutationObserved(snapshot({ items: affected }), scenario, 3), false, `${operation}:stale`);
  }
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

test('exact-geometry validation permits a provisional extent without weakening item placement', () => {
  const visibleItems = expectedVisibleItems(fixture, 0, 0, 0).map((item) => ({
    id: item.id,
    index: item.index,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  }));
  assert.doesNotThrow(() => assertLayoutSnapshot(snapshot({
    scrollHeight: fixture.contentHeight + 500,
    items: visibleItems,
  }), fixture, 'exact-geometry', 3));
  assert.throws(() => assertLayoutSnapshot(snapshot({
    items: [{ ...snapshot().items[0]!, y: first.y + 10 }],
  }), fixture, 'exact-geometry', 3), /geometry/);
});
