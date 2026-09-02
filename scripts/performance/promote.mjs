#!/usr/bin/env node
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promotePerformanceReport } from './baselines.mjs';
import { DEFAULT_BASELINE_DIRECTORY } from './config.mjs';

const [reportArgument] = process.argv.slice(2).filter((argument) => argument !== '--');
assert.notEqual(reportArgument, undefined, 'Usage: promote.mjs <retained-report.json>');
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const promoted = await promotePerformanceReport({
  reportPath: resolve(repoRoot, reportArgument),
  directory: resolve(repoRoot, DEFAULT_BASELINE_DIRECTORY),
});
process.stdout.write(`${JSON.stringify({
  status: promoted.created ? 'created' : 'unchanged',
  baseline: promoted.path,
  buildFingerprint: promoted.report.provenance.buildFingerprint,
})}\n`);
