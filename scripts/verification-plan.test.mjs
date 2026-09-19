import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  collectDependencyClosure,
  deriveAffectedSelection,
  deriveAffectedWorkspaceGates,
} from './lib/verification-plan.mjs';

import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';

const graph = fixtureGraph();

test('public source targets and extracted private owners retain public and delivery gates', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const sources = new Set([
    'packages/chart/src/internal/definition/contracts.ts',
    'packages/form/src/internal/state/transitions.ts',
    'packages/vue/src/form/contracts.ts',
  ]);
  for (const entry of packages) {
    for (const target of Object.values(entry.manifest.exports)) {
      const path = typeof target === 'string' ? target : target.types ?? target.import ?? target.default;
      if (path === './package.json') continue;
      assert.match(path, /^\.\/dist\/.+\.(?:d\.ts|js)$/u);
      sources.add(`packages/${entry.directory}/${path.replace(/^\.\/dist\//u, 'src/').replace(/(?:\.d\.ts|\.js)$/u, '.ts')}`);
    }
  }
  for (const path of sources) {
    const gates = deriveAffectedWorkspaceGates([path], new Set());
    for (const gate of ['entrypoint-migrations', 'public-signatures', 'consumer-bundles']) {
      assert.ok(gates.includes(gate), `${path}: missing ${gate}`);
    }
  }
  const testOnly = deriveAffectedWorkspaceGates(['packages/vue/tests/popup.test.mjs'], new Set(['@sectile/vue']));
  for (const gate of ['entrypoint-migrations', 'public-signatures', 'consumer-bundles']) {
    assert.equal(testOnly.includes(gate), false, `test-only changes selected ${gate}`);
  }
});

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
    'workspace-boundaries',
    'package-structure',
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

test('shared tooling changes verify consumers and workspace ownership', () => {
  const selection = deriveAffectedSelection(graph, ['tools/tooling/build.mjs']);
  assert.deepEqual(new Set(selection.selectedPackages), new Set(graph.packages.map(({ name }) => name)));
  assert.equal(selection.includeDocumentation, true);
  assert.ok(selection.workspaceGates.includes('tooling'));
  assert.ok(selection.workspaceGates.includes('workspace-boundaries'));
});

test('host source changes add cross-host verification', () => {
  const gates = deriveAffectedWorkspaceGates(
    ['packages/dom/src/internal/chart/connection.ts'],
    new Set(['@sectile/dom']),
  );
  assert.ok(gates.includes('cross-host'));
});

test('governed representation sources select crossover verification without broad package coupling', () => {
  const options = { crossoverGovernedSources: ['packages/virtual/src/spatial-layout.ts'] };
  const governed = deriveAffectedWorkspaceGates(
    ['packages/virtual/src/spatial-layout.ts'],
    new Set(['@sectile/virtual']),
    options,
  );
  assert.ok(governed.includes('representation-crossovers'));
  const unrelated = deriveAffectedWorkspaceGates(
    ['packages/virtual/src/surface.ts'],
    new Set(['@sectile/virtual']),
    options,
  );
  assert.equal(unrelated.includes('representation-crossovers'), false);
});

test('structure policy, internal sources and production settings select the structure gate', () => {
  for (const path of [
    'packages/dom/src/internal/chart/connection.ts',
    'packages/chart/tsconfig.build.json',
    'packages/chart/package.json',
    'verification/package-structure/manifest.json',
    'verification/core-layers/manifest.json',
    'scripts/lib/module-graph/imports.mjs',
    'tools/tooling/build.mjs',
    'pnpm-lock.yaml',
  ]) assert.ok(deriveAffectedWorkspaceGates([path], new Set()).includes('package-structure'), path);
  assert.equal(deriveAffectedWorkspaceGates(['scripts/release.test.mjs'], new Set()).includes('package-structure'), false);
  const unit = explain(['--full', '--unit', 'package-structure']);
  assert.equal(unit.selectedUnit, 'package-structure');
  assert.deepEqual(unit.stages, ['package responsibility boundaries']);
  assert.deepEqual(unit.commands, ['package responsibility boundaries']);
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
    'verify package wave 2: @sectile/content, @sectile/chart, @sectile/form, @sectile/temporal, @sectile/virtual',
    'verify package wave 3: @sectile/editor, @sectile/terminal, @sectile/tabular',
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
  assert.equal(release.units.some(({ id }) => id === 'documentation:assets'), false);
  assert.deepEqual(
    release.units.find(({ id }) => id === 'documentation').commands,
    ['@sectile/docs typecheck', '@sectile/docs test', '@sectile/docs build'],
  );

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
