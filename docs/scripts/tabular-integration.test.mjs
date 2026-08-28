import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('documentation build prepares workspace package outputs', async () => {
  const packageJSON = JSON.parse(await read('package.json'));
  assert.equal(packageJSON.scripts.prebuild, 'pnpm run build:packages');
  assert.equal(packageJSON.scripts.predev, packageJSON.scripts.prebuild);
  assert.match(packageJSON.scripts['build:packages'], /@sectile\/core/u);
  assert.match(packageJSON.scripts['build:packages'], /@sectile\/tabular/u);
});

test('Tabular documentation covers profiles, live examples, Vue injection, source ownership, and opt-in Virtual', async () => {
  const [overview, vue, virtual, koOverview, koVue, koVirtual, config, ...profilePages] = await Promise.all([
    read('packages/tabular.md'),
    read('packages/tabular/vue.md'),
    read('packages/tabular/virtual.md'),
    read('ko/packages/tabular.md'),
    read('ko/packages/tabular/vue.md'),
    read('ko/packages/tabular/virtual.md'),
    read('.vitepress/config.ts'),
    ...['data-table', 'data-grid', 'data-tree-grid'].flatMap((profile) => [
      read(`packages/tabular/${profile}.md`),
      read(`ko/packages/tabular/${profile}.md`),
    ]),
  ]);
  for (const source of [overview, koOverview]) {
    for (const profile of ['DataTable', 'DataGrid', 'DataTreeGrid']) assert.match(source, new RegExp(profile));
  }
  for (const source of [vue, koVue]) {
    assert.match(source, /DataTableProvider|DataGridProvider/u);
    assert.match(source, /useData(?:Table|Grid)Source/u);
    assert.match(source, /loading/iu);
  }
  for (const source of profilePages) {
    assert.match(source, /TabularData(?:Table|Grid|TreeGrid)Demo/u);
    assert.match(source, /전체 예제 source|Complete source for the live example/u);
  }
  for (const source of [virtual, koVirtual]) {
    assert.match(source, /@sectile\/tabular\/virtual/u);
    assert.match(source, /@sectile\/vue\/virtual/u);
    assert.match(source, /pnpm add @sectile\/vue @sectile\/virtual vue/u);
  }
  assert.match(config, /\/packages\/tabular\/vue/u);
  assert.match(config, /\/packages\/tabular\/data-tree-grid/u);
  assert.match(config, /\/ko\/packages\/tabular\/virtual/u);
});

test('Tabular Vue examples use automatic Body rows and concise public props', async () => {
  const sources = await Promise.all([
    read('.vitepress/theme/components/TabularDataTableDemo.vue'),
    read('.vitepress/theme/components/TabularDataGridDemo.vue'),
    read('.vitepress/theme/components/TabularDataTreeGridDemo.vue'),
    ...['data-table', 'data-grid', 'data-tree-grid'].flatMap((profile) => [
      read(`packages/tabular/${profile}.md`),
      read(`ko/packages/tabular/${profile}.md`),
    ]),
  ]);
  assert.match(sources[0], /DataTableCaption/u);
  for (const source of sources) {
    assert.doesNotMatch(source, /acceptedRows/u);
    assert.doesNotMatch(source, /:depth="0"/u);
    assert.doesNotMatch(source, /(?:^|\s):?columnID=/mu);
    assert.doesNotMatch(source, /Data(?:Table|Grid|TreeGrid)Row\s+v-for/u);
  }
});
