import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
const result = spawnSync('tsc', ['--project', 'tsconfig.build.json', '--pretty', 'false'], {
  encoding: 'utf8',
  stdio: 'inherit',
});
if (result.error !== undefined) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
