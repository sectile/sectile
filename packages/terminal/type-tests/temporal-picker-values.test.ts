import type { MonthPickerValue } from '@sectile/temporal/month-picker';
import type { YearPickerValue } from '@sectile/temporal/year-picker';
import type { MonthPickerOptions } from '@sectile/terminal/month-picker';
import type { YearPickerOptions } from '@sectile/terminal/year-picker';

const month: MonthPickerValue = { year: 2026, month: 9, day: 1 };
const monthHost: Pick<MonthPickerOptions, 'value'> = { value: month };
const year: YearPickerValue = { year: 2026, month: 1, day: 1 };
const yearHost: Pick<YearPickerOptions, 'value'> = { value: year };

void monthHost;
void yearHost;
