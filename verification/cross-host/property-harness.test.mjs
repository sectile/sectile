import assert from 'node:assert/strict';
import test from 'node:test';
import { checkProperty } from '../support/property.mjs';

test('property harness reports a deterministic minimal failing counterexample', () => {
  assert.throws(
    () => checkProperty({
      name: 'minimum two',
      seed: 17,
      runs: 1,
      generate: () => 64,
      verify: (value) => assert.ok(value < 2),
      shrink: (value) => value <= 0 ? [] : [Math.floor(value / 2), value - 1],
    }),
    (error) => {
      assert.equal(error.seed, 17);
      assert.equal(error.run, 0);
      assert.equal(error.counterexample, 2);
      assert.match(error.message, /seed=17, run=0/);
      assert.match(error.message, /counterexample=2/);
      return true;
    },
  );
});
