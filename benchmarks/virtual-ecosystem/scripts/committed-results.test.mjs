import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import virtualPackage from '../../../packages/virtual/package.json' with { type: 'json' };
import viteConfig from '../vite.config.ts';

const resultRoot = new URL('../results/', import.meta.url);

async function readResult(name) {
  return JSON.parse(await readFile(new URL(name, resultRoot), 'utf8'));
}

test('committed list and layout results share one clean source without Sectile failures', async () => {
  const [list, layouts] = await Promise.all([
    readResult('chrome-151-macos-arm64.json'),
    readResult('chrome-151-macos-arm64-layouts.json'),
  ]);

  assert.equal(list.source.gitDirty, false);
  assert.deepEqual(layouts.source, list.source);
  assert.deepEqual(layouts.reports.map((report) => report.conditions.family), [
    'flow-grid', 'masonry', 'track-grid', 'spatial',
  ]);
  assert.equal(list.baselineFailures.filter((failure) => failure.library === 'Sectile Virtual').length, 0);
  assert.equal(list.mutationResults.filter((result) => result.library === 'Sectile Virtual' && result.failedSamples > 0).length, 0);

  for (const report of layouts.reports) {
    assert.equal(report.layoutFailures.filter((failure) => failure.library === 'Sectile Virtual').length, 0);
    assert.equal(report.layoutMutationResults.filter((result) => result.library === 'Sectile Virtual' && result.failedSamples > 0).length, 0);
    assert.ok(report.layoutResults.some((result) => result.library === 'Sectile Virtual'));
    assert.ok(report.layoutMutationResults.some((result) => result.library === 'Sectile Virtual'));
  }
});

test('committed results remain historical while fresh builds inject the workspace version', async () => {
  const [list, baseline, layouts] = await Promise.all([
    readResult('chrome-151-macos-arm64.json'),
    readResult('chrome-151-macos-arm64-baseline.json'),
    readResult('chrome-151-macos-arm64-layouts.json'),
  ]);
  assert.equal(baseline.source.gitCommit, list.source.gitCommit);
  assert.deepEqual(layouts.source, list.source);
  assert.match(list.environment, /Macintosh.+Chrome\/151\./);
  for (const report of [list, baseline, layouts]) {
    assert.deepEqual([...sectileVersions(report)], ['0.11.1']);
  }

  assert.equal(JSON.parse(viteConfig.define.__SECTILE_VIRTUAL_VERSION__), virtualPackage.version);
});

function sectileVersions(value, versions = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) sectileVersions(entry, versions);
  } else if (value !== null && typeof value === 'object') {
    if (value.library === 'Sectile Virtual' && typeof value.version === 'string') versions.add(value.version);
    for (const entry of Object.values(value)) sectileVersions(entry, versions);
  }
  return versions;
}
