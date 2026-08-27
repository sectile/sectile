import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (let index = 0; index < 2; index += 1) {
  const result = spawnSync('pnpm', ['--silent', 'run', 'test:model'], { stdio: 'inherit' });
  assert.equal(result.status, 0);
}
