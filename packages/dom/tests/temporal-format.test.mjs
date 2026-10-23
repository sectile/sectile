import assert from 'node:assert/strict';
import test from 'node:test';
import { createTemporalFormatter, tryCreateTemporalFormatter } from '../.verification-dist/temporal/format.js';
import { formatDateFieldValue, parseDateFieldValue } from '@sectile/temporal/date-field';
import { formatTimeFieldValue, parseTimeFieldValue } from '@sectile/temporal/time-field';
import { formatDateTimeFieldValue, parseDateTimeFieldValue } from '@sectile/temporal/date-time-field';

const date = { year: 2026, month: 10, day: 14 };
const time = { hour: 15, minute: 24, second: 38, millisecond: 125 };
const formatter = (locale = 'en-US', timeZone = 'UTC') => createTemporalFormatter({ locale, timeZone });
const value = result => { assert.equal(result.ok, true); return result.value; };
const code = result => { assert.equal(result.ok, false); return result.error.code; };

test('real locale parts project logical Gregorian date order', () => {
  assert.deepEqual(formatter('en-US').dateOrder, ['month', 'day', 'year']);
  assert.deepEqual(formatter('en-GB').dateOrder, ['day', 'month', 'year']);
  assert.deepEqual(formatter('ko-KR').dateOrder, ['year', 'month', 'day']);
  assert.equal(value(formatter('en-US').date(date)), '10/14/2026');
  assert.equal(value(formatter('en-GB').date(date)), '14/10/2026');
  assert.equal(value(formatter('en-US-u-ca-buddhist').date(date)), '10/14/2026');
});

test('real locale parts and numbering produce one reusable admitted edit format', () => {
  for (const [locale, expected] of [['en-US', '10/14/2026'], ['en-GB', '14/10/2026'], ['ko-KR', '2026. 10. 14.'],
    ['ar-EG', '١٤\u200f/١٠\u200f/٢٠٢٦'], ['en-US-u-nu-mathbold', '𝟏𝟎/𝟏𝟒/𝟐𝟎𝟐𝟔']]) {
    const f = formatter(locale), format = value(f.dateFieldFormat());
    assert.equal(value(f.dateFieldFormat()), format);
    assert.equal(formatDateFieldValue(date, format), expected);
    assert.deepEqual(value(parseDateFieldValue(expected, format)), date);
  }
});

test('civil values remain zone-independent while explicit instants project the configured zone', () => {
  const utc = formatter(), west = formatter('en-US', 'America/Los_Angeles'), east = formatter('en-US', 'Asia/Seoul');
  for (const f of [west, east]) {
    assert.equal(value(f.date(date)), value(utc.date(date)));
    assert.equal(value(f.time(time, 'millisecond')), value(utc.time(time, 'millisecond')));
    assert.equal(value(f.dateTime({ date, time }, 'second')), value(utc.dateTime({ date, time }, 'second')));
  }
  const instant = Date.UTC(2026, 9, 14, 0, 30);
  assert.deepEqual(value(utc.dateAt(instant)), date);
  assert.deepEqual(value(west.dateAt(instant)), { year: 2026, month: 10, day: 13 });
  assert.deepEqual(value(east.dateAt(Date.UTC(2026, 9, 14, 15, 30))), { year: 2026, month: 10, day: 15 });
});

test('real time parts admit reusable edit formats across cycles, precision and numbering', () => {
  for (const locale of ['en-US', 'en-GB', 'ko-KR', 'ar-EG', 'en-US-u-nu-mathbold',
    'en-US-u-hc-h11', 'en-US-u-hc-h12', 'en-US-u-hc-h23', 'en-US-u-hc-h24']) {
    const f = formatter(locale);
    for (const precision of ['minute', 'second', 'millisecond']) {
      const format = value(f.timeFieldFormat(precision));
      assert.equal(value(f.timeFieldFormat(precision)), format);
      assert.equal(format.precision, precision);
      for (const hour of [0, 11, 12, 23]) {
        const expected = { ...time, hour, second: precision === 'minute' ? 0 : time.second,
          millisecond: precision === 'millisecond' ? time.millisecond : 0 };
        assert.deepEqual(value(parseTimeFieldValue(formatTimeFieldValue(expected, format), format)), expected);
      }
    }
  }
  assert.equal(value(formatter('en-US-u-hc-h24').timeFieldFormat()).hourCycle, 'h24');
  assert.equal(formatTimeFieldValue({ hour: 0, minute: 24, second: 0, millisecond: 0 }, value(formatter('en-GB').timeFieldFormat())), '00:24');
});

test('calendar labels, time precision and early Gregorian years retain their values', () => {
  const f = formatter('en-GB');
  assert.equal(value(f.month({ year: 2026, month: 10 })), 'October 2026');
  assert.equal(value(f.month({ year: 2026, month: 10 }, 'long')), 'October 2026');
  assert.equal(value(f.month({ year: 2026, month: 10 }, 'short')), 'Oct 2026');
  assert.equal(value(f.month({ year: 2026, month: 10 }, 'narrow')), 'O 2026');
  assert.equal(code(f.month(date, 'missing')), 'dom.temporal-format-invalid');
  assert.equal(value(f.year({ year: 2026 })), '2026');
  assert.equal(value(f.year({ year: 42 })), '42');
  assert.equal(value(formatter('ar-EG').year({ year: 2026 })), '٢٠٢٦');
  assert.equal(code(f.year({ year: 0 })), 'invalid-date-year');
  assert.equal(value(f.weekday(date)), 'Wednesday');
  assert.equal(value(f.weekday(date, 'short')), 'Wed');
  assert.equal(value(f.weekday(date, 'narrow')), 'W');
  assert.equal(value(formatter('ko-KR').weekday(date, 'short')), '수');
  assert.equal(code(f.weekday(date, 'missing')), 'dom.temporal-format-invalid');
  assert.equal(value(f.time(time)), '15:24');
  assert.equal(value(f.time(time, 'second')), '15:24:38');
  assert.equal(value(f.time(time, 'millisecond')), '15:24:38.125');
  assert.equal(value(f.date({ year: 42, month: 1, day: 2 })), '02/01/42');
  const instant = new Date(0); instant.setUTCFullYear(42, 0, 2);
  assert.deepEqual(value(f.dateAt(instant.getTime())), { year: 42, month: 1, day: 2 });
  instant.setUTCFullYear(0);
  assert.equal(code(f.dateAt(instant.getTime())), 'invalid-date-year');
});

test('real Intl date-time groups produce cached edit formats across cycles and precision', () => {
  for (const locale of ['en-US', 'en-GB', 'ko-KR', 'ar-EG', 'en-US-u-nu-mathbold', 'en-US-u-hc-h11', 'en-US-u-hc-h12', 'en-US-u-hc-h23', 'en-US-u-hc-h24']) {
    const f = formatter(locale);
    for (const precision of ['minute', 'second', 'millisecond']) {
      const format = value(f.dateTimeFieldFormat(precision)); assert.equal(value(f.dateTimeFieldFormat(precision)), format);
      assert.equal(format.time.precision, precision);
      for (const hour of [0, 11, 12, 23]) {
        const expected = { date, time: { ...time, hour, second: precision === 'minute' ? 0 : time.second, millisecond: precision === 'millisecond' ? time.millisecond : 0 } };
        assert.deepEqual(value(parseDateTimeFieldValue(formatDateTimeFieldValue(expected, format), format)), expected);
      }
    }
  }
  const f = formatter('en-GB');
  assert.equal(formatDateTimeFieldValue({ date, time: { hour: 15, minute: 24, second: 0, millisecond: 0 } }, value(f.dateTimeFieldFormat())), '14/10/2026, 15:24');
});

test('date-time admission refuses interleaved host groups without substituting a pattern', () => {
  const native = Intl.DateTimeFormat.prototype.formatToParts;
  Intl.DateTimeFormat.prototype.formatToParts = function (...args) {
    const parts = native.apply(this, args), options = this.resolvedOptions();
    if (options.year === undefined || options.hour === undefined) return parts;
    const index = parts.findIndex(part => part.type === 'year'), [year] = parts.splice(index, 1); parts.push(year);
    return parts;
  };
  try { assert.equal(code(formatter().dateTimeFieldFormat()), 'dom.temporal-format-unavailable'); }
  finally { Intl.DateTimeFormat.prototype.formatToParts = native; }
});

test('platform admission rejects unsupported identifiers and captures no getters', () => {
  assert.equal(code(tryCreateTemporalFormatter({ locale: 'en_US', timeZone: 'UTC' })), 'dom.temporal-format-invalid');
  assert.equal(code(tryCreateTemporalFormatter({ locale: 'zz-ZZ', timeZone: 'UTC' })), 'dom.temporal-locale-unavailable');
  assert.equal(code(tryCreateTemporalFormatter({ locale: 'en-US', timeZone: 'Not/A_Zone' })), 'dom.temporal-zone-invalid');
  assert.equal(code(tryCreateTemporalFormatter({ locale: 'x'.repeat(1025), timeZone: 'UTC' })), 'dom.temporal-format-limit');
  let reads = 0;
  assert.equal(code(tryCreateTemporalFormatter({ get locale() { reads++; return 'en-US'; }, timeZone: 'UTC' })), 'dom.temporal-format-invalid');
  assert.equal(reads, 0);
  const NumberFormat = Intl.NumberFormat;
  Intl.NumberFormat = undefined;
  try {
    const f = formatter();
    assert.equal(code(f.dateFieldFormat()), 'dom.temporal-format-unavailable');
    assert.equal(code(f.timeFieldFormat()), 'dom.temporal-format-unavailable');
    assert.equal(code(f.dateTimeFieldFormat()), 'dom.temporal-format-unavailable');
    assert.equal(value(f.date(date)), '10/14/2026', 'missing digit projection does not disable ordinary date labels');
  } finally { Intl.NumberFormat = NumberFormat; }
});

test('invalid civil values and precision report canonical failures instead of formatting substitutes', () => {
  const f = formatter();
  assert.equal(code(f.date({ year: 2026, month: 2, day: 30 })), 'invalid-date-day');
  assert.equal(code(f.time({ ...time, hour: 25 })), 'invalid-time-hour');
  assert.equal(code(f.time(undefined)), 'invalid-time-hour');
  assert.equal(code(f.dateTime({ date })), 'invalid-time-hour');
  assert.equal(code(f.time(time, 'week')), 'dom.temporal-format-invalid');
  assert.equal(code(f.timeFieldFormat('week')), 'dom.temporal-format-invalid');
  assert.equal(code(f.dateTimeFieldFormat('week')), 'dom.temporal-format-invalid');
  assert.equal(code(f.dateAt(NaN)), 'dom.temporal-format-invalid');
  assert.equal(code(f.dateAt(8.64e15 + 1)), 'dom.temporal-format-invalid');
  assert.equal(code(f.dateAt(Date.UTC(10000, 0, 1))), 'invalid-date-year');
});

test('each owner retains a fixed formatter set and reuses it for repeated projections', () => {
  const Native = Intl.DateTimeFormat;
  const NativeNumbers = Intl.NumberFormat;
  let constructions = 0;
  let numberConstructions = 0;
  let partProjections = 0;
  const nativeParts = Native.prototype.formatToParts;
  function Counted(...args) {
    constructions++; const source = new Native(...args);
    source.formatToParts = (...input) => { partProjections++; return nativeParts.apply(source, input); };
    return source;
  }
  function CountedNumbers(...args) { numberConstructions++; return new NativeNumbers(...args); }
  Object.setPrototypeOf(Counted, Native); Counted.prototype = Native.prototype;
  Object.setPrototypeOf(CountedNumbers, NativeNumbers); CountedNumbers.prototype = NativeNumbers.prototype;
  Intl.DateTimeFormat = Counted;
  Intl.NumberFormat = CountedNumbers;
  try {
    const f = formatter();
    assert.equal(constructions, 2);
    assert.equal(numberConstructions, 0, 'non-editable formatting does not allocate a digit formatter');
    f.dateFieldFormat(); f.dateFieldFormat();
    assert.equal(numberConstructions, 1);
    f.date(date); f.month(date); f.weekday(date);
    for (const precision of ['minute', 'second', 'millisecond']) {
      f.time(time, precision); f.dateTime({ date, time }, precision); f.timeFieldFormat(precision); f.dateTimeFieldFormat(precision);
    }
    assert.equal(constructions, 10);
    f.year({ year: 2026 });
    assert.equal(constructions, 11, 'year display allocates one additional lazy Intl formatter');
    f.weekday(date, 'short'); f.weekday(date, 'narrow');
    assert.equal(constructions, 13, 'weekday widths allocate at most two additional lazy formatters');
    f.month(date, 'long'); assert.equal(constructions, 13, 'explicit long shares the existing default formatter');
    f.month(date, 'short'); f.month(date, 'narrow');
    assert.equal(constructions, 15, 'month widths allocate at most two additional lazy formatters');
    for (let index = 0; index < 100; index++) {
      f.date(date); f.month(date); f.month(date, 'short'); f.month(date, 'narrow'); f.year(date); f.weekday(date); f.weekday(date, 'short'); f.weekday(date, 'narrow'); f.dateAt(index); f.dateFieldFormat();
      for (const precision of ['minute', 'second', 'millisecond']) {
        f.time(time, precision); f.dateTime({ date, time }, precision); f.timeFieldFormat(precision); f.dateTimeFieldFormat(precision);
      }
    }
    assert.equal(constructions, 15, 'real Intl constructors are reused, not replaced by a simulated formatter');
    assert.equal(numberConstructions, 1, 'the digit descriptor is constructed once per owner');
    const settledProjections = partProjections;
    for (let index = 0; index < 100; index++) for (const precision of ['minute', 'second', 'millisecond']) { f.timeFieldFormat(precision); f.dateTimeFieldFormat(precision); }
    assert.equal(partProjections, settledProjections, 'cached edit format reads do not repeat Intl part admission');
  } finally { Intl.DateTimeFormat = Native; Intl.NumberFormat = NativeNumbers; }
});
