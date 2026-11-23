import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { root } from './lib/repository.mjs';

const packageRoot = join(root, 'packages/tabular');
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--write'), 'Usage: check-tabular-implementation.mjs [--write]');

const groups = ['model', 'source', 'columns', 'selection', 'advanced', 'profiles', 'virtual', 'virtual-witnesses'];
const evidence = [];
for (const group of groups) {
  const path = join(packageRoot, `verification/${group}.json`);
  const bytes = await readFile(path);
  const parsed = JSON.parse(bytes);
  assert.equal(parsed.package, '@sectile/tabular');
  assert.ok(Array.isArray(parsed.tests) && parsed.tests.length > 0);
  evidence.push({ group, tests: parsed.tests.length, sha256: hash(bytes) });
}

const benchmark = JSON.parse(await readFile(join(packageRoot, 'verification/benchmark.json'), 'utf8'));
assert.equal(benchmark.status, 'passed');
assert.deepEqual(benchmark.scales.map((entry) => entry.recordCount), [1_000, 10_000, 100_000]);
assert.ok(benchmark.scales.every((entry) => entry.completed === true && entry.operationCount > 0));
assert.ok(benchmark.scales.every((entry) => entry.stages.warm.operationCount === 0));
assert.ok(benchmark.scales.every((entry) => entry.stages.queryInvalidation.operations.getRowID === 0));
assert.deepEqual(benchmark.generationChurn, {
  ...benchmark.generationChurn,
  generations: 10_000,
  retainedStages: 1,
  status: 'passed',
});

const consumer = JSON.parse(await readFile(join(root, 'verification/consumer-install/tabular.json'), 'utf8'));
assert.equal(consumer.status, 'passed');
const installBaseline = JSON.parse(await readFile(join(root, 'verification/consumer-install/baseline.json'), 'utf8'));
const footprint = { javascriptBytes: 0, declarationBytes: 0, sourceMapBytes: 0 };
for (const path of await files(join(packageRoot, 'dist'))) {
  const bytes = (await stat(path)).size;
  if (path.endsWith('.d.ts')) footprint.declarationBytes += bytes;
  else if (path.endsWith('.map')) footprint.sourceMapBytes += bytes;
  else if (path.endsWith('.js')) footprint.javascriptBytes += bytes;
}

const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
const implementation = {
  schemaVersion: 1,
  package: '@sectile/tabular',
  status: 'passed',
  seed: 'sectile-tabular-v1',
  deterministicEvidence: evidence,
  benchmark: {
    scales: benchmark.scales.map((entry) => ({
      recordCount: entry.recordCount,
      completed: entry.completed,
      operationCount: entry.operationCount,
      warmOperationCount: entry.stages.warm.operationCount,
      queryInvalidationIdentityOperations: entry.stages.queryInvalidation.operations.getRowID,
    })),
    timingPolicy: benchmark.timingPolicy,
    generationChurn: {
      generations: benchmark.generationChurn.generations,
      retainedStages: benchmark.generationChurn.retainedStages,
      tailGrowthBytes: benchmark.generationChurn.tailGrowthBytes,
      ceilingBytes: benchmark.generationChurn.ceilingBytes,
    },
  },
  footprint: {
    ...footprint,
    packedBytes: installBaseline.packages.tabular.tarballBytes,
    declarationFiles: (await files(join(packageRoot, 'dist'))).filter((path) => path.endsWith('.d.ts')).length,
    publicSubpaths: Object.keys(manifest.exports).length,
  },
  consumerScenarios: consumer.scenarios.map((scenario) => scenario.id),
};
const output = `${JSON.stringify(implementation, null, 2)}\n`;
const outputPath = join(packageRoot, 'verification/implementation-verification.json');
if (args[0] === '--write') await writeFile(outputPath, output);
else assert.equal(await readFile(outputPath, 'utf8'), output, 'Tabular implementation evidence drifted; review and run pnpm update:tabular-implementation.');
console.log(`Tabular implementation evidence ${args[0] === '--write' ? 'updated' : 'passed'}: ${evidence.reduce((total, entry) => total + entry.tests, 0)} tests, ${benchmark.scales.length} scales`);

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort((left, right) => relative(directory, left).localeCompare(relative(directory, right)));
}

function hash(value) {
  return createHash('sha256').update(value.toString().replaceAll('\r\n', '\n')).digest('hex');
}
