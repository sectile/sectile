import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundleFixture, deriveFixtures } from './consumer-bundles/bundle.mjs';
import {
  selectFixtureShard,
  validateBaseline,
  validateCurrentResults,
  validateGranularClosures,
} from './consumer-bundles/check.mjs';

test('intentional uncovered public subpath changes fixture coverage', () => {
  const fragments = [{ package: 'core', surfaces: [{
    subpath: './new', platform: 'browser', runtimeExports: ['newValue'], fixtureModes: ['side-effect'],
  }] }];
  assert.deepEqual(deriveFixtures(fragments).map(({ id }) => id), ['core:./new:side-effect']);
});

test('Vue Temporal picker fixtures select the principal root component', () => {
  const fragments = [{ package: 'vue', surfaces: [{
    subpath: './temporal/year-picker', platform: 'browser', runtimeExports: ['YearPickerCell', 'YearPickerRoot'], fixtureModes: ['named'],
  }] }];
  assert.equal(deriveFixtures(fragments)[0].exportName, 'YearPickerRoot');
});

test('intentional side-effect and unrelated root closure regressions fail', () => {
  const fixtures = [
    { id: 'core:./sequence:side-effect', mode: 'side-effect' },
    { id: 'core:./sequence:named', mode: 'named' },
    { id: 'core:./sequence:root-named', mode: 'root-named', pair: 'core:./sequence:named' },
  ];
  const sideEffect = fixtureResult('core:./sequence:side-effect', 'side-effect', ['@sectile/core/dist/sequence.js'], 1);
  const direct = fixtureResult('core:./sequence:named', 'named', ['@sectile/core/dist/sequence.js'], 10);
  const matchingRoot = fixtureResult('core:./sequence:root-named', 'root-named', ['@sectile/core/dist/sequence.js'], 10);
  assert.throws(() => validateCurrentResults(fixtures, resultsFor(sideEffect, direct, matchingRoot)), /did not erase/u);
  const root = fixtureResult('core:./sequence:root-named', 'root-named', [
    '@sectile/core/dist/sequence.js', '@sectile/core/dist/tree.js',
  ], 20);
  assert.throws(() => validateCurrentResults(fixtures, resultsFor(
    fixtureResult('core:./sequence:side-effect', 'side-effect', [], 0), direct, root,
  )), /root named closure differs/u);
});

test('intentional byte and dependency regressions fail the baseline', () => {
  const before = fixtureResult('core:./sequence:named', 'named', ['sequence'], 100, []);
  const baseline = { schemaVersion: 1, fixtures: [{ id: before.id }], results: [before] };
  const bytes = { schemaVersion: 1, fixtures: baseline.fixtures, results: [{ ...before, raw: 200 }] };
  assert.throws(() => validateBaseline(baseline, bytes), /exceeds/u);
  const dependency = {
    schemaVersion: 1,
    fixtures: baseline.fixtures,
    results: [{ ...before, dependencies: ['unexpected'] }],
  };
  assert.throws(() => validateBaseline(baseline, dependency), /dependency closure expanded/u);
});

test('targeted consumer bundle checks compare only selected package fixtures', () => {
  const coreFixture = { id: 'core:./sequence:named', package: 'core' };
  const chartFixture = { id: 'chart:./projection:named', package: 'chart' };
  const core = fixtureResult(coreFixture.id, 'named', ['core'], 100, []);
  const chart = fixtureResult(chartFixture.id, 'named', ['chart'], 100, []);
  const baseline = {
    schemaVersion: 1,
    fixtures: [coreFixture, chartFixture],
    results: [core, chart],
  };
  const current = {
    schemaVersion: 1,
    packages: ['chart'],
    fixtures: [chartFixture],
    results: [chart],
  };
  assert.doesNotThrow(() => validateBaseline(baseline, current));
});

test('consumer bundle shards are deterministic and keep root/direct pairs together', () => {
  const fixtures = [
    { id: 'core:./a:named', package: 'core', mode: 'named' },
    { id: 'core:./a:root-named', package: 'core', mode: 'root-named', pair: 'core:./a:named' },
    { id: 'core:./b:side-effect', package: 'core', mode: 'side-effect' },
    { id: 'core:./c:named', package: 'core', mode: 'named' },
  ];
  const first = selectFixtureShard(fixtures, { index: 1, count: 2 });
  const second = selectFixtureShard(fixtures, { index: 2, count: 2 });
  const firstIDs = new Set(first.map(({ id }) => id));
  const secondIDs = new Set(second.map(({ id }) => id));
  assert.equal(firstIDs.has('core:./a:named'), firstIDs.has('core:./a:root-named'));
  assert.equal(secondIDs.has('core:./a:named'), secondIDs.has('core:./a:root-named'));
  assert.deepEqual(
    [...first, ...second].map(({ id }) => id).sort(),
    fixtures.map(({ id }) => id).sort(),
  );
});

test('sharded baseline validation requires the exact deterministic fixture shard', () => {
  const fixtures = [
    { id: 'core:./a:named', package: 'core', mode: 'named' },
    { id: 'core:./a:root-named', package: 'core', mode: 'root-named', pair: 'core:./a:named' },
    { id: 'core:./b:side-effect', package: 'core', mode: 'side-effect' },
    { id: 'core:./c:named', package: 'core', mode: 'named' },
  ];
  const results = fixtures.map((fixture) => fixtureResult(fixture.id, fixture.mode, [], 0));
  const baseline = { schemaVersion: 1, fixtures, results };
  const shard = { index: 1, count: 2 };
  const selected = selectFixtureShard(fixtures, shard);
  const selectedIDs = new Set(selected.map(({ id }) => id));
  const current = {
    schemaVersion: 1,
    packages: ['core'],
    shard,
    fixtures: selected,
    results: results.filter(({ id }) => selectedIDs.has(id)),
  };
  assert.doesNotThrow(() => validateBaseline(baseline, current));
  assert.throws(
    () => validateBaseline(baseline, { ...current, fixtures: current.fixtures.slice(1) }),
    /consumer fixture coverage drifted/u,
  );
});

test('current public targets enforce temporal and virtual sibling isolation', async () => {
  const manifests = new Map(await Promise.all(['virtual', 'vue', 'dom'].map(async (name) => [
    name, JSON.parse(await readFile(resolve('packages', name, 'package.json'), 'utf8')),
  ])));
  const moduleFor = (name, subpath) => {
    const manifest = manifests.get(name);
    const target = manifest.exports[subpath]?.import;
    assert.equal(typeof target, 'string', `${name}/${subpath}: runtime target required`);
    return `${manifest.name}/${target.slice(2)}`;
  };
  const check = (id, modules) => validateGranularClosures([fixtureResult(id, 'named', modules, 1)]);
  const strategies = { core: null, grid: 'track-grid-layout', list: 'linear-layout', masonry: 'masonry-layout', spatial: 'spatial-layout' };
  for (const [layout, selected] of Object.entries(strategies)) {
    const id = `vue:./virtual/${layout}:named`;
    assert.doesNotThrow(() => check(id, selected === null ? [] : [moduleFor('virtual', `./${selected}`)]));
    for (const sibling of Object.values(strategies).filter((value) => value !== null && value !== selected)) {
      assert.throws(() => check(id, [moduleFor('virtual', `./${sibling}`)]), /retained sibling/u);
    }
  }
  const pickerFamilies = ['date-picker', 'month-picker', 'year-picker', 'date-range-picker', 'month-range-picker', 'year-range-picker', 'date-time-picker', 'date-time-range-picker'];
  const calendar = 'vue:./temporal/calendar:named';
  assert.doesNotThrow(() => check(calendar, [moduleFor('vue', './temporal/calendar')]));
  for (const name of ['vue', 'dom']) {
    for (const family of [...pickerFamilies, 'date-field', 'time-field', 'date-time-field', 'range-calendar']) {
      assert.throws(() => check(calendar, [moduleFor(name, `./temporal/${family}`)]), /retained unrelated temporal/u);
    }
  }
  for (const selected of ['date-picker', 'month-picker', 'year-picker']) {
    const id = `vue:./temporal/${selected}:named`;
    assert.doesNotThrow(() => check(id, [moduleFor('vue', `./temporal/${selected}`)]));
    for (const family of pickerFamilies.filter((value) => value !== selected)) {
      assert.throws(() => check(id, [moduleFor('vue', `./temporal/${family}`)]), /retained sibling Vue/u);
    }
    const allowedDOM = new Set([selected, ...(selected === 'date-picker' ? [] : ['date-picker'])]);
    for (const family of pickerFamilies) {
      const modules = [moduleFor('dom', `./temporal/${family}`)];
      if (allowedDOM.has(family)) assert.doesNotThrow(() => check(id, modules));
      else assert.throws(() => check(id, modules), /retained sibling DOM/u);
    }
  }
});

test('base date picker factories tree-shake period capabilities in both bundlers', async () => {
  for (const [family, exportName] of [['date-picker', 'createDatePicker'], ['date-range-picker', 'createDateRangePicker']]) {
    const fixture = {
      id: `dom:./temporal/${family}:named`, package: 'dom', subpath: `./temporal/${family}`,
      source: `@sectile/dom/temporal/${family}`, exportName, mode: 'named', platform: 'browser', pair: null,
    };
    const results = await Promise.all(['esbuild', 'vite'].map((bundler) => bundleFixture(resolve('.'), fixture, bundler)));
    validateGranularClosures(results);
    assert.ok(results.every((result) => result.modules.includes(`@sectile/dom/dist/temporal/${family}.js`)));
  }
});

test('base date hosts exclude period behavior while period hosts retain their own capabilities', () => {
  for (const id of ['dom:./temporal/date-picker:named', 'dom:./temporal/date-range-picker:named', 'temporal:./calendar:named']) {
    assert.doesNotThrow(() => validateGranularClosures([fixtureResult(id, 'named', ['@sectile/temporal/dist/calendar.js'], 1)]));
    for (const module of [
      '@sectile/dom/dist/temporal/internal/period-picker.js',
      '@sectile/temporal/dist/pickers/period/navigation.js',
    ]) {
      const modules = [module];
      assert.throws(() => validateGranularClosures([fixtureResult(id, 'named', modules, 1)]), /base date host retained period-only behavior/u);
      assert.doesNotThrow(() => validateGranularClosures([fixtureResult('dom:./temporal/month-range-picker:named', 'named', modules, 1)]));
    }
  }
});

test('passive Chart tick imports exclude controller ownership while root imports retain their own closure', () => {
  const ticks = {
    ...fixtureResult('vue:./chart:named', 'named', ['@sectile/vue/dist/chart.js'], 100),
    source: '@sectile/vue/chart', exportName: 'ChartAxisTicks',
  };
  assert.doesNotThrow(() => validateGranularClosures([ticks]));
  for (const module of ['@sectile/chart/dist/controller.js', '@sectile/dom/dist/internal/chart/renderers/webgl2.js']) {
    const expanded = { ...ticks, modules: [...ticks.modules, module] };
    assert.throws(() => validateGranularClosures([expanded]), /passive Chart ticks retained/u);
    assert.doesNotThrow(() => validateGranularClosures([{ ...expanded, exportName: 'ChartRoot' }]));
  }
});

function fixtureResult(id, mode, modules, raw, dependencies = []) {
  return { id, bundler: 'esbuild', mode, modules, raw, gzip: raw, brotli: raw, dependencies };
}

function resultsFor(...esbuildResults) {
  return esbuildResults.flatMap((entry) => [entry, { ...entry, bundler: 'vite' }]);
}
