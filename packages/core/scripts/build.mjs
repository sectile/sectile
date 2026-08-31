import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactJavaScript } from '../../../scripts/lib/compact-javascript.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'production';
const verification = mode === 'verification';
if (!verification && mode !== 'production') {
  throw new Error(`Unknown build mode: ${mode}`);
}
const output = resolve(
  root,
  verification ? '.verification-dist' : 'dist',
);
await rm(output, { recursive: true, force: true });
const project = resolve(
  root,
  verification
    ? 'tsconfig.verify-build.json'
    : 'tsconfig.build.json',
);
const result = spawnSync(process.execPath, [
  resolve(root, 'node_modules/typescript/lib/tsc.js'),
  '--project',
  project,
  '--newLine',
  'lf',
  '--pretty',
  'false',
], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});
if (result.error !== undefined) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!verification) await compactJavaScript(output);
