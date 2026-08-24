import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../.vitepress/theme/components/ComponentAnatomy.vue', import.meta.url),
  'utf8',
);
const dedicatedSources = await Promise.all([
  'CalendarAnatomy.vue',
  'DateTimePickerAnatomy.vue',
  'MenubarAnatomy.vue',
  'MultiThumbSliderAnatomy.vue',
  'SliderAnatomy.vue',
].map((file) => readFile(new URL(`../.vitepress/theme/components/${file}`, import.meta.url), 'utf8')));

test('anatomy icons share one optical alignment contract', () => {
  assert.match(source, /\.anatomy-node--indicator\s*\{[^}]*display:\s*inline-grid;[^}]*place-items:\s*center;[^}]*line-height:\s*0;/s);
  assert.match(source, /\.anatomy-node__icon\s*\{[^}]*display:\s*block;[^}]*width:\s*16px;[^}]*height:\s*16px;/s);
});

test('tree disclosures align to the text center and keep hierarchy indentation', () => {
  assert.match(source, /\.anatomy-node--data-grid \.anatomy-node--cell > \.anatomy-node--indicator\s*\{[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\);/s);
  assert.match(source, /\.anatomy-node--tree-root \[data-part-name='disclosure'\][^{]*\{[^}]*margin-left:\s*0;/s);
  assert.match(source, /\.anatomy-node--tree-view-row\s*\{[^}]*grid-template-columns:\s*18px 20px minmax\(0, 1fr\) auto;[^}]*align-items:\s*center;/s);
  assert.match(source, /\.anatomy-node--tree-view-level-2\s*\{[^}]*padding-left:\s*30px;/s);
  assert.match(source, /\.anatomy-node--tree-view-level-3\s*\{[^}]*padding-left:\s*52px;/s);
});

test('leading indicators and trailing disclosure icons stay in their semantic positions', () => {
  assert.match(source, /\.anatomy-node--item\.anatomy-node--choice > \.anatomy-node--indicator\s*\{[^}]*margin-left:\s*0;/s);
  assert.match(source, /\.anatomy-node--radio-root \.anatomy-node--indicator\s*\{[^}]*margin-left:\s*0;/s);
  assert.match(source, /\[data-part-name='trigger'\] > \.anatomy-node__button\s*\{[^}]*flex-direction:\s*row-reverse;[^}]*justify-content:\s*space-between;/s);
});

test('checkbox anatomy distinguishes unchecked and checked states', () => {
  assert.match(source, /\.anatomy-node--choice > \.anatomy-node--indicator\s*\{[^}]*border:\s*2px solid var\(--vp-c-border\);[^}]*background:\s*var\(--vp-c-bg\);/s);
  assert.match(source, /\.anatomy-node--choice > \.anatomy-node--indicator\.anatomy-node--preview-active\s*\{[^}]*border-color:\s*var\(--vp-c-brand-1\);[^}]*background:\s*var\(--vp-c-brand-1\);[^}]*color:\s*white;/s);
});

test('editable anatomy separates the field and each action', () => {
  assert.match(source, /\.anatomy-node--editable-root\s*\{[^}]*display:\s*grid;[^}]*gap:\s*16px;/s);
  assert.match(source, /\.anatomy-node--editor-actions\s*\{[^}]*flex-wrap:\s*wrap;[^}]*gap:\s*12px;/s);
});

test('tooltip anatomy positions content from its trigger anchor', () => {
  assert.match(source, /\.anatomy-node--tooltip-anchor\s*\{[^}]*position:\s*relative;[^}]*width:\s*max-content;/s);
  assert.match(source, /\.anatomy-node--tooltip-panel\s*\{[^}]*top:\s*auto;[^}]*bottom:\s*calc\(100% \+ 12px\);/s);
  assert.match(source, /\.anatomy-node--tooltip-arrow\s*\{[^}]*bottom:\s*-7px;[^}]*border-top:\s*0;[^}]*border-left:\s*0;/s);
});

test('navigation anatomy opens sub-content without changing the menu row width', () => {
  assert.match(source, /\.anatomy-node--navigation-root > \.anatomy-node--list > \[data-part-name='item-container'\]\s*\{[^}]*flex:\s*none;/s);
  assert.match(source, /\.anatomy-node--navigation-root > \.anatomy-node--navigation-viewport\s*\{[^}]*position:\s*static;[^}]*width:\s*100%;[^}]*overflow:\s*hidden;/s);
  assert.match(source, /\.anatomy-node--navigation-viewport > \.anatomy-node--navigation-panel\s*\{[^}]*border-radius:\s*inherit;/s);
});

test('menu anatomy uses explicit separators without duplicate item rules', () => {
  assert.match(source, /\.anatomy-node--menu-panel > \.anatomy-node--item,[\s\S]*?border-bottom:\s*0;/u);
  assert.match(source, /\.anatomy-node--separator\s*\{[^}]*height:\s*1px;/u);
});

test('generic and dedicated anatomy previews share one quiet selection treatment', () => {
  assert.match(source, /\.anatomy-part-active\s*\{[^}]*outline:\s*0\s*!important;[^}]*box-shadow:\s*inset 0 0 0 2px/s);
  for (const dedicatedSource of dedicatedSources) {
    assert.doesNotMatch(dedicatedSource, /outline:\s*3px solid var\(--vp-c-brand-1\)/);
    assert.doesNotMatch(dedicatedSource, /box-shadow:\s*0 0 0 [78]px var\(--vp-c-brand-soft\)/);
  }
});

test('menubar anatomy uses the representative application menu composition', () => {
  const menubarSource = dedicatedSources[2];
  assert.match(source, /import MenubarAnatomy from '\.\/MenubarAnatomy\.vue'/);
  assert.match(source, /v-else-if="usesMenubarAnatomy"/);
  for (const part of ['root', 'item', 'sub-content', 'separator']) {
    assert.match(menubarSource, new RegExp(`data-part="${part}"`));
  }
  assert.match(menubarSource, /Sectile Studio/);
  assert.match(menubarSource, /Command palette/);
  assert.match(menubarSource, /data-level="0"/);
  assert.match(menubarSource, /data-level="1"/);
  assert.match(menubarSource, /sub-content · level 1/);
  assert.match(menubarSource, /item · level 0/);
  assert.match(menubarSource, /item · level 1/);
  assert.match(menubarSource, /Public boundaries/);
  assert.match(menubarSource, /sub-content · 1/);
});
