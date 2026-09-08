import type { MonthPickerValue } from '@sectile/temporal/month-picker';
import type { YearPickerValue } from '@sectile/temporal/year-picker';
import type { MonthPickerOptions } from '@sectile/terminal/month-picker';
import type { YearPickerOptions } from '@sectile/terminal/year-picker';
import { createMonthPicker, toMonthPickerEvent } from '@sectile/terminal/month-picker';
import { createYearPicker, toYearPickerEvent } from '@sectile/terminal/year-picker';
import { createMonthRangePicker } from '@sectile/terminal/month-range-picker';
import { createYearRangePicker } from '@sectile/terminal/year-range-picker';

const month: MonthPickerValue = { year: 2026, month: 9, day: 1 };
const monthHost: Pick<MonthPickerOptions, 'value'> = { value: month };
const year: YearPickerValue = { year: 2026, month: 1, day: 1 };
const yearHost: Pick<YearPickerOptions, 'value'> = { value: year };

void monthHost;
void yearHost;

const monthEvent = toMonthPickerEvent({ key: 'right' });
const yearEvent = toYearPickerEvent({ key: 'right' });
if (monthEvent !== null) createMonthPicker().handleEvent(monthEvent);
if (yearEvent !== null) createYearPicker().handleEvent(yearEvent);
createMonthRangePicker().handleEvent({ type: 'navigate-period', unit: 'month', direction: 'next' });
createYearRangePicker().handleEvent({ type: 'navigate-period', unit: 'year', direction: 'next' });
createYearPicker().handleEvent({ type: 'select-year', value: { year: 2026 } });
