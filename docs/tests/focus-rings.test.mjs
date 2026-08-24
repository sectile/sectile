import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../.vitepress/theme/component-examples.css', import.meta.url), 'utf8');

test('bounded collection items use an inset focus ring that cannot be clipped', () => {
  assert.match(source, /:is\(\.catalog-grid-cell, \.catalog-tree-item, \.listbox-option, \.cascade-select-item, \.tabs-trigger, \.catalog-month-grid button\):focus-visible/);
  assert.match(source, /box-shadow: inset 0 0 0 2px var\(--demo-focus\)/);
  assert.doesNotMatch(source, /\.catalog-grid-cell\[data-highlighted\][^{]*\{[^}]*outline-offset:/s);
});

test('outer grid and listbox cells inherit the visible container corner shape', () => {
  assert.match(source, /\.catalog-grid > \.catalog-grid-row:first-child > \.catalog-grid-cell:first-child/);
  assert.match(source, /\.catalog-tree-grid > \.catalog-grid-row:last-child > \.catalog-grid-cell:last-child/);
  assert.match(source, /\.listbox-option:first-child/);
  assert.match(source, /\.listbox-option:last-child/);
});
