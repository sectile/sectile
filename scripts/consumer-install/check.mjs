import assert from 'node:assert/strict';

export function validateInstallBaseline(baseline, current) {
  assert.equal(baseline.schemaVersion, 1, 'unsupported install baseline schema');
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
    assert.equal(report.dependencyNames.includes('colord'), false, `${report.packageManager}: colord remains installed`);
    assert.ok(report.installedBytes <= Math.ceil(before.installedBytes * 1.05) + 1024, `${report.packageManager}: installed bytes budget exceeded`);
    assert.deepEqual(report.dependencyNames.filter((name) => !before.dependencyNames.includes(name)), [], `${report.packageManager}: dependency tree expanded`);
    for (const incumbent of ['@floating-ui/dom']) {
      assert.ok(report.incumbents[incumbent].bytes <= Math.ceil(before.incumbents[incumbent].bytes * 1.05) + 32, `${report.packageManager}: ${incumbent} bytes expanded`);
    }
  }
  for (const incumbent of ['colord', '@floating-ui/dom']) {
    const before = baseline.incumbentPerformanceEvidence[incumbent];
    const after = current.incumbentPerformanceEvidence[incumbent];
    assert.ok(after.medianNanoseconds <= before.medianNanoseconds * 1.1, `${incumbent}: incumbent latency baseline regressed`);
    assert.ok(after.medianAllocationBytes <= before.medianAllocationBytes * 1.1, `${incumbent}: incumbent allocation baseline regressed`);
    assert.ok(after.medianRetainedBytes <= before.medianRetainedBytes * 1.1 + 1_024, `${incumbent}: incumbent retained-heap baseline regressed`);
  }
}
