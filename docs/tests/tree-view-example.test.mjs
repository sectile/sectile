import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { documentedScenarios } from '../data/component-documentation.mjs';

const preview = await readFile(new URL('../.vitepress/theme/components/ComponentExamplePreview.vue', import.meta.url), 'utf8');
const example = await readFile(new URL('../.vitepress/theme/components/TreeViewCase.vue', import.meta.url), 'utf8');
const catalogCase = await readFile(new URL('../.vitepress/theme/components/CatalogCase.vue', import.meta.url), 'utf8');

test('tree view uses one dedicated production-shaped preview', () => {
  assert.match(preview, /case 'tree-view': return specialized\(TreeViewCase, \{ scenario: props\.scenario \}\)/);
  assert.match(example, /Atlas workspace/);
  assert.match(example, /Overview\.vue/);
  assert.match(example, /Settings\.vue/);
  assert.match(example, /TreeViewGroup v-if="expandedValue\.includes\('dashboard'\)"/);
  assert.doesNotMatch(catalogCase, /TreeViewRoot|catalog-tree/);
});

test('tree view documents hierarchy and multi-selection, not an isolated unavailable state', () => {
  const component = catalog.components.find(({ id }) => id === 'tree-view');
  assert.ok(component);
  assert.deepEqual(documentedScenarios(component), ['expanded', 'multiple']);
  assert.match(example, /props\.scenario === 'multiple'/);
  assert.match(example, /value\.length/);
  assert.match(example, /Check v-if="multiple && item\.selected"/);
});
