import { createTimeFieldFormat, formatTimeFieldValue, parseTimeFieldValue, type TimeFieldFormat } from '@sectile/temporal/time-field';
import { createTimeFieldState, reformatTimeFieldState, applyTimeFieldEvent } from '@sectile/temporal/time-field';
import { createTimeRangeFieldState, reformatTimeRangeFieldState } from '@sectile/temporal/time-range-field';
const format: TimeFieldFormat = createTimeFieldFormat({ precision: 'second', hourCycle: 'h12', dayPeriods: ['AM', 'PM'] });
formatTimeFieldValue({ hour: 12, minute: 30, second: 0, millisecond: 0 }, format);
parseTimeFieldValue('12:30:00 PM', format);
const state = createTimeFieldState({ hour: 12, minute: 30, second: 0, millisecond: 0 }, undefined, format);
reformatTimeFieldState(state, format); applyTimeFieldEvent(state, 'increment-segment');
reformatTimeRangeFieldState(createTimeRangeFieldState({ startFormat: format, endFormat: format }), format);
// @ts-expect-error Range endpoints require issued time formats, not locale strings.
createTimeRangeFieldState({ startFormat: 'en-US' });
// @ts-expect-error Precision is a closed typed choice.
createTimeFieldFormat({ precision: 'hour' });
// @ts-expect-error Date segments do not belong to time formats.
createTimeFieldFormat({ precision: 'minute', order: ['year', 'minute'] });
// @ts-expect-error A raw options record is not an admitted format.
const forged: TimeFieldFormat = { precision: 'minute', hourCycle: 'h23', order: ['hour', 'minute'], literals: ['', ':', ''], digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] };
void forged;
