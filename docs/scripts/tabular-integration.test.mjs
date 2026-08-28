import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('workspace verification prepares package outputs before local documentation tasks', async () => {
  const [packageJSON, workspaceVerifier] = await Promise.all([
    read('package.json').then(JSON.parse),
    readFile(new URL('../../scripts/verify.mjs', import.meta.url), 'utf8'),
  ]);
  assert.equal(packageJSON.scripts.prebuild, undefined);
  assert.equal(packageJSON.scripts.predev, undefined);
  assert.equal(packageJSON.scripts.build, 'vitepress build');
  assert.doesNotMatch(Object.values(packageJSON.scripts).join('\n'), /pnpm --filter @sectile\//u);
  assert.match(workspaceVerifier, /aliases\.set\('docs', '@sectile\/docs'\)/u);
  assert.match(workspaceVerifier, /includeDocumentation/u);
});

test('Tabular documentation covers interactive profiles, hosts, sources, and opt-in Virtual', async () => {
  const [overview, vue, virtual, sourceGuide, contracts, domGuide, koOverview, koVue, koVirtual, koSourceGuide, koContracts, koDomGuide, config, exampleCode, ...profilePages] = await Promise.all([
    read('packages/tabular.md'),
    read('packages/tabular/vue.md'),
    read('packages/tabular/virtual.md'),
    read('packages/tabular/data-source.md'),
    read('packages/tabular/contracts.md'),
    read('packages/tabular/dom.md'),
    read('ko/packages/tabular.md'),
    read('ko/packages/tabular/vue.md'),
    read('ko/packages/tabular/virtual.md'),
    read('ko/packages/tabular/data-source.md'),
    read('ko/packages/tabular/contracts.md'),
    read('ko/packages/tabular/dom.md'),
    read('.vitepress/config.ts'),
    read('.vitepress/theme/tabular-example-code.ts'),
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
    for (const example of ['table-overview', 'grid-overview', 'tree-overview']) {
      assert.match(source, new RegExp(`TabularExample kind="${example}"`));
    }
  }
  for (const source of [vue, koVue]) {
    assert.match(source, /@sectile\/vue\/tabular/u);
    assert.match(source, /pnpm add @sectile\/vue @sectile\/tabular vue/u);
    assert.match(source, /createData(?:Table|Grid)Components/u);
    assert.match(source, /DataGrid\.Provider/u);
    assert.match(source, /useData(?:Table|Grid)Source/u);
    assert.match(source, /loading/iu);
  }
  const featureKinds = [
    ['table-overview', 'table-query', 'table-selection', 'table-structure', 'table-columns'],
    ['grid-overview', 'grid-navigation', 'grid-editing', 'grid-selection'],
    ['tree-overview', 'tree-hierarchy', 'tree-selection'],
  ];
  for (let pageIndex = 0; pageIndex < profilePages.length; pageIndex += 1) {
    const source = profilePages[pageIndex];
    for (const kind of featureKinds[Math.floor(pageIndex / 2)]) {
      assert.match(source, new RegExp(`TabularExample kind="${kind}"`));
    }
    assert.doesNotMatch(source, /::: details/u);
    assert.match(source, /Shift/u);
  }
  for (const source of [sourceGuide, koSourceGuide]) {
    assert.match(source, /TabularExample kind="remote-source"/u);
    assert.match(source, /stale/iu);
  }
  for (const source of [contracts, koContracts]) assert.match(source, /TabularExample kind="contracts"/u);
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
  for (const host of ['vue', 'dom', 'core']) assert.match(exampleCode, new RegExp(`${host}:`));
  for (const kinds of featureKinds) for (const kind of kinds) assert.match(exampleCode, new RegExp(`'${kind}'`));
  assert.match(exampleCode, /'remote-source'/u);
  assert.match(exampleCode, /contracts/u);
  assert.doesNotMatch(exampleCode, /grid\.root|toggle-group|bindRowDisclosure\([^\n]+groupID|\bparser:/u);
  assert.doesNotMatch(exampleCode, /attachRequestExecutor\(async \(\{ request, signal \}\)/u);
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
  assert.match(sources[0], /useId\(\)/u);
  assert.match(sources[0], /:aria-labelledby="titleID"/u);
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
