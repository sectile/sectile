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

test('Tabular documentation covers core, DOM, Vue, profiles, sources, and opt-in Virtual', async () => {
  const [overview, vue, virtual, sourceGuide, domGuide, koOverview, koVue, koVirtual, koSourceGuide, koDomGuide, config, ...profilePages] = await Promise.all([
    read('packages/tabular.md'),
    read('packages/tabular/vue.md'),
    read('packages/tabular/virtual.md'),
    read('packages/tabular/data-source.md'),
    read('packages/tabular/dom.md'),
    read('ko/packages/tabular.md'),
    read('ko/packages/tabular/vue.md'),
    read('ko/packages/tabular/virtual.md'),
    read('ko/packages/tabular/data-source.md'),
    read('ko/packages/tabular/dom.md'),
    read('.vitepress/config.ts'),
    ...['data-table', 'data-grid', 'data-tree-grid'].flatMap((profile) => [
      read(`packages/tabular/${profile}.md`),
      read(`ko/packages/tabular/${profile}.md`),
    ]),
  ]);
  for (const source of [overview, koOverview]) {
    for (const profile of ['DataTable', 'DataGrid', 'DataTreeGrid']) assert.match(source, new RegExp(profile));
    assert.match(source, /@sectile\/tabular/u);
    assert.match(source, /@sectile\/dom/u);
    assert.match(source, /@sectile\/vue/u);
  }
  for (const source of [vue, koVue]) {
    assert.match(source, /@sectile\/vue\/tabular/u);
    assert.match(source, /pnpm add @sectile\/vue @sectile\/tabular vue/u);
    assert.match(source, /createData(?:Table|Grid)Components/u);
    assert.match(source, /DataGrid\.Provider/u);
    assert.match(source, /useData(?:Table|Grid)Source/u);
    assert.match(source, /loading/iu);
  }
  for (const source of profilePages) {
    assert.match(source, /TabularData(?:Table|Grid|TreeGrid)Demo/u);
    assert.match(source, /전체 예제 source|Complete source for the live example/u);
    assert.match(source, /@sectile\/tabular\/data-(?:table|grid|tree-grid)/u);
    assert.match(source, /@sectile\/dom\/tabular/u);
    assert.doesNotMatch(source, /@sectile\/dom\/data-(?:table|grid|tree-grid)/u);
    assert.match(source, /Shift/u);
  }
  for (const source of [sourceGuide, koSourceGuide]) assert.match(source, /attachRequestExecutor/u);
  for (const source of [domGuide, koDomGuide]) {
    assert.match(source, /pnpm add @sectile\/dom @sectile\/tabular/u);
    assert.match(source, /@sectile\/dom\/tabular/u);
    assert.match(source, /columnID: 'name'/u);
  }
  for (const source of [virtual, koVirtual]) {
    assert.match(source, /@sectile\/tabular\/virtual/u);
    assert.match(source, /@sectile\/vue\/virtual/u);
    assert.match(source, /pnpm add @sectile\/vue @sectile\/tabular @sectile\/virtual vue/u);
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
  assert.match(sources[0], /aria-labelledby="tabular-data-table-demo-title"/u);
  assert.doesNotMatch(sources[0], /DataTable\.Caption/u);
  for (const source of sources.slice(0, 3)) assert.match(source, /@sectile\/vue\/tabular/u);
  for (const source of sources) {
    assert.doesNotMatch(source, /@sectile\/vue\/data-(?:table|grid|tree-grid)/u);
    assert.doesNotMatch(source, /acceptedRows/u);
    assert.doesNotMatch(source, /:depth="0"/u);
    assert.doesNotMatch(source, /(?:^|\s):?columnID=/mu);
    assert.doesNotMatch(source, /(?:^|\s):?headerNodeID=/mu);
    assert.doesNotMatch(source, /Data(?:Table|Grid|TreeGrid)Row\s+v-for/u);
    assert.doesNotMatch(source, /<Data(?:Table|Grid|TreeGrid)\.Provider\s+:controller=/u);
  }
});
