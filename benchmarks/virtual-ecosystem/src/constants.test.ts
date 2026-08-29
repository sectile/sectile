import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_ROW_HEIGHT,
  MAXIMUM_SCROLL_HEIGHT,
  MINIMUM_ROW_HEIGHT,
  benchmarkRowHeight,
} from './constants.ts';

test('benchmark row height preserves the standard fixture density', () => {
  assert.equal(benchmarkRowHeight(100_000), DEFAULT_ROW_HEIGHT);
});

test('benchmark row height keeps one million uniform rows within the layout ceiling', () => {
  const rowHeight = benchmarkRowHeight(1_000_000);
  assert.equal(rowHeight, MINIMUM_ROW_HEIGHT);
  assert.ok(rowHeight * 1_000_000 <= MAXIMUM_SCROLL_HEIGHT);
});

test('benchmark row height uses whole pixels for intermediate counts', () => {
  assert.equal(benchmarkRowHeight(990_000), MINIMUM_ROW_HEIGHT);
});
