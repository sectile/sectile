import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const docsRoot = resolve(import.meta.dirname, '..');

async function source(path) {
  return readFile(resolve(docsRoot, path), 'utf8');
}

test('benchmark uses the shared always-visible CascadeList demo', async () => {
  const benchmark = await source('.vitepress/theme/components/VirtualBenchmarkReport.vue');

  assert.match(benchmark, /import DemoCascadeList from '\.\/DemoCascadeList\.vue';/u);
  assert.match(benchmark, /<DemoCascadeList/u);
  assert.match(benchmark, /:column-count="4"/u);
  assert.match(benchmark, /:show-value="false"/u);
  assert.doesNotMatch(benchmark, /DemoCascadeSelect/u);
});

test('DemoCascadeList keeps a stable column region without popup parts', async () => {
  const demo = await source('.vitepress/theme/components/DemoCascadeList.vue');
  const componentCase = await source('.vitepress/theme/components/CascadeListCase.vue');

  assert.match(demo, /from '@sectile\/vue\/cascade-list';/u);
  assert.match(demo, /<CascadeListColumn/u);
  assert.match(demo, /columnDepths\(columns\)/u);
  assert.match(demo, /grid-auto-columns: max-content/u);
  assert.match(demo, /\.cascade-list-column \{ display: grid; min-width: 10rem;/u);
  assert.match(demo, /\.cascade-list-item > span:first-child \{ flex: 0 0 auto; white-space: nowrap; \}/u);
  assert.match(demo, /\.cascade-list-column\[hidden\] \{ display: grid; visibility: hidden; \}/u);
  assert.doesNotMatch(demo, /Cascade(?:List|Select)(?:Trigger|Content)/u);
  assert.match(componentCase, /import DemoCascadeList from '\.\/DemoCascadeList\.vue';/u);
});
