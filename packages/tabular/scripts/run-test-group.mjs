import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { writeGroupEvidence } from './lib/evidence.mjs';

const group = process.argv[2];
assert.match(group ?? '', /^[a-z]+(?:-[a-z]+)*$/u);
const directory = `tests/${group}`;
const paths = (await readdir(directory))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => `${directory}/${name}`);
assert.ok(paths.length > 0, `${group} has no test files`);
const build = spawnSync('pnpm', ['--silent', 'run', 'build:verification'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const test = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...paths], { stdio: 'inherit' });
if (test.status !== 0) process.exit(test.status ?? 1);
const evidence = await writeGroupEvidence(group, paths);
console.log(JSON.stringify({ status: 'passed', group, ...evidence }, null, 2));
