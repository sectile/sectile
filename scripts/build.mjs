import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'production';
const verification = mode === 'verification';
if (!verification && mode !== 'production') {
  throw new Error(`Unknown build mode: ${mode}`);
}
const output = resolve(
  root,
  verification ? 'packages/primitives/.verification-dist' : 'packages/primitives/dist',
);
await rm(output, { recursive: true, force: true });
const project = resolve(
  root,
  verification
    ? 'packages/primitives/tsconfig.verify-build.json'
    : 'packages/primitives/tsconfig.build.json',
);
const result = spawnSync('tsc', ['--project', project, '--pretty', 'false'], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});
if (result.error !== undefined) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
