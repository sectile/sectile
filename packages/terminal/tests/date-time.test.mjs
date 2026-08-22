import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap } from '@sectile/core/result';
import { createTimeValue, formatTimeValue } from '@sectile/core/time-field';
import { createDateValue } from '@sectile/core/date-field';
import { createDateTimeValue, formatDateTimeValue } from '@sectile/core/date-time-field';
import { createTimeField } from '../dist/time-field.js';
import { createDateTimeField } from '../dist/date-time-field.js';

test('terminal time field maps vertical keys to the active segment', () => {
  const field = createTimeField({ defaultValue: unwrap(createTimeValue(10, 30)), policies: { step: { minute: 15 } } });
  field.handleKeyboardInput({ key: 'home' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'up' });
  assert.equal(formatTimeValue(field.getValue()), '10:45');
});

test('terminal date-time field carries time segments across civil day boundaries', () => {
  const field = createDateTimeField({
    defaultValue: unwrap(createDateTimeValue(
      unwrap(createDateValue(2024, 1, 31)),
      unwrap(createTimeValue(23, 45)),
    )),
    policies: { step: { minute: 30 } },
  });
  field.handleKeyboardInput({ key: 'home' });
  for (let index = 0; index < 14; index += 1) field.handleKeyboardInput({ key: 'right' });
  field.handleKeyboardInput({ key: 'up' });
  assert.equal(formatDateTimeValue(field.getValue()), '2024-02-01T00:15');
});
