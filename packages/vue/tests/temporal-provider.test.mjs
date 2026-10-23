import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, defineComponent, h } from 'vue';
import { DatePickerRoot } from '../.verification-dist/temporal/date-picker.js';
import {
  TemporalProvider,
  useTemporalReferenceDate,
  useTemporalFormatter,
} from '../.verification-dist/temporal/temporal-provider.js';

const ReferenceDateOutput = defineComponent({
  setup() {
    const referenceDate = useTemporalReferenceDate();
    return () => h(
      'output',
      null,
      `${referenceDate.value.year}-${referenceDate.value.month}-${referenceDate.value.day}`,
    );
  },
});

test('TemporalProvider supplies a deterministic reference date to its subtree', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(TemporalProvider, {
      referenceDate: { year: 2026, month: 8, day: 28 },
    }, {
      default: () => h(ReferenceDateOutput),
    }),
  }));

  assert.match(html, /<output>2026-8-28<\/output>/);
});

const FormattingOutput = defineComponent({
  setup() {
    const date = useTemporalReferenceDate(), formatter = useTemporalFormatter();
    return () => h('output', formatter.value?.date(date.value).value ?? 'unconfigured');
  },
});

test('separate SSR roots project the same explicit instant through request-owned locale and zone', async () => {
  const referenceInstant = Date.UTC(2026, 9, 14, 0, 30);
  const outputs = await Promise.all([
    ['en-US', 'America/Los_Angeles'], ['en-GB', 'Asia/Seoul'],
  ].map(async ([locale, timeZone]) => renderToString(createSSRApp({
    render: () => h(TemporalProvider, { referenceInstant, formatting: { locale, timeZone } }, { default: () => h(FormattingOutput) }),
  }))));
  assert.match(outputs[0], /<output>10\/13\/2026<\/output>/);
  assert.match(outputs[1], /<output>14\/10\/2026<\/output>/);
});

test('nested providers borrow formatters and reproject inherited instants only when overridden', async () => {
  const formatters = [];
  const Capture = defineComponent({ setup() {
    formatters.push(useTemporalFormatter().value);
    return () => h(FormattingOutput);
  } });
  const html = await renderToString(createSSRApp({ render: () => h(TemporalProvider, {
    referenceInstant: Date.UTC(2026, 9, 14, 0, 30), formatting: { locale: 'en-US', timeZone: 'America/Los_Angeles' },
  }, { default: () => [h(Capture), h(TemporalProvider, {}, { default: () => h(Capture) }),
    h(TemporalProvider, { formatting: { locale: 'en-GB', timeZone: 'Asia/Seoul' } }, { default: () => h(Capture) }),
    h(TemporalProvider, { referenceDate: { year: 2000, month: 1, day: 2 } }, { default: () => h(Capture) })] }) }));
  assert.equal(formatters[0], formatters[1]);
  assert.notEqual(formatters[0], formatters[2]);
  assert.match(html, /<output>14\/10\/2026<\/output>/);
  assert.match(html, /<output>01\/02\/2000<\/output>/);
});

test('explicit provider seeds avoid ambient clock reads and an unconfigured formatter stays absent', async () => {
  const now = Date.now; Date.now = () => { throw new Error('ambient clock read'); };
  try {
    const html = await renderToString(createSSRApp({ render: () => h(TemporalProvider, {
      referenceDate: { year: 2026, month: 8, day: 28 },
    }, { default: () => h(TemporalProvider, {}, { default: () => [h(ReferenceDateOutput), h(FormattingOutput)] }) }) }));
    assert.match(html, /<output>2026-8-28<\/output>/);
    assert.match(html, /<output>unconfigured<\/output>/);
  } finally { Date.now = now; }
});

test('provider construction exposes invalid formatting and missing instant projection context', async () => {
  const render = props => renderToString(createSSRApp({ render: () => h(TemporalProvider, props, { default: () => h(FormattingOutput) }) }));
  await assert.rejects(render({ referenceInstant: 0 }), /referenceInstant requires formatting/);
  await assert.rejects(render({ referenceInstant: 0, formatting: { locale: 'en-US', timeZone: 'Not/A_Zone' } }), /Temporal time zone/);
});

test('the existing picker owner consumes the projected provider reference date', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(TemporalProvider, {
    referenceInstant: Date.UTC(2026, 9, 14, 0, 30), formatting: { locale: 'en-US', timeZone: 'America/Los_Angeles' },
  }, { default: () => h(DatePickerRoot, {}, { default: ({ highlightedValue }) =>
    h('output', `${highlightedValue.year}-${highlightedValue.month}-${highlightedValue.day}`) }) }) }));
  assert.match(html, /<output>2026-10-13<\/output>/);
});

test('all calendar families mark request-local current periods independently of selection', async () => {
  for (const [entry, prefix, unit] of [
    ['calendar', 'Calendar', 'day'], ['range-calendar', 'RangeCalendar', 'day'], ['date-picker', 'DatePicker', 'day'], ['date-range-picker', 'DateRangePicker', 'day'],
    ['date-time-picker', 'DateTimePicker', 'day'], ['date-time-range-picker', 'DateTimeRangePicker', 'day'],
    ['month-picker', 'MonthPicker', 'month'], ['month-range-picker', 'MonthRangePicker', 'month'], ['year-picker', 'YearPicker', 'year'], ['year-range-picker', 'YearRangePicker', 'year'],
  ]) {
    const parts = await import(`../.verification-dist/temporal/${entry}.js`);
    const dates = unit === 'year' ? [1999, 2000, 2001].map(year => ({ year, month: 1, day: 1 }))
      : unit === 'month' ? [{ year: 2026, month: 10, day: 14 }, { year: 2026, month: 11, day: 14 }, { year: 2027, month: 10, day: 14 }]
        : [{ year: 2026, month: 10, day: 14 }, { year: 2026, month: 10, day: 15 }, { year: 2026, month: 11, day: 14 }];
    const value = entry.startsWith('date-time') ? { date: dates[0], time: { hour: 9, minute: 30, second: 0, millisecond: 0 } } : dates[0];
    const defaultValue = entry.includes('range') ? { start: value, end: value } : value;
    const render = (providerDate, pickerDate) => renderToString(createSSRApp({
      render: () => h(TemporalProvider, { referenceDate: providerDate }, {
        default: () => h(parts[prefix + 'Root'], { defaultValue, ...(pickerDate === undefined ? {} : { referenceDate: pickerDate }) }, {
          default: () => dates.map((date, index) => h(parts[prefix + 'Cell'], { value: unit === 'year' ? { year: date.year } : unit === 'month' ? { year: date.year, month: date.month } : date }, {
            default: ({ current }) => `${index}:${current}`,
          })),
        }),
      }),
    }));
    const outputs = await Promise.all([render(dates[0]), render(dates[1]), render(dates[0], dates[2])]);
    for (const [index, output] of outputs.entries()) {
      assert.match(output, new RegExp(`aria-current="date"[^>]*>.*?${index}:true`), entry);
      assert.equal((output.match(/aria-current="date"/g) ?? []).length, 1, entry);
      assert.match(output, /aria-selected="true"[^>]*>.*?0:/u, entry);
      for (const other of [0, 1, 2].filter(value => value !== index)) assert.ok(output.includes(`${other}:false`), entry);
    }
  }
});
