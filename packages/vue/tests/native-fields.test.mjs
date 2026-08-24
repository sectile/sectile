import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { DateField } from '../dist/date-field.js';
import { DateTimeField } from '../dist/date-time-field.js';
import { NumberField } from '../dist/number-field.js';
import { TimeField } from '../dist/time-field.js';

async function render(component, props) {
  return renderToString(createSSRApp({ render: () => h(component, props) }));
}

test('Vue native fields preserve native input attributes during SSR', async () => {
  const html = await render(NumberField, {
    defaultValue: '12.50',
    name: 'amount',
    disabled: true,
    required: true,
    label: 'Amount',
  });
  assert.match(html, /^<input/);
  assert.match(html, /value="12.50"/);
  assert.match(html, /name="amount"/);
  assert.match(html, /disabled/);
  assert.match(html, /required/);
  assert.match(html, /aria-label="Amount"/);
  assert.match(html, /data-scope="number-field"/);
});

test('Vue civil fields serialize timezone-free values without Date conversion', async () => {
  const date = await render(DateField, {
    defaultValue: { year: 2026, month: 8, day: 22 },
  });
  const time = await render(TimeField, {
    defaultValue: { hour: 9, minute: 5, second: 0, millisecond: 0 },
  });
  const dateTime = await render(DateTimeField, {
    defaultValue: {
      date: { year: 2026, month: 8, day: 22 },
      time: { hour: 9, minute: 5, second: 0, millisecond: 0 },
    },
  });
  assert.match(date, /value="2026-08-22"/);
  assert.match(time, /value="09:05"/);
  assert.match(dateTime, /value="2026-08-22T09:05"/);
});

test('Vue civil fields can opt into localized native browser controls', async () => {
  const date = await render(DateField, { defaultValue: { year: 2026, month: 8, day: 22 }, native: true });
  const time = await render(TimeField, { defaultValue: { hour: 9, minute: 5 }, native: true });
  const dateTime = await render(DateTimeField, {
    defaultValue: { date: { year: 2026, month: 8, day: 22 }, time: { hour: 9, minute: 5 } },
    native: true,
  });

  assert.match(date, /type="date"/);
  assert.match(time, /type="time"/);
  assert.match(dateTime, /type="datetime-local"/);
});
