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
assert.ok(mode === 'record' || mode === 'check', 'Usage: run.mjs <record|check>');
const fragments = await loadSurfaceFragments(repoRoot);
for (const packageName of PACKAGE_NAMES) {
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
  surfaces: fragments.reduce((total, fragment) => total + fragment.surfaces.length, 0),
  fixtures: fixtures.length,
  bundles: results.length,
}));
