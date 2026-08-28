import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceFailureReproduction,
  reproducibleFailureSignature,
} from './failure-reproduction.ts';

const failed = (...codes: string[]) => ({
  elapsedMs: null,
  failures: codes.map((code) => ({ code })),
});

test('accepts ten identical hard failures regardless of code order', () => {
  const outcomes = Array.from({ length: 10 }, (_, index) => (
    index % 2 === 0 ? failed('row-overlap', 'scroll-height') : failed('scroll-height', 'row-overlap')
  ));
  assert.equal(reproducibleFailureSignature(outcomes, 10), 'row-overlap\u0000scroll-height');
});

test('rejects short, mixed, recovered, and differently failing rounds', () => {
  assert.equal(reproducibleFailureSignature(Array.from({ length: 9 }, () => failed('timeout')), 10), null);
  assert.equal(reproducibleFailureSignature([
    ...Array.from({ length: 9 }, () => failed('timeout')),
    { elapsedMs: 120, failures: [{ code: 'row-overlap' }] },
  ], 10), null);
  assert.equal(reproducibleFailureSignature([
    ...Array.from({ length: 9 }, () => failed('timeout')),
    failed('row-overlap'),
  ], 10), null);
});

test('requires the same signature in two consecutive rounds', () => {
  const first = advanceFailureReproduction(undefined, 'timeout');
  assert.deepEqual(first, { signature: 'timeout', rounds: 1 });
  const second = advanceFailureReproduction(first, 'timeout');
  assert.deepEqual(second, { signature: 'timeout', rounds: 2 });
  assert.deepEqual(advanceFailureReproduction(second, 'row-overlap'), { signature: 'row-overlap', rounds: 1 });
  assert.equal(advanceFailureReproduction(second, null), undefined);
});
