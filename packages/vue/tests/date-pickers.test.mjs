import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { CalendarCell, CalendarRoot } from '../dist/calendar.js';
import { DatePickerCell, DatePickerContent, DatePickerGrid, DatePickerInput, DatePickerRoot, DatePickerTrigger } from '../dist/date-picker.js';
import { DateRangePickerEndInput, DateRangePickerRoot, DateRangePickerStartInput } from '../dist/date-range-picker.js';
import { DateTimePickerCell, DateTimePickerContent, DateTimePickerGrid, DateTimePickerInput, DateTimePickerRoot, DateTimePickerTimeInput, DateTimePickerTrigger } from '../dist/date-time-picker.js';
import { DateTimeRangePickerCell, DateTimeRangePickerContent, DateTimeRangePickerEndTimeInput, DateTimeRangePickerGrid, DateTimeRangePickerRoot, DateTimeRangePickerStartTimeInput, DateTimeRangePickerTrigger } from '../dist/date-time-range-picker.js';

async function render(component) { return renderToString(createSSRApp({ render: component })); }
const date = Object.freeze({ year: 2026, month: 8, day: 22 });

test('Vue calendar exposes a persistent native grid', async () => {
  const rows = [['2026-08-21', '2026-08-22'], ['2026-08-28', '2026-08-29']];
  const html = await render(() => h(CalendarRoot, { rows, defaultValue: '2026-08-22' }, {
    default: () => h('div', rows.flat().map((value) => h(CalendarCell, { value }, { default: () => value }))),
  }));
  assert.match(html, /role="grid"/);
  assert.match(html, /data-part="cell"/);
});

test('Vue date picker keeps trigger, text input, content, grid, and cells composable', async () => {
  const html = await render(() => h(DatePickerRoot, { defaultValue: date, defaultOpen: true }, {
    default: ({ month }) => [h(DatePickerTrigger), h(DatePickerInput), h(DatePickerContent, null, {
      default: () => h(DatePickerGrid, null, { default: () => month.flat().map((value) => h(DatePickerCell, { value })) }),
    })],
  }));
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /data-part="input"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /role="grid"/);
});

test('Vue range and date-time pickers expose native endpoint inputs', async () => {
  const range = { start: date, end: { year: 2026, month: 8, day: 24 } };
  const dateRange = await render(() => h(DateRangePickerRoot, { defaultValue: range }, { default: () => [h(DateRangePickerStartInput), h(DateRangePickerEndInput)] }));
  const dateTime = await render(() => h(DateTimePickerRoot, { defaultValue: { date, time: { hour: 10, minute: 30 } } }, { default: () => [h(DateTimePickerInput), h(DateTimePickerTimeInput)] }));
  const dateTimeRange = await render(() => h(DateTimeRangePickerRoot, { defaultValue: { start: { date, time: { hour: 10, minute: 30 } }, end: { date, time: { hour: 11, minute: 30 } } } }, { default: () => [h(DateTimeRangePickerStartTimeInput), h(DateTimeRangePickerEndTimeInput)] }));
  assert.match(dateRange, /data-part="start-input"/);
  assert.match(dateRange, /data-part="end-input"/);
  assert.match(dateTime, /data-part="time-input"/);
  assert.match(dateTimeRange, /data-part="start-time-input"/);
  assert.match(dateTimeRange, /data-part="end-time-input"/);
});

test('Vue date-time pickers keep their calendar composition available', async () => {
  const time = { hour: 10, minute: 30 };
  const end = { year: 2026, month: 8, day: 24 };
  const dateTime = await render(() => h(DateTimePickerRoot, { defaultValue: { date, time }, defaultOpen: true }, {
    default: ({ month }) => [h(DateTimePickerTrigger), h(DateTimePickerContent, null, {
      default: () => h(DateTimePickerGrid, null, { default: () => month.flat().map((value) => h(DateTimePickerCell, { value })) }),
    })],
  }));
  const dateTimeRange = await render(() => h(DateTimeRangePickerRoot, { defaultValue: { start: { date, time }, end: { date: end, time } }, defaultOpen: true }, {
    default: ({ month }) => [h(DateTimeRangePickerTrigger), h(DateTimeRangePickerContent, null, {
      default: () => h(DateTimeRangePickerGrid, null, { default: () => month.flat().map((value) => h(DateTimeRangePickerCell, { value })) }),
    })],
  }));
  assert.match(dateTime, /aria-haspopup="dialog"/);
  assert.match(dateTime, /role="grid"/);
  assert.match(dateTimeRange, /aria-haspopup="dialog"/);
  assert.match(dateTimeRange, /role="grid"/);
});
