import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveFixtures } from './consumer-bundles/bundle.mjs';
import { validateBaseline, validateCurrentResults, validateGranularClosures } from './consumer-bundles/check.mjs';

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

test('intentional temporal and virtual sibling closures fail', () => {
  assert.throws(() => validateGranularClosures([
    fixtureResult('vue:./virtual/list:named', 'named', ['@sectile/virtual/dist/masonry-layout.js'], 1),
  ]), /retained sibling/u);
  assert.throws(() => validateGranularClosures([
    fixtureResult('vue:./temporal/calendar:named', 'named', ['@sectile/vue/dist/date-picker.js'], 1),
  ]), /retained unrelated temporal/u);
  assert.throws(() => validateGranularClosures([
    fixtureResult('vue:./temporal/month-picker:named', 'named', ['@sectile/vue/dist/year-picker.js'], 1),
  ]), /retained sibling Vue/u);
  assert.throws(() => validateGranularClosures([
    fixtureResult('vue:./temporal/year-picker:named', 'named', ['@sectile/dom/dist/date-time-picker.js'], 1),
  ]), /retained sibling DOM/u);
});

function fixtureResult(id, mode, modules, raw, dependencies = []) {
  return { id, bundler: 'esbuild', mode, modules, raw, gzip: raw, brotli: raw, dependencies };
}

function resultsFor(...esbuildResults) {
  return esbuildResults.flatMap((entry) => [entry, { ...entry, bundler: 'vite' }]);
}
