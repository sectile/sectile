import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { fail, freezeArray, ok } from './internal/foundation.js';

export interface YearPickerValue { readonly year: number }

export function createYearPickerPage(year: number, pageSize = 12): readonly (readonly YearPickerValue[])[] {
  return unwrap(tryCreateYearPickerPage(year, pageSize));
}

export function tryCreateYearPickerPage(year: number, pageSize = 12): TemporalResult<readonly (readonly YearPickerValue[])[]> {
  if (!Number.isSafeInteger(year)) return fail('construction', 'invalid-year-picker-year', 'Year picker year must be a safe integer.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) return fail('construction', 'invalid-year-picker-page-size', 'Year picker page size must be a positive safe integer.');
  const columns = 4;
  const start = year - Math.floor(pageSize / 2);
  const rows: YearPickerValue[][] = [];
  for (let row = 0; row < Math.ceil(pageSize / columns); row += 1) {
    const values: YearPickerValue[] = [];
    for (let column = 0; column < columns; column += 1) {
      const offset = row * columns + column;
      if (offset < pageSize) values.push(Object.freeze({ year: start + offset }));
    }
    rows.push(values);
  }
  return ok(freezeArray(rows.map((values) => freezeArray(values))));
}

export {
  applyDatePickerEvent as applyYearPickerEvent,
  createDatePickerState as createYearPickerState,
} from './date-picker.js';
export type {
  DatePickerCommand as YearPickerCommand,
  DatePickerEvent as YearPickerEvent,
  DatePickerPolicies as YearPickerPolicies,
  DatePickerState as YearPickerState,
  DatePickerStateInput as YearPickerStateInput,
  DatePickerUpdate as YearPickerUpdate,
} from './date-picker.js';

export { tryCreateDatePickerState as tryCreateYearPickerState } from './date-picker.js';
