import assert from 'node:assert/strict';

export function validateInstallBaseline(baseline, current) {
  assert.equal(baseline.schemaVersion, 2, 'unsupported install baseline schema');
  assert.equal(current.schemaVersion, 2, 'unsupported current install schema');
  assert.deepEqual(Object.keys(current.packages).sort(), Object.keys(baseline.packages).sort(), 'packed package coverage drifted');
  for (const [packageName, report] of Object.entries(current.packages)) {
    const before = baseline.packages[packageName];
    assert.ok(report.tarballBytes <= Math.ceil(before.tarballBytes * 1.05) + 32, `${packageName}: tarball budget exceeded`);
    for (const category of ['runtimeJS', 'declarations', 'sourceMaps', 'other']) {
      assert.ok(report.categories[category].bytes <= Math.ceil(before.categories[category].bytes * 1.05) + 32, `${packageName}: ${category} packed budget exceeded`);
    }
  }
  for (const report of current.installs) {
    const before = baseline.installs.find(({ packageManager }) => packageManager === report.packageManager);
    assert.ok(before !== undefined, `${report.packageManager}: install baseline missing`);
    assert.deepEqual(report.optionalPeersPresent, [], `${report.packageManager}: optional domain peer installed unexpectedly`);
    for (const dependency of ['colord', '@standard-schema/spec', '@floating-ui/dom', '@floating-ui/core', '@floating-ui/utils']) {
      assert.equal(report.dependencyNames.includes(dependency), false, `${report.packageManager}: ${dependency} remains installed`);
    }
    assert.ok(report.installedBytes <= Math.ceil(before.installedBytes * 1.05) + 1024, `${report.packageManager}: installed bytes budget exceeded`);
    assert.deepEqual(report.dependencyNames.filter((name) => !before.dependencyNames.includes(name)), [], `${report.packageManager}: dependency tree expanded`);
  }
}
