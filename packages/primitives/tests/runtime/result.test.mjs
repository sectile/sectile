import assert from 'node:assert/strict';
import test from 'node:test';
import { SectileResultError, unwrap } from '../../.verification-dist/result.js';

test('unwrap returns successful values without changing their identity', () => {
  const value = Object.freeze({ id: 'value' });

  assert.equal(unwrap({ ok: true, value }), value);
});

test('unwrap throws an Error that preserves every Sectile failure field', () => {
  const failure = Object.freeze({
    class: 'construction',
    code: 'invalid-example',
    message: 'Example is invalid.',
    details: Object.freeze({ id: 'example' }),
  });

  assert.throws(
    () => unwrap({ ok: false, error: failure }),
    (error) => {
      assert.equal(error instanceof Error, true);
      assert.equal(error instanceof SectileResultError, true);
      assert.equal(error.name, 'SectileResultError');
      assert.equal(error.message, failure.message);
      assert.equal(error.class, failure.class);
      assert.equal(error.code, failure.code);
      assert.equal(error.details, failure.details);
      assert.equal(error.cause, failure);
      return true;
    },
  );
});
