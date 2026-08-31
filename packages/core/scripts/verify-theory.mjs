import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const expected = await readFile('verification/theory-verification.json');
const run = runVerifier();
assert.equal(run.status, 0, run.stderr?.toString() ?? 'theory verifier failed');
assert.equal(normalizeText(run.stdout), normalizeText(expected));
console.log(JSON.stringify({ status: 'passed', bytes: Buffer.byteLength(normalizeText(expected)) }, null, 2));

function normalizeText(value) {
  return value.toString('utf8').replaceAll('\r\n', '\n');
}

function runVerifier() {
  const configured = process.env.SECTILE_PYTHON;
  const candidates = configured !== undefined
    ? [[configured, []]]
    : process.platform === 'win32'
      ? [['py', ['-3']], ['python3', []], ['python', []]]
      : [['python3', []], ['python', []]];
  for (const [command, prefix] of candidates) {
    const probe = spawnSync(command, [...prefix, '--version'], { encoding: 'utf8' });
    if (probe.error?.code === 'ENOENT') continue;
    if (probe.error !== undefined) throw probe.error;
    if (probe.status !== 0 || !/^Python 3(?:\.|$)/u.test(`${probe.stdout}${probe.stderr}`.trim())) continue;
    return spawnSync(command, [...prefix, 'verification/theory-verifier.py'], {
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
    });
  }
  throw new Error('Python 3 is required for theory verification. Install it or set SECTILE_PYTHON to its executable path.');
}
