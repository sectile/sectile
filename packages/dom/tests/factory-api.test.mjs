import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import packageManifest from '../package.json' with { type: 'json' };

const excludedSubpaths = new Set(['./package.json', './chart', './form', './identity', './position', './presence', './tabular', './virtual']);

test('every public DOM component exposes direct and fallible factories', async () => {
  const rootModule = await import('../.verification-dist/index.js');
  for (const subpath of Object.keys(packageManifest.exports)) {
    if (!subpath.startsWith('./') || excludedSubpaths.has(subpath) || subpath.startsWith('./temporal/')) continue;
    const component = subpath.slice(2);
    const name = component === 'grid' ? 'GridControl' : component
      .split('-')
      .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
      .join('');
    const module = await import(`../.verification-dist/${component}.js`);
    assert.equal(typeof module[`create${name}`], 'function', `${subpath} create factory`);
    assert.equal(typeof module[`tryCreate${name}`], 'function', `${subpath} tryCreate factory`);
    assert.equal(typeof rootModule[`create${name}`], 'function', `root create${name} export`);
    assert.equal(typeof rootModule[`tryCreate${name}`], 'function', `root tryCreate${name} export`);
  }
});

test('presence observation is exposed only through its focused utility subpath', async () => {
  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.createPresence, undefined);

  const presenceModule = await import('../.verification-dist/presence.js');
  assert.equal(typeof presenceModule.createPresence, 'function');
});

test('identity encoding is exposed only through its focused utility subpath', async () => {
  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.stableIDToken, undefined);
  assert.equal(rootModule.stableIDElementToken, undefined);

  const identityModule = await import('../.verification-dist/identity.js');
  assert.equal(typeof identityModule.stableIDToken, 'function');
  assert.equal(typeof identityModule.stableIDElementToken, 'function');
});

test('Form is exposed only through its optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/form'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/form'], 'workspace:^');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/form']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.createForm, undefined);

  const formModule = await import('../.verification-dist/form.js');
  assert.equal(typeof formModule.createForm, 'function');
  const formSource = await readFile(new URL('../.verification-dist/form.js', import.meta.url), 'utf8');
  assert.match(formSource, /@sectile\/form/);
});

test('virtualization is exposed only through its optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/virtual'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/virtual'], 'workspace:^');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/virtual']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.createVirtualizer, undefined);
  assert.equal(rootModule.virtualContentStyle, undefined);

  const virtualModule = await import('../.verification-dist/virtual.js');
  assert.equal(typeof virtualModule.createVirtualizer, 'function');

  const virtualSource = await readFile(new URL('../.verification-dist/virtual.js', import.meta.url), 'utf8');
  assert.doesNotMatch(virtualSource, /(?:^|['"])@sectile\/virtual(?:['"]|$)/);
});

test('Tabular controls are exposed only through their optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/tabular'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/tabular'], 'workspace:^');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/tabular']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.createDataTable, undefined);
  assert.equal(rootModule.createDataGrid, undefined);
  assert.equal(rootModule.createDataTreeGrid, undefined);

  const tabularModule = await import('../.verification-dist/tabular.js');
  assert.equal(typeof tabularModule.createDataTable, 'function');
  assert.equal(typeof tabularModule.createDataGrid, 'function');
  assert.equal(typeof tabularModule.createDataTreeGrid, 'function');

  const tabularSource = await readFile(new URL('../.verification-dist/tabular.js', import.meta.url), 'utf8');
  assert.match(tabularSource, /\.\/data-table\.js/);
  assert.match(tabularSource, /\.\/data-grid\.js/);
  assert.match(tabularSource, /\.\/data-tree-grid\.js/);
});

test('Chart rendering is exposed only through its optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/chart'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/chart'], 'workspace:^');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/chart']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.createDOMChart, undefined);
  assert.equal(rootModule.createChartRenderer, undefined);

  const chartModule = await import('../.verification-dist/chart.js');
  assert.equal(typeof chartModule.createDOMChart, 'function');
  assert.equal(typeof chartModule.tryCreateDOMChart, 'function');
  assert.equal(typeof chartModule.createChartRenderer, 'function');

  const chartSource = await readFile(new URL('../.verification-dist/internal/chart-connection.js', import.meta.url), 'utf8');
  assert.match(chartSource, /@sectile\/chart/);
});

test('temporal controls are exposed only through their optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/temporal'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/temporal'], 'workspace:^');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/temporal']?.optional, true);

  const rootModule = await import('../.verification-dist/index.js');
  assert.equal(rootModule.createDateField, undefined);
  assert.equal(rootModule.createCalendar, undefined);

  assert.equal(packageManifest.exports['./temporal'], undefined);
  const dateFieldModule = await import('../.verification-dist/date-field.js');
  const calendarModule = await import('../.verification-dist/calendar.js');
  assert.equal(typeof dateFieldModule.createDateField, 'function');
  assert.equal(typeof calendarModule.createCalendar, 'function');
  const dateFieldSource = await readFile(new URL('../.verification-dist/date-field.js', import.meta.url), 'utf8');
  assert.match(dateFieldSource, /@sectile\/temporal/);
});
