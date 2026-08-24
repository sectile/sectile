import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const treeGridCase = await readFile(new URL('../.vitepress/theme/components/TreeGridCase.vue', import.meta.url), 'utf8');
const preview = await readFile(new URL('../.vitepress/theme/components/ComponentExamplePreview.vue', import.meta.url), 'utf8');
const specializedCode = await readFile(new URL('../.vitepress/theme/specialized-example-code.ts', import.meta.url), 'utf8');
const anatomy = await readFile(new URL('../.vitepress/theme/component-anatomy.ts', import.meta.url), 'utf8');
const anatomyStyles = await readFile(new URL('../.vitepress/theme/components/ComponentAnatomy.vue', import.meta.url), 'utf8');
const exampleStyles = await readFile(new URL('../.vitepress/theme/component-examples.css', import.meta.url), 'utf8');
const documentation = await readFile(new URL('../data/component-documentation.mjs', import.meta.url), 'utf8');

test('tree grid examples present a real nested project inventory', () => {
  assert.match(preview, /case 'tree-grid': return specialized\(TreeGridCase, \{ scenario: props\.scenario \}\)/u);
  assert.match(treeGridCase, /Commerce platform/u);
  assert.match(treeGridCase, /Storefront/u);
  assert.match(treeGridCase, /Checkout flow/u);
  assert.match(treeGridCase, /Documentation/u);
  assert.match(treeGridCase, /:level="2"/u);
  assert.match(treeGridCase, /:level="3"/u);
  assert.match(treeGridCase, /expandedValue\.includes\('storefront'\)/u);
  assert.doesNotMatch(treeGridCase, />sectile</u);
});

test('tree grid visual scenarios teach hierarchy and editing instead of disabled cells', () => {
  assert.match(documentation, /'tree-grid': \['expanded', 'editable'\]/u);
  assert.doesNotMatch(documentation, /'tree-grid': \[[^\]]*'unavailable-cells'/u);
  assert.match(treeGridCase, /:default-edit-mode="editable \? 'editing' : 'navigation'"/u);
  assert.match(treeGridCase, /v-if="!editing"/u);
  assert.match(treeGridCase, /TreeGridEditor for="storefront-owner"/u);
  assert.doesNotMatch(treeGridCase, /disabled-items/u);
});

test('tree grid code samples use Vue hierarchy and an integrated editor', () => {
  assert.match(specializedCode, /'tree-grid'/u);
  assert.match(specializedCode, /function treeGridSource\(scenario: string\)/u);
  assert.match(specializedCode, /TreeGridDisclosure/u);
  assert.match(specializedCode, /TreeGridEditor/u);
  assert.match(specializedCode, /default-highlighted-value="storefront-owner"/u);
  assert.match(specializedCode, /if \(component === 'tree-grid'\) return treeGridSource\(scenario\)/u);
  assert.doesNotMatch(specializedCode, /@sectile\/dom\/tree-grid/u);
});

test('tree grid anatomy mirrors the product example inside one coherent frame', () => {
  assert.match(anatomy, /Commerce platform/u);
  assert.match(anatomy, /Checkout flow/u);
  assert.match(anatomy, /tree-grid-level-\$\{level\}/u);
  assert.match(anatomy, /input\('editor', 'Mina Kim', 'Storefront owner'/u);
  assert.match(anatomy, /data-grid tree-grid-root/u);
  assert.doesNotMatch(anatomy, /Inline editor/u);
  assert.match(anatomyStyles, /\.anatomy-node--tree-grid-root/u);
  assert.match(anatomyStyles, /grid-template-columns: minmax\(15rem, 1\.5fr\)/u);
  assert.match(exampleStyles, /\.tree-grid-demo__resource--level-3/u);
  assert.match(exampleStyles, /\.tree-grid-demo__owner input/u);
});
