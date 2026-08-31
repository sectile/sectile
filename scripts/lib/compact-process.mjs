import { spawnSyncPortable } from './portable-process.mjs';

const failureOutputLimit = 24 * 1_024;

export function runCompact({ args = [], command, cwd, env = process.env, label, verbose = false }) {
  const startedAt = performance.now();
  console.log(`→ ${label}`);
  const result = spawnSyncPortable(command, args, {
    cwd,
    encoding: 'utf8',
    env,
    maxBuffer: 32 * 1_024 * 1_024,
    stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  const seconds = ((performance.now() - startedAt) / 1_000).toFixed(1);

  if (result.error === undefined && result.status === 0) {
    console.log(`✓ ${label} (${seconds}s)`);
    return 0;
  }

  console.error(`✗ ${label} (${seconds}s)`);
  if (!verbose) {
    writeFailureChannel('stdout', result.stdout);
    writeFailureChannel('stderr', result.stderr);
  }
  if (result.error !== undefined) console.error(result.error.stack ?? result.error.message);
  return result.status ?? 1;
}

export function boundedFailureOutput(value, limit = failureOutputLimit) {
  if (!value) return '';
  if (value.length <= limit) return value;
  return `… ${value.length - limit} characters omitted …\n${value.slice(-limit)}`;
}

function writeFailureChannel(name, value) {
  const output = boundedFailureOutput(value);
  if (output === '') return;
  process.stderr.write(`\n${name}:\n${output}`);
  if (!output.endsWith('\n')) process.stderr.write('\n');
}
