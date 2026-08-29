import assert from 'node:assert/strict';
import test from 'node:test';
import { validateInstallBaseline } from './consumer-install/check.mjs';

test('intentional tarball, installed-byte, dependency, and third-party regressions fail', () => {
  const baseline = fixture();
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.installs[0].optionalPeersPresent.push('@sectile/form'); })), /optional domain peer/u);
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.packages.core.tarballBytes = 200; })), /tarball budget/u);
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.installs[0].installedBytes = 2_000; })), /installed bytes/u);
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.installs[0].dependencyNames.push('unexpected'); })), /dependency tree expanded/u);
  for (const dependency of ['colord', '@standard-schema/spec', '@floating-ui/dom']) {
    assert.throws(
      () => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.installs[0].dependencyNames.push(dependency); })),
      new RegExp(dependency.replace('/', '\\/')),
    );
  }
});

function fixture() {
  return {
    schemaVersion: 2,
    packages: { core: { tarballBytes: 100, categories: Object.fromEntries(['runtimeJS', 'declarations', 'sourceMaps', 'other'].map((key) => [key, { bytes: 100 }])) } },
    installs: [{ packageManager: 'npm', installedBytes: 100, dependencyNames: ['base'], optionalPeersPresent: [] }],
  };
}

function mutate(value, operation) {
  const copy = structuredClone(value);
  operation(copy);
  return copy;
}
