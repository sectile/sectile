import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { documentedScenarios } from '../data/component-documentation.mjs';
import { specializedVueCodeFor } from '../.vitepress/theme/specialized-example-code.ts';

const preview = await readFile(
  new URL('../.vitepress/theme/components/ComponentExamplePreview.vue', import.meta.url),
  'utf8',
);
const example = await readFile(
  new URL('../.vitepress/theme/components/WindowSplitterCase.vue', import.meta.url),
  'utf8',
);
const styles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);
const page = await readFile(
  new URL('../components/window-splitter.md', import.meta.url),
  'utf8',
);

test('window splitter uses dedicated horizontal, vertical, and nested previews', () => {
  assert.match(preview, /WindowSplitterCase/);
  assert.match(preview, /case 'window-splitter': return specialized\(WindowSplitterCase/);
  assert.match(example, /scenario === 'horizontal'/);
  assert.match(example, /scenario === 'vertical'/);
  assert.ok((example.match(/<WindowSplitterRoot/g) ?? []).length >= 4);
  assert.match(example, /mixedSidebarSize/);
  assert.match(example, /mixedEditorSize/);
});

test('window splitter keeps a one-pixel visual divider with a larger invisible hit target', () => {
  assert.match(styles, /window-splitter-demo--horizontal[^}]*grid-template-columns:[^;]*1px/s);
  assert.match(styles, /window-splitter-demo--vertical[^}]*grid-template-rows:[^;]*1px/s);
  assert.match(styles, /window-splitter-handle::before[^}]*width:\s*13px/s);
  assert.match(styles, /window-splitter-demo--vertical > \.window-splitter-handle::before[^}]*height:\s*13px/s);
});

test('window splitter documentation includes distinct production-shaped source for every layout', () => {
  const component = catalog.components.find(({ id }) => id === 'window-splitter');
  assert.ok(component);
  assert.deepEqual(documentedScenarios(component), ['horizontal', 'vertical', 'nested-layout']);

  const horizontal = specializedVueCodeFor('window-splitter', 'horizontal');
  const vertical = specializedVueCodeFor('window-splitter', 'vertical');
  const nested = specializedVueCodeFor('window-splitter', 'nested-layout');
  assert.match(horizontal, /orientation="horizontal"/);
  assert.match(vertical, /orientation="vertical"/);
  assert.match(nested, /sidebarSize/);
  assert.match(nested, /editorSize/);
  assert.ok((nested.match(/<WindowSplitterRoot/g) ?? []).length >= 2);
  assert.notEqual(horizontal, vertical);
  assert.match(page, /horizontal layout/);
  assert.match(page, /vertical layout/);
});
