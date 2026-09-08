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
