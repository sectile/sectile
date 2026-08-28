import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

const mode = process.argv[2] ?? 'production';
if (mode !== 'production' && mode !== 'verification') throw new Error(`Unknown build mode: ${mode}`);
const output = mode === 'verification' ? '.verification-dist' : 'dist';
await rm(output, { recursive: true, force: true });
const result = spawnSync(process.execPath, [
  'node_modules/typescript/lib/tsc.js',
  '--project',
  mode === 'verification' ? 'tsconfig.verify-build.json' : 'tsconfig.build.json',
  '--pretty',
  'false',
], {
  encoding: 'utf8',
  stdio: 'inherit',
});
if (result.error !== undefined) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
