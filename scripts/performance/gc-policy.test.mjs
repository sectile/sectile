import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectRetainedGarbage,
  collectTransientGarbage,
  RETAINED_GC_PASSES,
  TRANSIENT_GC_PASSES,
} from './gc-policy.mjs';

test('transient collections use one pass outside retained-heap measurement', () => {
  let calls = 0;
  collectTransientGarbage(() => { calls += 1; });
  assert.equal(TRANSIENT_GC_PASSES, 1);
  assert.equal(calls, TRANSIENT_GC_PASSES);
});

test('retained-heap collections complete weak-reference cleanup passes', () => {
  let calls = 0;
  collectRetainedGarbage(() => { calls += 1; });
  assert.equal(RETAINED_GC_PASSES, 4);
  assert.equal(calls, RETAINED_GC_PASSES);
});

test('collection policy tolerates runtimes without exposed GC', () => {
  assert.doesNotThrow(() => collectTransientGarbage(undefined));
  assert.doesNotThrow(() => collectRetainedGarbage(undefined));
});
