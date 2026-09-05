import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  collectDependencyClosure,
  deriveAffectedSelection,
  deriveAffectedWorkspaceGates,
} from './lib/verification-plan.mjs';

const graph = fixtureGraph();

test('package-only test changes stay inside that package', () => {
  const selection = deriveAffectedSelection(graph, ['packages/chart/tests/model/model.test.mjs']);
  assert.deepEqual(selection.selectedPackages, ['@sectile/chart']);
  assert.deepEqual(selection.runtimePackages, []);
});

test('runtime package changes expand through reverse workspace dependencies', () => {
  const selection = deriveAffectedSelection(graph, ['packages/chart/src/projection.ts']);
  assert.deepEqual(new Set(selection.selectedPackages), new Set(['@sectile/chart', '@sectile/dom', '@sectile/vue']));
  assert.deepEqual(selection.runtimePackages, ['@sectile/chart']);
  assert.deepEqual(new Set(selection.workspaceGates), new Set([
    'semantic-authority',
    'algorithm-reuse',
    'public-signatures',
    'entrypoint-migrations',
    'consumer-bundles',
  ]));
});

test('tooling-only changes select tooling without pulling packages', () => {
  const selection = deriveAffectedSelection(graph, ['scripts/verify.mjs']);
  assert.deepEqual(selection.selectedPackages, []);
  assert.deepEqual(selection.workspaceGates, ['tooling']);
});

test('host source changes add cross-host verification', () => {
  const gates = deriveAffectedWorkspaceGates(
    ['packages/dom/src/internal/chart-connection.ts'],
    new Set(['@sectile/dom']),
  );
  assert.ok(gates.includes('cross-host'));
});

test('dependency closure prepares dependencies without verifying unrelated dependents', () => {
  assert.deepEqual(
    collectDependencyClosure(graph, new Set(['@sectile/chart']), false),
    new Set(['@sectile/core', '@sectile/chart']),
  );
});

test('verification CLI separates affected, full deterministic, and release certification plans', () => {
  const chart = explain(['chart', '--exact']);
  assert.deepEqual(chart.stages, [
    'prepare @sectile/core',
    'verify @sectile/chart',
    'reproducible package builds',
  ]);
  assert.equal(chart.exact, true);
  assert.equal(chart.certificationPerformance, false);
  assert.equal(chart.failFast, true);

  const full = explain(['--full']);
  assert.deepEqual(full.stages.slice(0, 5), [
    'verify package wave 1: @sectile/core',
    'verify package wave 2: @sectile/chart, @sectile/form, @sectile/temporal, @sectile/virtual',
    'verify package wave 3: @sectile/terminal, @sectile/tabular',
    'verify package wave 4: @sectile/dom',
    'verify package wave 5: @sectile/vue',
  ]);
  assert.equal(full.stages.includes('performance certification'), false);
  assert.equal(full.stages.includes('consumer verification'), true);
  assert.equal(full.commands.includes('consumer bundles'), true);
  assert.equal(full.commands.includes('consumer install'), true);
  assert.ok(full.units.some(({ id }) => id === 'package:vue'));
  assert.ok(full.units.some(({ id }) => id === 'consumer-bundles:vue:1-of-4'));
  assert.ok(full.units.some(({ id }) => id === 'consumer-bundles:vue:4-of-4'));
  assert.ok(full.units.some(({ id }) => id === 'public-signatures'));
  assert.equal(full.certificationPerformance, false);
  assert.equal(full.documentationSiteBuild, false);

  const bundleUnit = explain(['--full', '--unit', 'consumer-bundles:vue:1-of-4']);
  assert.equal(bundleUnit.selectedUnit, 'consumer-bundles:vue:1-of-4');
  assert.deepEqual(bundleUnit.stages, ['consumer bundles @sectile/vue shard 1/4']);
  assert.deepEqual(bundleUnit.commands, ['consumer bundles @sectile/vue shard 1/4']);

  const installUnit = explain(['--full', '--unit', 'consumer-install']);
  assert.equal(installUnit.selectedUnit, 'consumer-install');
  assert.deepEqual(installUnit.stages, ['consumer install']);
  assert.deepEqual(installUnit.units.find(({ id }) => id === 'consumer-install').requires, ['publication-artifacts']);

  const release = explain(['--release']);
  assert.equal(release.stages.includes('performance certification'), true);
  assert.equal(release.certificationPerformance, true);
  assert.equal(release.documentationSiteBuild, true);

  const docs = explain(['docs']);
  assert.equal(docs.documentationSiteBuild, true);
});

test('verification unit CLI lists stable units and rejects unknown IDs', () => {
  const listed = spawnSync(process.execPath, ['scripts/verify.mjs', '--full', '--list-units'], { encoding: 'utf8' });
  assert.equal(listed.status, 0, listed.stderr);
  const units = JSON.parse(listed.stdout).units;
  assert.ok(units.some(({ id }) => id === 'package:virtual'));
  assert.ok(units.some(({ id }) => id === 'consumer-bundles:vue:1-of-4'));
  assert.ok(units.some(({ id }) => id === 'consumer-bundles:virtual'));
  assert.equal(new Set(units.map(({ id }) => id)).size, units.length);

  const unknown = spawnSync(process.execPath, ['scripts/verify.mjs', '--full', '--unit', 'missing:unit', '--explain'], { encoding: 'utf8' });
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown verification unit: missing:unit/u);
});

function explain(arguments_) {
  const result = spawnSync(process.execPath, ['scripts/verify.mjs', ...arguments_, '--explain'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function fixtureGraph() {
  const packages = [
    { name: '@sectile/core', directory: 'core', dependencies: [] },
    { name: '@sectile/chart', directory: 'chart', dependencies: ['@sectile/core'] },
    { name: '@sectile/dom', directory: 'dom', dependencies: ['@sectile/core', '@sectile/chart'] },
    { name: '@sectile/vue', directory: 'vue', dependencies: ['@sectile/core', '@sectile/dom', '@sectile/chart'] },
    { name: '@sectile/form', directory: 'form', dependencies: ['@sectile/core'] },
  ];
  return Object.freeze({
    packages: Object.freeze(packages),
    order: Object.freeze(packages),
    byName: new Map(packages.map((entry) => [entry.name, entry])),
  });
}
