import type { MonthPickerStateInput, MonthPickerValue } from '@sectile/temporal/month-picker';
import type { YearPickerStateInput, YearPickerValue } from '@sectile/temporal/year-picker';
import type { MonthPickerOptions } from '@sectile/dom/temporal/month-picker';
import type { YearPickerOptions } from '@sectile/dom/temporal/year-picker';

const month: MonthPickerValue = { year: 2026, month: 9, day: 1 };
const monthState: MonthPickerStateInput = { value: month };
const monthHost: Pick<MonthPickerOptions, 'value'> = { value: month };

const year: YearPickerValue = { year: 2026, month: 1, day: 1 };
const yearState: YearPickerStateInput = { value: year };
const yearHost: Pick<YearPickerOptions, 'value'> = { value: year };

void monthState;
void monthHost;
void yearState;
void yearHost;

const calendarSeed: Pick<import('@sectile/dom/temporal/calendar').CalendarOptions, 'defaultState'> = { defaultState: calendarLifetime.getSnapshot().state };
void calendarSeed;

// Every period subpath accepts its own public cell value through its factory result.
import { createMonthPicker, type MonthPickerCellValue } from '@sectile/dom/temporal/month-picker';
import { createYearPicker, type YearPickerCellValue } from '@sectile/dom/temporal/year-picker';
import { createMonthRangePicker, type MonthRangePickerOptions } from '@sectile/dom/temporal/month-range-picker';
import { createYearRangePicker, type YearRangePickerOptions } from '@sectile/dom/temporal/year-range-picker';

declare const element: HTMLElement;
declare const monthOptions: MonthPickerOptions;
declare const yearOptions: YearPickerOptions;
declare const monthRangeOptions: MonthRangePickerOptions;
declare const yearRangeOptions: YearRangePickerOptions;
const monthCell: MonthPickerCellValue = { year: 2026, month: 9 };
const yearCell: YearPickerCellValue = { year: 2026 };
createMonthPicker(monthOptions).setCellAttributes(element, monthCell);
createYearPicker(yearOptions).setCellAttributes(element, yearCell);
createMonthRangePicker(monthRangeOptions).setCellAttributes(element, monthCell);
createYearRangePicker(yearRangeOptions).setCellAttributes(element, yearCell);
createYearPicker(yearOptions).handleEvent({ type: 'select-year', value: yearCell });
createYearRangePicker(yearRangeOptions).handleEvent({ type: 'select-year', value: yearCell });
createMonthPicker(monthOptions).handleEvent({ type: 'navigate-period', unit: 'month', direction: 'next' });
createYearPicker(yearOptions).handleEvent({ type: 'navigate-period', unit: 'year', direction: 'next' });
createMonthRangePicker(monthRangeOptions).handleEvent({ type: 'navigate-period', unit: 'month', direction: 'next' });
createYearRangePicker(yearRangeOptions).handleEvent({ type: 'navigate-period', unit: 'year', direction: 'next' });
declare const dateFieldLifetime: import('@sectile/dom/temporal/date-field').DateFieldConnection;
declare const timeFieldLifetime: import('@sectile/dom/temporal/time-field').TimeFieldConnection;
declare const dateTimeFieldLifetime: import('@sectile/dom/temporal/date-time-field').DateTimeFieldConnection;
for (const field of [dateFieldLifetime, timeFieldLifetime, dateTimeFieldLifetime]) {
  const active: boolean = field.getActive(); void active; field.suspend(); field.resume();
}
declare const datePickerLifetime: import('@sectile/dom/temporal/date-picker').DatePickerConnection;
const dateSeed: Pick<import('@sectile/dom/temporal/date-picker').DatePickerOptions, 'defaultState'> = { defaultState: datePickerLifetime.getSnapshot().state }; void dateSeed;
declare const monthPickerLifetime: import('@sectile/dom/temporal/month-picker').MonthPickerConnection;
declare const yearPickerLifetime: import('@sectile/dom/temporal/year-picker').YearPickerConnection;
declare const dateRangeLifetime: import('@sectile/dom/temporal/date-range-picker').DateRangePickerConnection;
declare const monthRangeLifetime: import('@sectile/dom/temporal/month-range-picker').MonthRangePickerConnection;
declare const yearRangeLifetime: import('@sectile/dom/temporal/year-range-picker').YearRangePickerConnection;
declare const dateTimeLifetime: import('@sectile/dom/temporal/date-time-picker').DateTimePickerConnection;
declare const dateTimeRangeLifetime: import('@sectile/dom/temporal/date-time-range-picker').DateTimeRangePickerConnection;
declare const calendarLifetime: import('@sectile/dom/temporal/calendar').CalendarConnection;
const calendarActive: boolean = calendarLifetime.getActive();
calendarLifetime.suspend(); calendarLifetime.resume(); void calendarActive;
for (const picker of [datePickerLifetime, monthPickerLifetime, yearPickerLifetime, dateRangeLifetime, monthRangeLifetime, yearRangeLifetime, dateTimeLifetime, dateTimeRangeLifetime]) {
  const active: boolean = picker.getActive(), order: number | null = picker.getLayerOrder();
  picker.suspend(); picker.resume(); picker.syncLayerParent(null); picker.subscribeLayerPresentation(() => {});
  void [active, order];
}
const rangeSeed: Pick<import('@sectile/dom/temporal/date-range-picker').DateRangePickerOptions, 'defaultState'> = { defaultState: dateRangeLifetime.getSnapshot().state };
const monthSeed: Pick<MonthPickerOptions, 'defaultState'> = { defaultState: monthPickerLifetime.getSnapshot().state };
const yearSeed: Pick<YearPickerOptions, 'defaultState'> = { defaultState: yearPickerLifetime.getSnapshot().state };
const monthRangeSeed: Pick<MonthRangePickerOptions, 'defaultState'> = { defaultState: monthRangeLifetime.getSnapshot().state };
const yearRangeSeed: Pick<YearRangePickerOptions, 'defaultState'> = { defaultState: yearRangeLifetime.getSnapshot().state };
const timedSeed: Pick<import('@sectile/dom/temporal/date-time-picker').DateTimePickerOptions, 'defaultState'> = { defaultState: dateTimeLifetime.getSnapshot().state };
const timedRangeSeed: Pick<import('@sectile/dom/temporal/date-time-range-picker').DateTimeRangePickerOptions, 'defaultState'> = { defaultState: dateTimeRangeLifetime.getSnapshot().state };
void [rangeSeed, monthSeed, yearSeed, monthRangeSeed, yearRangeSeed, timedSeed, timedRangeSeed];
const dateFields: Pick<import('@sectile/dom/temporal/date-picker').DatePickerOptions, 'defaultFieldStates'> = { defaultFieldStates: datePickerLifetime.getFieldStates() };
const timedFields: Pick<import('@sectile/dom/temporal/date-time-picker').DateTimePickerOptions, 'defaultFieldStates'> = { defaultFieldStates: dateTimeLifetime.getFieldStates() };
const timedRangeFields: Pick<import('@sectile/dom/temporal/date-time-range-picker').DateTimeRangePickerOptions, 'defaultFieldStates'> = { defaultFieldStates: dateTimeRangeLifetime.getFieldStates() };
void [dateFields, timedFields, timedRangeFields];
