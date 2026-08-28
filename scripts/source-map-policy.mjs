#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectSourceMapPackages, packageNames, validateSourceMapBudget } from './lib/source-map-policy.mjs';

const mode = process.argv[2] ?? 'check';
assert.ok(mode === 'check' || mode === 'record', `unknown source-map mode: ${mode}`);
for (const packageName of packageNames) {
  const config = JSON.parse(await readFile(resolve('packages', packageName, 'tsconfig.build.json'), 'utf8'));
  assert.deepEqual({
    sourceMap: config.compilerOptions.sourceMap,
    declarationMap: config.compilerOptions.declarationMap,
    inlineSourceMap: config.compilerOptions.inlineSourceMap,
    inlineSources: config.compilerOptions.inlineSources,
  }, { sourceMap: true, declarationMap: false, inlineSourceMap: false, inlineSources: false }, `${packageName}: publish source-map compiler policy drifted`);
  const verificationConfig = JSON.parse(await readFile(resolve('packages', packageName, 'tsconfig.verify-build.json'), 'utf8'));
  assert.equal(verificationConfig.compilerOptions.sourceMap, false, `${packageName}: verification builds must remain map-free`);
  assert.equal(verificationConfig.compilerOptions.declarationMap, false, `${packageName}: verification declarations must remain map-free`);
}
const report = await inspectSourceMapPackages(resolve('.'));
const migration = JSON.parse(await readFile('verification/source-maps/migration.json', 'utf8'));
assert.equal(migration.schemaVersion, 1, 'source-map migration schema drifted');
assert.equal(Object.values(migration.before.packages).reduce((sum, entry) => sum + entry.files, 0), migration.before.declarationMapFiles, 'source-map migration file total drifted');
assert.equal(Object.values(migration.before.packages).reduce((sum, entry) => sum + entry.bytes, 0), migration.before.declarationMapBytes, 'source-map migration byte total drifted');
assert.equal(migration.after.declarationMapFiles, 0, 'source-map migration must remove declaration maps');
assert.equal(migration.after.declarationMapBytes, 0, 'source-map migration must remove declaration-map bytes');
assert.equal(migration.after.externalJavaScriptMapFiles, migration.before.declarationMapFiles, 'source-map migration historical JavaScript map count drifted');
assert.equal(
  report.packages.reduce((sum, entry) => sum + entry.sourceMapFiles, 0),
  report.packages.reduce((sum, entry) => sum + entry.javascriptFiles, 0),
  'every current JavaScript artifact must retain one external source map',
);
const baselinePath = 'verification/source-maps/baseline.json';
if (mode === 'record') {
  await mkdir('verification/source-maps', { recursive: true });
  await writeFile(baselinePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
else validateSourceMapBudget(report, JSON.parse(await readFile(baselinePath, 'utf8')));
console.log(JSON.stringify({
  status: 'passed',
  mode,
  packages: report.packages.length,
  javascriptFiles: report.packages.reduce((sum, entry) => sum + entry.javascriptFiles, 0),
  sourceMapFiles: report.packages.reduce((sum, entry) => sum + entry.sourceMapFiles, 0),
  declarationMapFiles: report.packages.reduce((sum, entry) => sum + entry.declarationMapFiles, 0),
}));
