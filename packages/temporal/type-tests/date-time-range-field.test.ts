import { createDateValue, createDateFieldFormat } from '@sectile/temporal/date-field';
import { createTimeValue, createTimeFieldFormat } from '@sectile/temporal/time-field';
import { createDateTimeValue, createDateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import {
  createDateTimeRangeFieldState, tryCreateDateTimeRangeFieldState, applyDateTimeRangeFieldEvent,
  reformatDateTimeRangeFieldState, type DateTimeRangeFieldState, type DateTimeRangeFieldEvent,
  type DateTimeRangeFieldPolicies, type DateTimeRangeFieldCommand,
} from '@sectile/temporal/date-time-range-field';
import type { TemporalOwnErrorCode } from '@sectile/temporal';

const date = createDateValue(2026, 10, 14);
const value = createDateTimeValue(date, createTimeValue(9, 30));
const format = createDateTimeFieldFormat({
  date: createDateFieldFormat({ order: ['year', 'month', 'day'] }),
  time: createTimeFieldFormat({ precision: 'minute' }),
});
const state: DateTimeRangeFieldState = createDateTimeRangeFieldState({ startValue: value, startFormat: format, endFormat: format });
const event: DateTimeRangeFieldEvent = { type: 'field', endpoint: 'end', event: { type: 'set-value', value } };
const policies: DateTimeRangeFieldPolicies = { required: true, min: value, unavailable: item => item.time.hour < 9, step: { minute: 15 } };
const result = applyDateTimeRangeFieldEvent(state, event, policies);
if (result.ok) {
  for (const command of result.value.commands) {
    const typed: DateTimeRangeFieldCommand = command;
    if (typed.type === 'range-committed') typed.value?.end.time.minute satisfies number | undefined;
  }
}
tryCreateDateTimeRangeFieldState({ value: { start: value, end: value } });
reformatDateTimeRangeFieldState(state, format);
const newErrors: readonly TemporalOwnErrorCode[] = [
  'date-time-range-field-value-required', 'invalid-date-time-range-field-endpoint', 'inverted-date-time-range-field',
];
void newErrors;
// @ts-expect-error A date-only endpoint cannot represent a date-time range.
createDateTimeRangeFieldState({ startValue: date });
// @ts-expect-error Endpoint vocabulary is closed.
applyDateTimeRangeFieldEvent(state, { type: 'focus', endpoint: 'middle' });
// @ts-expect-error A date format is not an admitted combined date-time layout.
createDateTimeRangeFieldState({ endFormat: createDateFieldFormat({ order: ['year', 'month', 'day'] }) });
// @ts-expect-error Bounds consume combined values, not date-only records.
applyDateTimeRangeFieldEvent(state, event, { min: date });
// @ts-expect-error Segment policy keys are closed.
applyDateTimeRangeFieldEvent(state, event, { step: { week: 1 } });
