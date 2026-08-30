import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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
