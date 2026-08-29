import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sameStableIDOrder,
  tryNormalizeStableIDs,
  validateStableID,
} from '../../.verification-dist/identity.js';
import {
  failResult,
  okResult,
  SectileResultError,
  unwrap,
} from '../../.verification-dist/result.js';

test('focused identity helpers normalize once and preserve explicit equality semantics', () => {
  const ids = ['a', 'b', 'c'];
  const normalized = unwrap(tryNormalizeStableIDs(ids));

  assert.deepEqual(normalized, ids);
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(sameStableIDOrder(normalized, ['a', 'b', 'c']), true);
  assert.equal(sameStableIDOrder(normalized, ['a', 'c', 'b']), false);
  assert.equal(tryNormalizeStableIDs(['a', 'a']).error.code, 'duplicate-id');
  assert.equal(validateStableID('', 16)?.code, 'empty-id');
});

test('Result construction has one foundation implementation and unwrap preserves failures', () => {
  const value = Object.freeze({ id: 'result-value' });
  assert.equal(unwrap(okResult(value)), value);

  const failed = failResult('transition-rejection', 'test-rejection', 'Rejected.', { id: 1 });
  assert.deepEqual(failed, {
    ok: false,
    error: {
      class: 'transition-rejection',
      code: 'test-rejection',
      message: 'Rejected.',
      details: { id: 1 },
    },
  });
  assert.throws(() => unwrap(failed), (error) => (
    error instanceof SectileResultError
    && error.code === 'test-rejection'
    && error.cause === failed.error
  ));
});
