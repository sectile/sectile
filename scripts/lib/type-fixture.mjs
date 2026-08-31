import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export function runTypeFixture(tsconfig, options = {}) {
  const typescriptCLI = options.typescriptCLI
    ?? resolve(options.cwd ?? '.', 'node_modules/typescript/lib/tsc.js');
  const result = spawnSync(process.execPath, [typescriptCLI, '--project', tsconfig, '--pretty', 'false'], {
    cwd: options.cwd,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return Object.freeze({ passed: result.status === 0, status: result.status, output });
}

export function assertTypeFixture(result, expectation, label) {
  if (expectation === 'pass' && !result.passed) throw new Error(`${label} must compile.\n${result.output}`);
  if (expectation === 'fail' && result.passed) throw new Error(`${label} must fail to compile.`);
}
