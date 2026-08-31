import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const normalizeText = (value) => value.toString('utf8').replaceAll('\r\n', '\n');
const hash = (value) => createHash('sha256').update(normalizeText(value)).digest('hex');
const theoryOutput = await readFile('verification/theory-verification.json');
const theoryVerifier = await readFile('verification/theory-verifier.py');
assert.equal(hash(theoryOutput), '774d1f79119a212b0798245d7ce4e59542954a67f37f7bb15f927d240cf0b7ec');
assert.equal(hash(theoryVerifier), 'a1a620fde1c6a0e309deed31231571eb6f8c63a6617f847c3cb7f14562981fbb');
const stored = await readFile('verification/implementation-verification.json');
const run = () => spawnSync(process.execPath, ['verification/implementation-verifier.mjs'], {
  encoding: null,
  maxBuffer: 32 * 1024 * 1024,
});
const first = run();
assert.equal(first.status, 0, first.stderr?.toString() ?? 'implementation verifier failed');
const second = run();
assert.equal(second.status, 0, second.stderr?.toString() ?? 'implementation verifier failed');
assert.equal(normalizeText(second.stdout), normalizeText(first.stdout), 'implementation verification is not deterministic');
assert.equal(normalizeText(first.stdout), normalizeText(stored), 'stored implementation verification is stale');
const parsed = JSON.parse(first.stdout.toString('utf8'));
assert.equal(parsed.status, 'pass');
assert.equal(parsed.seed, 0x5ec71e);
console.log(JSON.stringify({
  status: 'passed',
  theorySHA256: hash(theoryOutput),
  implementationSHA256: hash(first.stdout),
  seed: parsed.seed,
}, null, 2));
