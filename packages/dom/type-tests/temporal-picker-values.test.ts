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
