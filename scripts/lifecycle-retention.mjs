#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

for (const workload of ['all', 'position-resources']) {
  const output = execFileSync(process.execPath, [
    '--expose-gc',
    'scripts/lifecycle-retention-worker.mjs',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SECTILE_LIFECYCLE_WORKLOAD: workload },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  process.stdout.write(output);
}
