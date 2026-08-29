#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const output = execFileSync(process.execPath, [
  '--expose-gc',
  'scripts/lifecycle-retention-worker.mjs',
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
process.stdout.write(output);
