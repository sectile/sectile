import assert from 'node:assert/strict';

export function validateBaseline(baseline, current) {
  assert.equal(baseline.schemaVersion, 1, 'unsupported consumer bundle baseline');
  assert.deepEqual(current.fixtures, baseline.fixtures, 'consumer fixture coverage drifted; review surfaces and record a baseline');
  const expected = new Map(baseline.results.map((entry) => [`${entry.bundler}:${entry.id}`, entry]));
  assert.equal(current.results.length, expected.size, 'consumer bundle result count drifted');
  for (const result of current.results) {
    const before = expected.get(`${result.bundler}:${result.id}`);
    assert.ok(before !== undefined, `${result.bundler}:${result.id}: missing baseline`);
    for (const size of ['raw', 'gzip', 'brotli']) {
      const budget = before[size] === 0 ? 0 : Math.ceil(before[size] * 1.05) + 16;
      assert.ok(result[size] <= budget, `${result.bundler}:${result.id}: ${size} ${result[size]} exceeds ${budget}`);
    }
    assert.deepEqual(
      result.dependencies.filter((dependency) => !before.dependencies.includes(dependency)),
      [],
      `${result.bundler}:${result.id}: dependency closure expanded`,
    );
  }
}

export function validateCurrentResults(fixtures, results) {
  const byKey = new Map(results.map((entry) => [`${entry.bundler}:${entry.id}`, entry]));
  assert.equal(byKey.size, fixtures.length * 2, 'every fixture requires independent Vite and esbuild results');
  for (const result of results) {
    if (result.mode === 'side-effect') {
      assert.equal(result.raw, 0, `${result.bundler}:${result.id}: unused side-effect import did not erase`);
      assert.deepEqual(result.dependencies, [], `${result.bundler}:${result.id}: erased fixture retained a dependency`);
    }
  }
  for (const fixture of fixtures.filter(({ mode }) => mode === 'root-named')) {
    for (const bundler of ['esbuild', 'vite']) {
      const root = byKey.get(`${bundler}:${fixture.id}`);
      const direct = byKey.get(`${bundler}:${fixture.pair}`);
      assert.ok(root !== undefined && direct !== undefined, `${fixture.id}: root/direct pair missing`);
      assert.deepEqual(
        libraryModules(root.modules),
        libraryModules(direct.modules),
        `${bundler}:${fixture.id}: root named closure differs from direct subpath`,
      );
    }
  }
  validateGranularClosures(results);
}

export function validateGranularClosures(results) {
  const virtualStrategies = Object.freeze({
    core: null,
    grid: 'track-grid-layout',
    list: 'linear-layout',
    masonry: 'masonry-layout',
    spatial: 'spatial-layout',
  });
  for (const result of results.filter(({ mode }) => mode === 'named')) {
    const virtual = /^vue:\.\/virtual\/(core|grid|list|masonry|spatial):named$/u.exec(result.id);
    if (virtual !== null) {
      const selected = virtualStrategies[virtual[1]];
      for (const strategy of Object.values(virtualStrategies).filter((value) => value !== null && value !== selected)) {
        assert.ok(
          !result.modules.some((path) => path.endsWith(`/dist/${strategy}.js`)),
          `${result.bundler}:${result.id}: retained sibling ${strategy}`,
        );
      }
    }
    if (result.id === 'vue:./temporal/calendar:named') {
      const unrelated = /@sectile\/(?:dom|vue)\/dist\/(?:date-field|time-field|date-time-field|date-picker|date-range-picker|date-time-picker|date-time-range-picker|month-picker|month-range-picker|year-picker|year-range-picker|range-calendar)\.js$/u;
      assert.deepEqual(
        result.modules.filter((path) => unrelated.test(path)),
        [],
        `${result.bundler}:${result.id}: retained unrelated temporal family`,
      );
    }
  }
}

function libraryModules(modules) {
  return modules.filter((path) => path !== 'fixture' && !path.endsWith('/dist/index.js'));
}
