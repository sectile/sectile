import assert from 'node:assert/strict';
import test from 'node:test';
import { MAXIMUM_SCROLL_HEIGHT } from './constants.js';
import {
  createLayoutFixture,
  createLayoutMutationScenario,
  expectedVisibleItems,
} from './layout-fixtures.js';

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
      if (operation === 'move' || operation === 'resize') assert.equal(scenario.after.items.length, fixture.items.length);
    }
  }
});

test('large browser fixtures stay under the scroll-height ceiling', () => {
  for (const family of families) {
    const fixture = createLayoutFixture(family, 100_000);
    assert.ok(fixture.contentHeight <= MAXIMUM_SCROLL_HEIGHT, `${family}:${fixture.contentHeight}`);
  }
  const maximumMasonry = createLayoutFixture('masonry', 1_000_000);
  assert.ok(maximumMasonry.contentHeight <= MAXIMUM_SCROLL_HEIGHT, `masonry:${maximumMasonry.contentHeight}`);
});
