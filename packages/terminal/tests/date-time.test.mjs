import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap } from '@sectile/core/result';
import { createTimeValue, formatTimeValue } from '@sectile/core/time-field';
import { createTimeField } from '../dist/time-field.js';

test('terminal time field maps vertical keys to the active segment', () => {
  const field = createTimeField({ defaultValue: unwrap(createTimeValue(10, 30)), policies: { step: { minute: 15 } } });
  field.handleKeyboardInput({ key: 'home' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'up' });
  assert.equal(formatTimeValue(field.getValue()), '10:45');
});
