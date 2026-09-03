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
const concurrency = readConcurrency();
let completedFixtures = 0;
const results = (await mapWithConcurrency(fixtures, concurrency, async (fixture) => {
  const bundled = await Promise.all(['esbuild', 'vite'].map((bundler) => bundleFixture(repoRoot, fixture, bundler)));
  completedFixtures += 1;
  if (completedFixtures % 50 === 0 || completedFixtures === fixtures.length) {
    process.stderr.write(`consumer fixtures ${completedFixtures}/${fixtures.length} complete\n`);
  }
  return bundled;
})).flat();
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

function readConcurrency() {
  const raw = process.env.SECTILE_CONSUMER_BUNDLE_CONCURRENCY ?? '4';
  const concurrency = Number(raw);
  assert.ok(Number.isSafeInteger(concurrency) && concurrency >= 1 && concurrency <= 16, `invalid consumer bundle concurrency: ${raw}`);
  return concurrency;
}

async function mapWithConcurrency(values, concurrency, action) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await action(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}
