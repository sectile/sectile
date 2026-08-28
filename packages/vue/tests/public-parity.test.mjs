import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readPackage = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));

test('Vue exposes every public DOM component family', async () => {
  const [domPackage, vuePackage] = await Promise.all([
    readPackage('../../dom/package.json'),
    readPackage('../package.json'),
  ]);
  const ignored = new Set(['.', './package.json', './data-table', './data-grid', './data-tree-grid']);
  const domSubpaths = Object.keys(domPackage.exports).filter((subpath) => !ignored.has(subpath));
  const missing = domSubpaths.filter((subpath) => vuePackage.exports[subpath] === undefined);

  assert.deepEqual(missing, []);
  assert.notEqual(vuePackage.exports['./tabular'], undefined);
  assert.equal(vuePackage.exports['./data-table'], undefined);
  assert.equal(vuePackage.exports['./data-grid'], undefined);
  assert.equal(vuePackage.exports['./data-tree-grid'], undefined);
});

test('Tabular is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/tabular'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/tabular'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/tabular']?.optional, true);

  const rootModule = await import('../dist/index.js');
  assert.equal(rootModule.useDataTable, undefined);
  assert.equal(rootModule.useDataGrid, undefined);
  assert.equal(rootModule.useDataTreeGrid, undefined);

  const tabularModule = await import('../dist/tabular.js');
  assert.equal(typeof tabularModule.useDataTable, 'function');
  assert.equal(typeof tabularModule.useDataGrid, 'function');
  assert.equal(typeof tabularModule.useDataTreeGrid, 'function');

  const tabularSource = await readFile(new URL('../dist/tabular.js', import.meta.url), 'utf8');
  assert.match(tabularSource, /\.\/data-table\.js/);
  assert.match(tabularSource, /\.\/data-grid\.js/);
  assert.match(tabularSource, /\.\/data-tree-grid\.js/);
});

test('virtualization is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/virtual'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/virtual'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/virtual']?.optional, true);

  const rootModule = await import('../dist/index.js');
  assert.equal(rootModule.VirtualList, undefined);
  assert.equal(rootModule.useVirtualizer, undefined);

  const virtualModule = await import('../dist/virtual.js');
  assert.equal(typeof virtualModule.VirtualList, 'object');
  assert.equal(typeof virtualModule.useVirtualizer, 'function');

  const virtualSource = await readFile(new URL('../dist/virtual.js', import.meta.url), 'utf8');
  assert.match(virtualSource, /@sectile\/virtual/);
});

test('temporal controls are exposed only through their optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/temporal'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/temporal'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/temporal']?.optional, true);

  const rootModule = await import('../dist/index.js');
  assert.equal(rootModule.DateField, undefined);
  assert.equal(rootModule.CalendarRoot, undefined);
  assert.equal(rootModule.TemporalProvider, undefined);

  const temporalModule = await import('../dist/temporal.js');
  assert.equal(typeof temporalModule.DateField, 'object');
  assert.equal(typeof temporalModule.CalendarRoot, 'object');
  assert.equal(typeof temporalModule.TemporalProvider, 'object');

  const temporalSource = await readFile(new URL('../dist/temporal.js', import.meta.url), 'utf8');
  assert.match(temporalSource, /\.\/date-field\.js/);
  assert.match(temporalSource, /\.\/temporal-provider\.js/);
});

test('base Tabular profiles are complete and remain Virtual-free', async () => {
  for (const profile of ['data-table', 'data-grid', 'data-tree-grid']) {
    const source = await readFile(new URL(`../dist/${profile}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /@sectile\/virtual|\.\/virtual\.js/);
    const module = await import(`../dist/${profile}.js`);
    assert.equal(module[`${profile === 'data-table' ? 'DataTable' : profile === 'data-grid' ? 'DataGrid' : 'DataTreeGrid'}Loading`], undefined);
    assert.equal(typeof module[profile === 'data-table' ? 'useDataTableSource' : profile === 'data-grid' ? 'useDataGridSource' : 'useDataTreeGridSource'], 'function');
  }
});
