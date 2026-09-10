import assert from 'node:assert/strict';
import { groupTestPaths, writeGroupEvidence } from './lib/evidence.mjs';
import { spawnSyncPortable } from '@sectile/tooling/portable-process';

const group = process.argv[2];
assert.match(group ?? '', /^[a-z]+(?:-[a-z]+)*$/u);
const paths = await groupTestPaths(group);
const build = spawnSyncPortable('pnpm', ['--silent', 'run', 'build:verification'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const test = spawnSyncPortable(process.execPath, ['--test', '--test-concurrency=1', ...paths], { stdio: 'inherit' });
if (test.status !== 0) process.exit(test.status ?? 1);
const evidence = await writeGroupEvidence(group, paths);
console.log(JSON.stringify({ status: 'passed', group, ...evidence }, null, 2));
