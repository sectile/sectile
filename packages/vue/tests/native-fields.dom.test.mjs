import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const { DateTimeField } = await import('../.verification-dist/date-time-field.js');
const { NumberField } = await import('../.verification-dist/number-field.js');
const { DateRangeFieldRoot, DateRangeFieldStartInput, DateRangeFieldEndInput } = await import('../.verification-dist/date-range-field.js');
const { TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput } = await import('../.verification-dist/time-range-field.js');

test('native date-time field mounts and commits without text selection APIs', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DateTimeField, {
      native: true,
      defaultValue: {
        date: { year: 2026, month: 8, day: 22 },
        time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
      },
      'onUpdate:modelValue': (value) => updates.push(value),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.equal(input?.type, 'datetime-local');
  assert.equal(input?.value, '2026-08-22T09:30');

  input.value = '2026-08-23T10:45';
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  input.dispatchEvent(new Event('blur'));
  await nextTick();

  assert.deepEqual(updates.at(-1), {
    date: { year: 2026, month: 8, day: 23 },
    time: { hour: 10, minute: 45, second: 0, millisecond: 0 },
  });

  app.unmount();
  host.remove();
});

test('controlled native fields retain pending proposals until delayed owner sync', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dateTime = ref({
    date: { year: 2026, month: 8, day: 22 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  });
  const number = ref('12');
  let dateTimeProposal;
  let numberProposal;
  const app = createApp({
    render: () => h('div', null, [
      h(DateTimeField, {
        modelValue: dateTime.value,
        'onUpdate:modelValue': (value) => { dateTimeProposal = value; },
      }),
      h(NumberField, {
        modelValue: number.value,
        'onUpdate:modelValue': (value) => { numberProposal = value; },
      }),
    ]),
  });

  app.mount(host);
  await nextTick();
  const [dateTimeInput, numberInput] = host.querySelectorAll('input');
  dateTimeInput.setSelectionRange(5, 7);
  dateTimeInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
  numberInput.setSelectionRange(0, 2);
  numberInput.value = '34';
  numberInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  numberInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  await nextTick();

  assert.equal(dateTime.value.date.month, 8);
  assert.equal(dateTimeInput.value, '2026-09-22T09:30');
  assert.deepEqual([dateTimeInput.selectionStart, dateTimeInput.selectionEnd], [5, 7]);
  assert.equal(number.value, '12');
  assert.equal(numberInput.value, '34');

  dateTime.value = dateTimeProposal;
  number.value = numberProposal;
  await nextTick();
  assert.equal(dateTimeInput.value, '2026-09-22T09:30');
  assert.deepEqual([dateTimeInput.selectionStart, dateTimeInput.selectionEnd], [5, 7]);
  assert.equal(numberInput.value, '34');

  app.unmount();
  host.remove();
});

test('controlled Vue range fields update both endpoints without losing either selection', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dateRange = ref({
    start: { year: 2026, month: 8, day: 18 },
    end: { year: 2026, month: 8, day: 21 },
  });
  const timeRange = ref({
    start: { hour: 9, minute: 30, second: 0, millisecond: 0 },
    end: { hour: 17, minute: 45, second: 0, millisecond: 0 },
  });
  const app = createApp({
    render: () => h('div', null, [
      h(DateRangeFieldRoot, { modelValue: dateRange.value }, {
        default: () => [h(DateRangeFieldStartInput), h(DateRangeFieldEndInput)],
      }),
      h(TimeRangeFieldRoot, { modelValue: timeRange.value }, {
        default: () => [h(TimeRangeFieldStartInput), h(TimeRangeFieldEndInput)],
      }),
    ]),
  });

  app.mount(host);
  await nextTick();
  const [startDate, endDate, startTime, endTime] = host.querySelectorAll('input');
  startDate.setSelectionRange(5, 7);
  endDate.setSelectionRange(8, 10);
  startTime.setSelectionRange(0, 2);
  endTime.setSelectionRange(3, 5);
  dateRange.value = {
    start: { year: 2026, month: 9, day: 18 },
    end: { year: 2026, month: 9, day: 22 },
  };
  timeRange.value = {
    start: { hour: 10, minute: 30, second: 0, millisecond: 0 },
    end: { hour: 17, minute: 50, second: 0, millisecond: 0 },
  };
  await nextTick();

  assert.deepEqual(
    [...host.querySelectorAll('input')].map((input) => input.value),
    ['2026-09-18', '2026-09-22', '10:30', '17:50'],
  );
  assert.deepEqual([startDate.selectionStart, startDate.selectionEnd], [5, 7]);
  assert.deepEqual([endDate.selectionStart, endDate.selectionEnd], [8, 10]);
  assert.deepEqual([startTime.selectionStart, startTime.selectionEnd], [0, 2]);
  assert.deepEqual([endTime.selectionStart, endTime.selectionEnd], [3, 5]);

  app.unmount();
  host.remove();
});
