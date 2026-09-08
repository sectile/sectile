import { applyCalendarEvent, isCalendarValueAvailable } from '../calendar.js';
import { addDateMonths, addDateYears, compareDateValues, tryCreateDateValue } from '../date-field.js';
import type { DatePickerPolicies, DatePickerState, DatePickerUpdate } from '../date-picker.js';
import type { DateRangePickerState, DateRangePickerUpdate } from '../date-range-picker.js';
import type { TemporalResult } from '../error.js';
import { fail } from './foundation.js';
import { createMachineUpdate } from './machine.js';

export interface PeriodPickerNavigationEvent {
  readonly type: 'navigate-period';
  readonly unit: 'month' | 'year';
  readonly direction: 'previous' | 'next' | 'above' | 'below' | 'previous-page' | 'next-page' | 'start' | 'end';
  /** Initial highlighted year anchoring twelve-cell pages; defaults to 7 for pages starting at years 1, 13, 25, and so on. */
  readonly referenceYear?: number;
}

export function applyPeriodPickerNavigation(state: DatePickerState, event: PeriodPickerNavigationEvent, policies: DatePickerPolicies): TemporalResult<DatePickerUpdate> {
  const valid = applyCalendarEvent(state, { type: 'set-view-mode', value: state.viewMode }, policies);
  if (!valid.ok) return valid;
  if (event.unit !== 'month' && event.unit !== 'year') return fail('transition-rejection', 'unsupported-calendar-event', 'Period navigation requires a month or year unit.');
  const referenceYear = event.referenceYear ?? 7;
  if (!Number.isSafeInteger(referenceYear) || referenceYear < 1 || referenceYear > 9_999) return fail('construction', 'invalid-year-picker-year', 'Period navigation reference year must be between 1 and 9999.');
  const limit = policies.maxScan ?? 366;
  if (!Number.isSafeInteger(limit) || limit < 1) return fail('construction', 'invalid-calendar-max-scan', 'Calendar max scan must be a positive safe integer.');
  const month = event.unit === 'month';
  const columns = month ? 3 : 4;
  const pageStart = referenceYear - 6 + Math.floor((state.highlighted.year - referenceYear + 6) / 12) * 12;
  const rowOffset = (state.highlighted.year - pageStart) % columns;
  let delta: number;
  switch (event.direction) {
    case 'previous': delta = -1; break;
    case 'next': delta = 1; break;
    case 'above': delta = -columns; break;
    case 'below': delta = columns; break;
    case 'previous-page': delta = -12; break;
    case 'next-page': delta = 12; break;
    case 'start': delta = month ? 1 - state.highlighted.month : -rowOffset; break;
    case 'end': delta = month ? 12 - state.highlighted.month : columns - 1 - rowOffset; break;
    default: return fail('transition-rejection', 'unsupported-calendar-event', 'Period navigation direction is unsupported.');
  }
  const canonical = tryCreateDateValue(state.highlighted.year, month ? state.highlighted.month : 1, 1);
  if (!canonical.ok) return canonical;
  const add = month ? addDateMonths : addDateYears;
  let candidate = add(canonical.value, delta);
  if (!candidate.ok) return candidate;
  const direction = event.direction === 'start' ? 1 : event.direction === 'end' ? -1 : delta < 0 ? -1 : 1;
  const edge = event.direction === 'start' || event.direction === 'end';
  const rowStart = state.highlighted.year - rowOffset;
  for (let scanned = 0; scanned < limit; scanned += 1) {
    const value = candidate.value;
    if (edge && (month ? value.year !== state.highlighted.year : value.year < rowStart || value.year >= rowStart + columns)) return createMachineUpdate(state);
    if (isCalendarValueAvailable(value, policies)) {
      if (compareDateValues(value, state.highlighted) === 0) return createMachineUpdate(state);
      return createMachineUpdate(Object.freeze({ ...state, highlighted: value, view: Object.freeze({ year: value.year, month: value.month }) }), [{ type: 'highlight-changed', value }]);
    }
    candidate = add(value, direction);
    if (!candidate.ok) return createMachineUpdate(state);
  }
  return fail('resource-rejection', 'calendar-scan-exhausted', 'Calendar did not find an available period within maxScan.', { maxScan: limit });
}

export function applyPeriodRangePickerNavigation(state: DateRangePickerState, event: PeriodPickerNavigationEvent, policies: DatePickerPolicies): TemporalResult<DateRangePickerUpdate> {
  const update = applyPeriodPickerNavigation(state.calendar, event, policies);
  return update.ok
    ? createMachineUpdate(Object.freeze({ ...state, calendar: update.value.state }), update.value.commands)
    : update;
}
