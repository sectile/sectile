import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readPackage = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));

test('Vue exposes every public DOM component family', async () => {
  const [domPackage, vuePackage] = await Promise.all([
    readPackage('../../dom/package.json'),
    readPackage('../package.json'),
  ]);
  const ignored = new Set(['.', './package.json', './form', './position', './tabular', './virtual']);
  const domSubpaths = Object.keys(domPackage.exports).filter((subpath) => !ignored.has(subpath));
  const missing = domSubpaths.filter((subpath) => vuePackage.exports[subpath] === undefined);

  assert.deepEqual(missing, []);
  assert.equal(vuePackage.exports['./tabular'], undefined);
  assert.notEqual(vuePackage.exports['./data-table'], undefined);
  assert.notEqual(vuePackage.exports['./data-grid'], undefined);
  assert.notEqual(vuePackage.exports['./data-tree-grid'], undefined);
});

test('Form is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/form'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/form'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/form']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.FormRoot, undefined);
  assert.equal(rootModule.useFormControl, undefined);

  const formModule = await import('../.verification-dist/form.js');
  assert.equal(typeof formModule.FormRoot, 'object');
  assert.equal(typeof formModule.useFormControl, 'function');
});

test('Chart is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/chart'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/chart'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/chart']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.ChartRoot, undefined);
  assert.equal(rootModule.useChart, undefined);
  assert.equal(rootModule.createChartComponents, undefined);

  const chartModule = await import('../.verification-dist/chart.js');
  assert.equal(typeof chartModule.ChartRoot, 'object');
  assert.equal(typeof chartModule.ChartLine, 'object');
  assert.equal(typeof chartModule.useChart, 'function');
  assert.equal(typeof chartModule.createChartComponents, 'function');
  const chartSource = await readFile(new URL('../.verification-dist/chart.js', import.meta.url), 'utf8');
  assert.match(chartSource, /@sectile\/chart/);
  assert.match(chartSource, /@sectile\/dom\/chart/);
});

test('Tabular is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/tabular'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/tabular'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/tabular']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.useDataTable, undefined);
  assert.equal(rootModule.useDataGrid, undefined);
  assert.equal(rootModule.useDataTreeGrid, undefined);

  assert.equal(vuePackage.exports['./tabular'], undefined);
  assert.equal(typeof (await import('../.verification-dist/data-table.js')).useDataTable, 'function');
  assert.equal(typeof (await import('../.verification-dist/data-grid.js')).useDataGrid, 'function');
  assert.equal(typeof (await import('../.verification-dist/data-tree-grid.js')).useDataTreeGrid, 'function');
});

test('virtualization is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/virtual'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/virtual'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/virtual']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.VirtualList, undefined);
  assert.equal(rootModule.useVirtualizer, undefined);

  assert.equal(vuePackage.exports['./virtual'], undefined);
  assert.equal(typeof (await import('../.verification-dist/virtual-list.js')).VirtualList, 'object');
  assert.equal(typeof (await import('../.verification-dist/virtual-core.js')).useVirtualizer, 'function');
});

test('temporal controls are exposed only through their optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/temporal'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/temporal'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/temporal']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.DateField, undefined);
  assert.equal(rootModule.CalendarRoot, undefined);
  assert.equal(rootModule.TemporalProvider, undefined);

  assert.equal(vuePackage.exports['./temporal'], undefined);
  assert.equal(typeof (await import('../.verification-dist/date-field.js')).DateField, 'object');
  assert.equal(typeof (await import('../.verification-dist/calendar.js')).CalendarRoot, 'object');
  assert.equal(typeof (await import('../.verification-dist/temporal-provider.js')).TemporalProvider, 'object');
});

test('base Tabular profiles are complete and remain Virtual-free', async () => {
  for (const profile of ['data-table', 'data-grid', 'data-tree-grid']) {
    const source = await readFile(new URL(`../.verification-dist/${profile}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /@sectile\/virtual|\.\/virtual\.js/);
    const module = await import(`../.verification-dist/${profile}.js`);
    assert.equal(module[`${profile === 'data-table' ? 'DataTable' : profile === 'data-grid' ? 'DataGrid' : 'DataTreeGrid'}Loading`], undefined);
    assert.equal(module[profile === 'data-table' ? 'useDataTableSource' : profile === 'data-grid' ? 'useDataGridSource' : 'useDataTreeGridSource'], undefined);
  }
});
