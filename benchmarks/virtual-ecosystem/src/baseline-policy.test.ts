import assert from 'node:assert/strict';
import test from 'node:test';
import { requiresExactTotalHeight } from './baseline-policy.ts';

test('uniform baselines require exact total height in every size mode', () => {
  assert.equal(requiresExactTotalHeight('uniform'), true);
});

test('heterogeneous baselines report unseen-height error separately', () => {
  assert.equal(requiresExactTotalHeight('heterogeneous'), false);
});
