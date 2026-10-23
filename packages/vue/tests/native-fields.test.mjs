import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, defineComponent, h } from 'vue';
import { DateField } from '../.verification-dist/temporal/date-field.js';
import { DateTimeField } from '../.verification-dist/temporal/date-time-field.js';
import { NumberField } from '../.verification-dist/number-field.js';
import { TimeField } from '../.verification-dist/temporal/time-field.js';
import { FormRoot, FormField, provideFormControlOwner } from '../.verification-dist/form.js';

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
  const inField = (component, attributes) => renderToString(createSSRApp({
    render: () => h(FormRoot, { id: 'delivery-form' }, { default: () => h(FormField, { name: 'delivery', form: 'delivery-form' }, {
      default: () => h(component, attributes),
    }) }),
  }));
  for (const component of [NumberField, DateField, TimeField, DateTimeField]) {
    const inherited = await inField(component, {});
    assert.match(inherited, /<input\b[^>]*\bname="delivery"/u);
    assert.match(inherited, /<input\b[^>]*\bform="delivery-form"/u);
  }
  const authored = await inField(DateField, { name: 'caller', form: 'caller-form' });
  assert.match(authored, /<input\b[^>]*\bname="caller"/u);
  assert.match(authored, /<input\b[^>]*\bform="caller-form"/u);
  const suppressed = await inField(DateField, { name: undefined, form: undefined });
  const input = suppressed.match(/<input\b[^>]*>/u)[0];
  assert.doesNotMatch(input, /\b(?:name|form)=/u, 'authored undefined suppresses inherited submission metadata');
  const Owned = defineComponent({ setup() { provideFormControlOwner(); return () => h(DateField); } });
  const owned = (await inField(Owned, {})).match(/<input\b[^>]*>/u)[0];
  assert.doesNotMatch(owned, /\b(?:name|form)=/u, 'a composite owner retains submission ownership of its internal field');
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
