import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDecimalInput } from '../.verification-dist/internal/decimal-input.js';

test('Vue decimal normalization preserves strings and expands number exponents', () => {
  assert.equal(normalizeDecimalInput('1e-7'), '1e-7');
  assert.equal(normalizeDecimalInput(1e-7), '0.0000001');
  assert.equal(normalizeDecimalInput(1e21), '1000000000000000000000');
  assert.equal(normalizeDecimalInput(-2.5e-7), '-0.00000025');
});

test('Vue decimal normalization rejects non-finite numbers', () => {
  assert.throws(() => normalizeDecimalInput(Number.NaN), /finite/u);
  assert.throws(() => normalizeDecimalInput(Number.POSITIVE_INFINITY), /finite/u);
});
