import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateInstallBaseline } from './consumer-install/check.mjs';

test('diagnostic install reports cannot overwrite the baseline or admit ambiguous output paths', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const owner = fileURLToPath(new URL('./consumer-install/run.mjs', import.meta.url));
  const baseline = fileURLToPath(new URL('../verification/consumer-install/baseline.json', import.meta.url));
  const before = readFileSync(baseline);
  for (const [args, message] of [
    [['--report='], /requires a new output path/u],
    [['--report=first.json', '--report=second.json'], /at most one --report/u],
    [['--report=' + baseline], /cannot overwrite the canonical install baseline/u],
  ]) {
    const result = spawnSync(process.execPath, [owner, 'check', ...args], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
    assert.deepEqual(readFileSync(baseline), before);
  }
});

test('payload, installed payload, dependency, and third-party regressions fail', () => {
  const baseline = fixture();
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.installs[0].optionalPeersPresent.push('@sectile/form'); })), /optional domain peer/u);
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.packages.core.categories.runtimeJS.bytes = 140; })), /140 bytes > 137 byte ceiling \(baseline 100\)/u);
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { for (const key of ['runtimeJS', 'declarations', 'sourceMaps']) copy.packages.core.categories[key].bytes = 120; })), /payload budget/u);
  assert.throws(() => validateInstallBaseline(baseline, mutate(baseline, (copy) => { copy.installs[0].installedPayloadBytes = 2_000; })), /installed payload budget/u);
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
    installs: [{ packageManager: 'npm', installedBytes: 100, installedPayloadBytes: 100, dependencyNames: ['base'], optionalPeersPresent: [] }],
  };
}

test('install checks require the exact package-manager coverage', () => {
  const baseline = fixture();
  baseline.installs.push({ ...structuredClone(baseline.installs[0]), packageManager: 'pnpm' });
  assert.doesNotThrow(() => validateInstallBaseline(baseline, structuredClone(baseline)));
  for (const installs of [[], baseline.installs.slice(0, 1), [baseline.installs[0], baseline.installs[0]]]) {
    assert.throws(() => validateInstallBaseline(baseline, { ...baseline, installs }), /package-manager coverage/u);
  }
});

test('metadata growth is reported without consuming payload allowances', () => {
  const baseline = fixture();
  const current = mutate(baseline, (copy) => {
    copy.packages.core.categories.other.bytes = 1_000_000;
    copy.packages.core.tarballBytes = 1_000_000;
    copy.installs[0].installedBytes = 1_000_000;
  });
  assert.doesNotThrow(() => validateInstallBaseline(baseline, current));
});

test('installed payload uses recorded measurements or the conservative legacy bound', () => {
  const baseline = fixture();
  baseline.installs[0].installedBytes = 10_000;
  delete baseline.installs[0].installedPayloadBytes;
  const current = structuredClone(baseline);
  current.installs[0].installedPayloadBytes = 11_419;
  assert.doesNotThrow(() => validateInstallBaseline(baseline, current));
  current.installs[0].installedPayloadBytes += 1;
  assert.throws(() => validateInstallBaseline(baseline, current), /installed payload budget/u);
  baseline.installs[0].installedPayloadBytes = 100;
  assert.throws(() => validateInstallBaseline(baseline, current), /installed payload budget/u);
  delete current.installs[0].installedPayloadBytes;
  assert.throws(() => validateInstallBaseline(baseline, current), /invalid installed payload/u);
});

test('root checks preserve the absolute declaration and map ceilings of each package', () => {
  for (const [name, declarations, sourceMaps] of [
    ['core', 200_000, 570_000], ['chart', 120_000, 350_000],
    ['form', 35_000, 80_000], ['tabular', 100_000, 260_000],
    ['temporal', 65_000, 220_000], ['virtual', 50_000, 175_000],
  ]) {
    for (const [category, ceiling] of Object.entries({ declarations, sourceMaps })) {
      const baseline = fixture();
      baseline.packages[name] = baseline.packages.core;
      if (name !== 'core') delete baseline.packages.core;
      baseline.packages[name].categories[category].bytes = ceiling - 1;
      const current = structuredClone(baseline);
      current.packages[name].categories[category].bytes = ceiling;
      assert.throws(() => validateInstallBaseline(baseline, current), /absolute ceiling/u);
    }
  }
});

function mutate(value, operation) {
  const copy = structuredClone(value);
  operation(copy);
  return copy;
}
