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
  const ids = ['a', 1, '1', -1];
  const normalized = unwrap(tryNormalizeStableIDs(ids));

  assert.deepEqual(normalized, ids);
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(sameStableIDOrder(normalized, ['a', 1, '1', -1]), true);
  assert.equal(sameStableIDOrder(normalized, ['a', '1', 1, -1]), false);
  assert.equal(tryNormalizeStableIDs(['a', 'a']).error.code, 'duplicate-id');
  assert.equal(validateStableID('', 16)?.code, 'empty-id');
});

test('stable identity validation accepts canonical integers and rejects non-canonical numeric values', () => {
  for (const id of [0, -1, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]) {
    assert.equal(validateStableID(id), null);
  }
  for (const id of [-0, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validateStableID(id)?.code, 'invalid-id-type');
  }
  for (const id of [1n, Symbol('id'), true, null, undefined, {}]) {
    assert.equal(validateStableID(id)?.code, 'invalid-id-type');
  }
  const mixed = [1, '1', -1, '-1'];
  assert.deepEqual(JSON.parse(JSON.stringify(mixed)), mixed);
  assert.deepEqual(structuredClone(mixed), mixed);
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
