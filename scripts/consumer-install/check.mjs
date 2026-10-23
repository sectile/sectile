import assert from 'node:assert/strict';

// Preserve package-local absolute ceilings when moving their enforcement here.
// Relative category budgets still apply; a report must satisfy both policies.
const absoluteCategoryCeilings = Object.freeze({
  core: { declarations: 200_000, sourceMaps: 570_000 },
  chart: { declarations: 120_000, sourceMaps: 350_000 },
  form: { declarations: 35_000, sourceMaps: 80_000 },
  tabular: { declarations: 100_000, sourceMaps: 260_000 },
  temporal: { declarations: 65_000, sourceMaps: 220_000 },
  virtual: { declarations: 50_000, sourceMaps: 175_000 },
});

const payloadCategories = Object.freeze(['runtimeJS', 'declarations', 'sourceMaps']);

function payloadBytes(report) {
  return payloadCategories.reduce((total, category) => {
    const bytes = report.categories[category].bytes;
    assert.ok(Number.isSafeInteger(bytes) && bytes >= 0, `${category}: invalid payload bytes`);
    return total + bytes;
  }, 0);
}

export function validateInstallBaseline(baseline, current) {
  assert.equal(baseline.schemaVersion, 2, 'unsupported install baseline schema');
  assert.equal(current.schemaVersion, 2, 'unsupported current install schema');
  assert.deepEqual(current.installs.map(({ packageManager }) => packageManager).sort(), baseline.installs.map(({ packageManager }) => packageManager).sort(), 'install package-manager coverage drifted');
  assert.deepEqual(Object.keys(current.packages).sort(), Object.keys(baseline.packages).sort(), 'packed package coverage drifted');
  for (const [packageName, report] of Object.entries(current.packages)) {
    const before = baseline.packages[packageName];
    // Packed metadata is reported separately; the same allowance now protects
    // only the delivered payload, in addition to the individual category gates.
    assert.ok(payloadBytes(report) <= Math.ceil(payloadBytes(before) * 1.05) + 32, `${packageName}: payload budget exceeded`);
    if (packageName === 'core') assert.ok(payloadBytes(report) < 1_140_000, 'core: absolute payload ceiling exceeded');
    for (const category of payloadCategories) {
      const actualBytes = report.categories[category].bytes;
      const baselineBytes = before.categories[category].bytes;
      const ceilingBytes = Math.ceil(baselineBytes * 1.05) + 32;
      assert.ok(actualBytes <= ceilingBytes, `${packageName}: ${category} packed budget exceeded: ${actualBytes} bytes > ${ceilingBytes} byte ceiling (baseline ${baselineBytes})`);
      const absoluteCeiling = absoluteCategoryCeilings[packageName]?.[category];
      if (absoluteCeiling !== undefined) {
        assert.ok(actualBytes < absoluteCeiling, `${packageName}: ${category} absolute ceiling exceeded: ${actualBytes} bytes >= ${absoluteCeiling}`);
      }
    }
  }
  for (const report of current.installs) {
    const before = baseline.installs.find(({ packageManager }) => packageManager === report.packageManager);
    assert.ok(before !== undefined, `${report.packageManager}: install baseline missing`);
    assert.deepEqual(report.optionalPeersPresent, [], `${report.packageManager}: optional domain peer installed unexpectedly`);
    for (const dependency of ['colord', '@standard-schema/spec', '@floating-ui/dom', '@floating-ui/core', '@floating-ui/utils']) {
      assert.equal(report.dependencyNames.includes(dependency), false, `${report.packageManager}: ${dependency} remains installed`);
    }
    // Older reports include metadata in installedBytes. Subtract the known
    // Sectile metadata; remaining third-party metadata makes this a conservative
    // upper bound until a separately approved payload baseline is recorded.
    const knownMetadata = ['core', 'dom', 'vue'].reduce((total, name) => total + (baseline.packages[name]?.categories.other.bytes ?? 0), 0);
    const installedBaseline = before.installedPayloadBytes ?? Math.max(0, before.installedBytes - knownMetadata);
    assert.ok(Number.isSafeInteger(report.installedPayloadBytes) && report.installedPayloadBytes >= 0, `${report.packageManager}: invalid installed payload bytes`);
    assert.ok(report.installedPayloadBytes <= Math.ceil(installedBaseline * 1.05) + 1024, `${report.packageManager}: installed payload budget exceeded`);
    assert.deepEqual(report.dependencyNames.filter((name) => !before.dependencyNames.includes(name)), [], `${report.packageManager}: dependency tree expanded`);
  }
}
