import assert from 'node:assert/strict';
import test from 'node:test';
import { MAXIMUM_SCROLL_HEIGHT } from './constants.ts';
import {
  createLayoutFixture,
  createLayoutMutationScenario,
  expectedVisibleItems,
  layoutAdapterItems,
} from './layout-fixtures.ts';

const families = Object.freeze(['flow-grid', 'masonry', 'track-grid', 'spatial'] as const);

test('layout fixture queries return exactly the intersecting indexed items', () => {
  for (const family of families) {
    const fixture = createLayoutFixture(family, 10_000);
    const left = Math.max(0, fixture.contentWidth / 3);
    const top = Math.max(0, fixture.contentHeight / 3);
    const expected = fixture.items.filter((item) => (
      item.x + item.width >= left
      && item.x <= left + 720
      && item.y + item.height >= top
      && item.y <= top + 480
    )).map((item) => item.id).sort();
    const actual = expectedVisibleItems(fixture, left, top, 0).map((item) => item.id).sort();
    assert.deepEqual(actual, expected, family);
  }
});

test('layout mutations retain stable identities and publish the changed geometry', () => {
  for (const family of families) {
    const fixture = createLayoutFixture(family, 200);
    for (const operation of ['insert', 'move', 'remove', 'resize'] as const) {
      const scenario = createLayoutMutationScenario(fixture, operation, 'middle');
      assert.equal(scenario.after.revision, fixture.revision + 1, `${family}:${operation}`);
      assert.equal(new Set(scenario.after.items.map((item) => item.id)).size, scenario.after.items.length);
      if (operation === 'insert') assert.equal(scenario.after.items.length, fixture.items.length + 1);
      if (operation === 'remove') assert.equal(scenario.after.items.length, fixture.items.length - 1);
      if (operation === 'move') {
        assert.equal(scenario.after.items.length, fixture.items.length);
        assert.equal(scenario.affectedIDs.length, 2, `${family}:move:affected`);
        const indices = scenario.affectedIDs.map((id) => scenario.after.items.findIndex((item) => item.id === id));
        assert.equal(Math.abs(indices[0]! - indices[1]!), 1, `${family}:move:adjacent`);
      }
      if (operation === 'resize') assert.equal(scenario.after.items.length, fixture.items.length);
    }
  }
});

test('collection adapter inputs preserve unchanged value identities across mutations', () => {
  for (const family of ['flow-grid', 'masonry'] as const) {
    const fixture = createLayoutFixture(family, 200);
    const beforeByID = new Map(layoutAdapterItems(fixture).map((item) => [item.id, item]));
    for (const operation of ['insert', 'move', 'remove', 'resize'] as const) {
      const scenario = createLayoutMutationScenario(fixture, operation, 'middle');
      const after = layoutAdapterItems(scenario.after);
      for (const item of after) {
        const previous = beforeByID.get(item.id);
        if (previous === undefined || scenario.affectedIDs.includes(item.id)) continue;
        assert.equal(item, previous, `${family}:${operation}:${item.id}`);
      }
    }
  }
});

test('fixed collection fixtures retain uniform item sizes through structural mutations', () => {
  for (const family of ['flow-grid', 'masonry'] as const) {
    const fixture = createLayoutFixture(family, 200, 0, undefined, 'uniform');
    assert.ok(fixture.items.every((item) => item.height === fixture.rowHeight), family);
    for (const operation of ['insert', 'move', 'remove'] as const) {
      const scenario = createLayoutMutationScenario(fixture, operation, 'middle');
      assert.ok(
        scenario.after.items.every((item) => item.height === fixture.rowHeight),
        `${family}:${operation}`,
      );
    }
  }
});

test('spatial content size is the exact occupied item boundary', () => {
  const fixture = createLayoutFixture('spatial', 10_000);
  assert.equal(fixture.contentWidth, Math.max(...fixture.items.map((item) => item.x + item.width)));
  assert.equal(fixture.contentHeight, Math.max(...fixture.items.map((item) => item.y + item.height)));
});

test('large browser fixtures stay under the scroll-height ceiling', () => {
  for (const family of families) {
    const fixture = createLayoutFixture(family, 100_000);
    assert.ok(fixture.contentHeight <= MAXIMUM_SCROLL_HEIGHT, `${family}:${fixture.contentHeight}`);
  }
  const maximumMasonry = createLayoutFixture('masonry', 1_000_000);
  assert.ok(maximumMasonry.contentHeight <= MAXIMUM_SCROLL_HEIGHT, `masonry:${maximumMasonry.contentHeight}`);
});
