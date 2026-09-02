#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundleFixture, deriveFixtures } from './bundle.mjs';
import { validateBaseline, validateCurrentResults } from './check.mjs';
import {
  PACKAGE_NAMES,
  deriveSurfaceFragment,
  loadSurfaceFragments,
  validateSurfaceFragment,
} from './surfaces.mjs';

const repoRoot = resolve('.');
const mode = process.argv[2] ?? 'check';
assert.ok(mode === 'record' || mode === 'check', 'Usage: run.mjs <record|check> [package ...]');
const requestedPackages = process.argv.slice(3).map(normalizePackageName);
const packageNames = requestedPackages.length === 0 ? PACKAGE_NAMES : Object.freeze([...new Set(requestedPackages)]);
if (mode === 'record') assert.deepEqual(packageNames, PACKAGE_NAMES, 'record requires the complete package surface set');

const allFragments = await loadSurfaceFragments(repoRoot);
const fragments = allFragments.filter((entry) => packageNames.includes(entry.package));
for (const packageName of packageNames) {
  const fragment = fragments.find((entry) => entry.package === packageName);
  assert.ok(fragment !== undefined, `${packageName}: missing consumer surface fragment`);
  validateSurfaceFragment(fragment, await deriveSurfaceFragment(repoRoot, packageName));
}

const fixtures = deriveFixtures(fragments);
const results = [];
for (const [index, fixture] of fixtures.entries()) {
  for (const bundler of ['esbuild', 'vite']) {
    results.push(await bundleFixture(repoRoot, fixture, bundler));
  }
  if ((index + 1) % 50 === 0 || index + 1 === fixtures.length) {
    process.stderr.write(`consumer fixtures ${index + 1}/${fixtures.length} complete\n`);
  }
}
validateCurrentResults(fixtures, results);

const report = Object.freeze({
  schemaVersion: 1,
  packages: Object.freeze([...packageNames]),
  fixtures: Object.freeze(fixtures),
  results: Object.freeze(results),
});
const baselinePath = resolve(repoRoot, 'verification/consumer-bundles/baseline.json');
if (mode === 'record') {
  await writeFile(baselinePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
} else {
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  validateBaseline(baseline, report);
}

console.log(JSON.stringify({
  status: 'passed',
  mode,
  packages: packageNames,
  surfaces: fragments.reduce((total, fragment) => total + fragment.surfaces.length, 0),
  fixtures: fixtures.length,
  bundles: results.length,
}));

function normalizePackageName(value) {
  const packageName = value.startsWith('@sectile/') ? value.slice('@sectile/'.length) : value;
  assert.ok(PACKAGE_NAMES.includes(packageName), `unknown consumer bundle package ${value}`);
  return packageName;
}
