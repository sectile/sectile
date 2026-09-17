import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBuildConfig } from '../tools/tooling/build.mjs';
import { spawnSyncPortable } from '../tools/tooling/portable-process.mjs';
import { root } from './lib/repository.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';
import { collectPackageGraph, inputFingerprint, digest } from './lib/module-graph/package-graph.mjs';
import { validateStructureManifest, inspectStructure, assertStructure } from './lib/module-graph/policy.mjs';

function productionConfiguration(entries) {
  return entries.map((entry) => {
    const directory = resolve(root, 'packages', entry.directory);
    const config = readBuildConfig(directory, 'production');
    assert.ok(Array.isArray(config.files) && config.files.length > 0, `${entry.name}: no production input files`);
    assert.equal(config.compilerOptions.noEmit, false, `${entry.name}: expected emitting production configuration`);
    return { name: entry.name, config, files: config.files.map((path) => resolve(directory, path)) };
  });
}

export function buildGraphPackages(entries, run = spawnSyncPortable) {
  // Resolve each declared public tooling binary, rather than depending on a
  // package-manager shim being inherited by lifecycle subprocesses.
  const commands = entries.map((entry) => {
    assert.equal(entry.manifest.scripts?.build, 'sectile-build production', `${entry.name}: unsupported production build owner`);
    assert.equal(entry.manifest.scripts?.prebuild, undefined, `${entry.name}: prebuild requires explicit orchestration`);
    assert.equal(entry.manifest.scripts?.postbuild, undefined, `${entry.name}: postbuild requires explicit orchestration`);
    assert.ok(entry.manifest.devDependencies?.['@sectile/tooling'], `${entry.name}: declared build tooling required`);
    const directory = resolve(root, 'packages', entry.directory);
    const require = createRequire(resolve(directory, 'package.json'));
    return { name: entry.name, directory, binary: require.resolve('@sectile/tooling/build') };
  });
  for (const command of commands) {
    console.log(`Production build: ${command.name}`);
    const result = run(process.execPath, [command.binary, 'production'], { cwd: command.directory, stdio: 'inherit' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${command.name}: production build failed; runtime graph not verified`);
  }
}

export async function checkPackageStructure({ sourceOnly = false } = {}) {
  const { packages, order } = await loadPublishedPackageGraph();
  const policyText = await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8');
  const manifest = JSON.parse(policyText);
  const source = await collectPackageGraph(root, packages);
  const classes = validateStructureManifest(manifest, packages, source);
  const sourceReport = inspectStructure(source, manifest, classes);
  assertStructure(sourceReport);
  const result = {
    status: sourceReport.debt.length ? 'passed-with-recorded-debt' : 'passed',
    scope: sourceOnly ? 'source-only; runtime NOT checked' : 'source and fresh production output',
    policyDigest: digest(policyText),
    packages: packages.length,
    source: { modules: source.modules.length, edges: source.edges.length, cyclicComponents: sourceReport.components.length },
    runtime: null,
    debt: sourceReport.debt.map(({ id, owner, workItem }) => ({ id, owner, workItem })),
  };
  if (sourceOnly) return result;

  const configuration = productionConfiguration(packages);
  const before = await inputFingerprint(root, packages, source, configuration);
  // Existing package production compiler and compactor, in the repository's
  // dependency order. No alternate erasure or pre-existing dist is accepted.
  buildGraphPackages(order);
  const afterPackages = (await loadPublishedPackageGraph()).packages;
  const afterConfiguration = productionConfiguration(afterPackages);
  const afterSource = await collectPackageGraph(root, afterPackages);
  assert.equal(await inputFingerprint(root, afterPackages, afterSource, afterConfiguration), before, 'Build inputs changed during graph verification');
  assert.equal(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'), policyText, 'Role policy changed during graph verification');
  const productionFiles = new Map(afterConfiguration.map(({ name, files }) => [name, files]));
  const runtime = await collectPackageGraph(root, afterPackages, { mode: 'runtime', productionFiles });
  const runtimeReport = inspectStructure(runtime, manifest, classes);
  assertStructure(runtimeReport);
  result.inputDigest = before;
  result.runtime = {
    modules: runtime.modules.length, edges: runtime.edges.length,
    cyclicComponents: runtimeReport.components.length,
    outputDigest: digest(JSON.stringify(runtime.modules)),
  };
  result.debt.push(...runtimeReport.debt.map(({ id, owner, workItem }) => ({ id, owner, workItem })));
  result.status = result.debt.length ? 'passed-with-recorded-debt' : 'passed';
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--source-only'), 'Usage: check-package-structure.mjs [--source-only]');
  console.log(JSON.stringify(await checkPackageStructure({ sourceOnly: args.length === 1 }), null, 2));
}
