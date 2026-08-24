import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { CalendarCell, CalendarRoot } from '../dist/calendar.js';
import { DatePickerCell, DatePickerContent, DatePickerGrid, DatePickerInput, DatePickerMonthCell, DatePickerRoot, DatePickerTrigger, DatePickerYearViewTrigger } from '../dist/date-picker.js';
import { DateRangePickerEndInput, DateRangePickerRoot, DateRangePickerStartInput } from '../dist/date-range-picker.js';
import { DateTimePickerCell, DateTimePickerContent, DateTimePickerDateInput, DateTimePickerDateTimeInput, DateTimePickerGrid, DateTimePickerRoot, DateTimePickerTimeInput, DateTimePickerTrigger } from '../dist/date-time-picker.js';
import { DateTimeRangePickerCell, DateTimeRangePickerContent, DateTimeRangePickerEndDateInput, DateTimeRangePickerEndDateTimeInput, DateTimeRangePickerEndTimeInput, DateTimeRangePickerGrid, DateTimeRangePickerRoot, DateTimeRangePickerStartDateInput, DateTimeRangePickerStartDateTimeInput, DateTimeRangePickerStartTimeInput, DateTimeRangePickerTrigger } from '../dist/date-time-range-picker.js';
import { RangeCalendarCell, RangeCalendarContent, RangeCalendarGrid, RangeCalendarRoot } from '../dist/range-calendar.js';
import { MonthPickerCell, MonthPickerContent, MonthPickerGrid, MonthPickerInput, MonthPickerRoot, MonthPickerTrigger } from '../dist/month-picker.js';
import { MonthRangePickerCell, MonthRangePickerContent, MonthRangePickerEndInput, MonthRangePickerGrid, MonthRangePickerRoot, MonthRangePickerStartInput, MonthRangePickerTrigger } from '../dist/month-range-picker.js';
import { YearPickerCell, YearPickerContent, YearPickerGrid, YearPickerInput, YearPickerNextPage, YearPickerPreviousPage, YearPickerRoot, YearPickerTrigger } from '../dist/year-picker.js';
import { YearRangePickerCell, YearRangePickerContent, YearRangePickerEndInput, YearRangePickerGrid, YearRangePickerRoot, YearRangePickerStartInput, YearRangePickerTrigger } from '../dist/year-range-picker.js';

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
    default: ({ dates }) => [h(DatePickerTrigger), h(DatePickerInput), h(DatePickerContent, null, {
      default: () => h(DatePickerGrid, null, { default: () => dates.flat().map((value) => h(DatePickerCell, { value })) }),
    })],
  }));
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /data-part="input"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /role="grid"/);
});

test('Vue range and date-time pickers expose canonical text endpoint inputs', async () => {
  const range = { start: date, end: { year: 2026, month: 8, day: 24 } };
  const time = { hour: 10, minute: 30, second: 0, millisecond: 0 };
  const dateRange = await render(() => h(DateRangePickerRoot, { defaultValue: range }, { default: () => [h(DateRangePickerStartInput), h(DateRangePickerEndInput)] }));
  const dateTime = await render(() => h(DateTimePickerRoot, { defaultValue: { date, time } }, { default: () => [h(DateTimePickerDateTimeInput), h(DateTimePickerDateInput), h(DateTimePickerTimeInput)] }));
  const dateTimeRange = await render(() => h(DateTimeRangePickerRoot, { defaultValue: { start: { date, time }, end: { date, time: { ...time, hour: 11 } } } }, { default: () => [h(DateTimeRangePickerStartDateTimeInput), h(DateTimeRangePickerStartDateInput), h(DateTimeRangePickerStartTimeInput), h(DateTimeRangePickerEndDateTimeInput), h(DateTimeRangePickerEndDateInput), h(DateTimeRangePickerEndTimeInput)] }));
  assert.match(dateRange, /data-part="start-input"/);
  assert.match(dateRange, /data-part="end-input"/);
  assert.match(dateTime, /data-part="date-time-input"/);
  assert.match(dateTime, /type="text" value="2026-08-22T10:30"/);
  assert.match(dateTime, /data-part="date-input"/);
  assert.match(dateTime, /data-part="time-input"/);
  assert.match(dateTimeRange, /data-part="start-date-time-input"/);
  assert.equal((dateTimeRange.match(/type="text"/g) ?? []).length, 6);
  assert.match(dateTimeRange, /data-part="start-date-input"/);
  assert.match(dateTimeRange, /data-part="start-time-input"/);
  assert.match(dateTimeRange, /data-part="end-date-time-input"/);
  assert.match(dateTimeRange, /data-part="end-date-input"/);
  assert.match(dateTimeRange, /data-part="end-time-input"/);
});

test('Vue date picker exposes explicit view controls and a year projection', async () => {
  const html = await render(() => h(DatePickerRoot, { defaultValue: date, defaultOpen: true, defaultView: 'year' }, {
    default: ({ months }) => [h(DatePickerYearViewTrigger, null, { default: () => 'Year' }), h(DatePickerContent, null, {
      default: () => h(DatePickerGrid, null, { default: () => months.flat().map((value) => h(DatePickerMonthCell, { value }, { default: () => String(value.month) })) }),
    })],
  }));
  assert.match(html, /data-part="year-view-trigger"/);
  assert.match(html, /aria-pressed="true"/);
  assert.equal((html.match(/data-part="month-cell"/g) ?? []).length, 12);
});

test('Vue date-time pickers keep their calendar composition available', async () => {
  const time = { hour: 10, minute: 30 };
  const end = { year: 2026, month: 8, day: 24 };
  const dateTime = await render(() => h(DateTimePickerRoot, { defaultValue: { date, time }, defaultOpen: true }, {
    default: ({ dates }) => [h(DateTimePickerTrigger), h(DateTimePickerContent, null, {
      default: () => h(DateTimePickerGrid, null, { default: () => dates.flat().map((value) => h(DateTimePickerCell, { value })) }),
    })],
  }));
  const dateTimeRange = await render(() => h(DateTimeRangePickerRoot, { defaultValue: { start: { date, time }, end: { date: end, time } }, defaultOpen: true }, {
    default: ({ dates }) => [h(DateTimeRangePickerTrigger), h(DateTimeRangePickerContent, null, {
      default: () => h(DateTimeRangePickerGrid, null, { default: () => dates.flat().map((value) => h(DateTimeRangePickerCell, { value })) }),
    })],
  }));
  assert.match(dateTime, /aria-haspopup="dialog"/);
  assert.match(dateTime, /role="grid"/);
  assert.match(dateTimeRange, /aria-haspopup="dialog"/);
  assert.match(dateTimeRange, /role="grid"/);
});

test('Vue period pickers expose distinct scopes and projections', async () => {
  const range = { start: { year: 2026, month: 8, day: 20 }, end: { year: 2026, month: 8, day: 24 } };
  const rangeCalendar = await render(() => h(RangeCalendarRoot, { defaultValue: range }, {
    default: ({ dates }) => h(RangeCalendarContent, null, {
      default: () => h(RangeCalendarGrid, null, {
        default: () => dates.flat().map((value) => h(RangeCalendarCell, { value }, { default: () => String(value.day) })),
      }),
    }),
  }));
  const monthPicker = await render(() => h(MonthPickerRoot, { defaultValue: date, defaultOpen: true }, {
    default: ({ months }) => [h(MonthPickerInput), h(MonthPickerTrigger), h(MonthPickerContent, null, {
      default: () => h(MonthPickerGrid, null, {
        default: () => months.flat().map((value) => h(MonthPickerCell, { value }, { default: () => String(value.month) })),
      }),
    })],
  }));
  const monthRange = await render(() => h(MonthRangePickerRoot, { defaultValue: range, defaultOpen: true }, {
    default: ({ months }) => [h(MonthRangePickerStartInput), h(MonthRangePickerEndInput), h(MonthRangePickerTrigger), h(MonthRangePickerContent, null, {
      default: () => h(MonthRangePickerGrid, null, {
        default: () => months.flat().map((value) => h(MonthRangePickerCell, { value }, { default: () => String(value.month) })),
      }),
    })],
  }));
  const yearPicker = await render(() => h(YearPickerRoot, { defaultValue: date, defaultOpen: true }, {
    default: ({ years }) => [h(YearPickerInput), h(YearPickerTrigger), h(YearPickerPreviousPage), h(YearPickerNextPage), h(YearPickerContent, null, {
      default: () => h(YearPickerGrid, null, {
        default: () => years.flat().map((value) => h(YearPickerCell, { value }, { default: () => String(value.year) })),
      }),
    })],
  }));
  const yearRange = await render(() => h(YearRangePickerRoot, { defaultValue: range, defaultOpen: true }, {
    default: ({ years }) => [h(YearRangePickerStartInput), h(YearRangePickerEndInput), h(YearRangePickerTrigger), h(YearRangePickerContent, null, {
      default: () => h(YearRangePickerGrid, null, {
        default: () => years.flat().map((value) => h(YearRangePickerCell, { value }, { default: () => String(value.year) })),
      }),
    })],
  }));
  const boundedMonthPicker = await render(() => h(MonthPickerRoot, {
    defaultValue: { year: 2026, month: 9, day: 1 },
    defaultOpen: true,
    policies: { min: { year: 2026, month: 9, day: 1 } },
  }, {
    default: ({ months }) => [h(MonthPickerTrigger), h(MonthPickerContent, null, {
      default: () => h(MonthPickerGrid, null, {
        default: () => months.flat().map((value) => h(MonthPickerCell, { value }, { default: () => String(value.month) })),
      }),
    })],
  }));

  assert.match(rangeCalendar, /data-scope="range-calendar"/);
  assert.match(rangeCalendar, /data-in-range(?:[ >])/);
  assert.equal((monthPicker.match(/data-part="cell"/g) ?? []).length, 12);
  assert.match(monthPicker, /data-scope="month-picker"/);
  assert.match(monthPicker, /value="2026-08"/);
  assert.match(monthPicker, /data-sectile-picker-month="2026-08"[^>]*data-selected/u);
  assert.match(monthRange, /data-scope="month-range-picker"/);
  assert.match(monthRange, /data-part="start-input"/);
  assert.match(monthRange, /value="2026-08"/);
  assert.match(yearPicker, /data-part="previous-page"/);
  assert.match(yearPicker, /value="2026"/);
  assert.match(yearPicker, /data-sectile-picker-year="2026"[^>]*data-selected/u);
  assert.match(yearPicker, /data-part="next-page"/);
  assert.equal((yearPicker.match(/data-part="cell"/g) ?? []).length, 12);
  assert.match(yearRange, /data-scope="year-range-picker"/);
  assert.match(yearRange, /data-part="end-input"/);
  assert.match(boundedMonthPicker, /<button(?=[^>]*data-sectile-picker-month="2026-08")(?=[^>]*disabled)[^>]*>/u);
  assert.match(boundedMonthPicker, /<button(?=[^>]*data-sectile-picker-month="2026-09")(?=[^>]*aria-disabled="false")[^>]*>/u);
});
