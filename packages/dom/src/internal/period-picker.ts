import type { PeriodPickerNavigationEvent, MonthPickerEvent } from '@sectile/temporal/month-picker';
import { compareDateValues, dateRangeContains, type DateValue } from '@sectile/temporal/date-field';
import { calendarID, isCalendarValueAvailable } from '@sectile/temporal/calendar';
import type { DatePickerPolicies, DatePickerState } from '@sectile/temporal/date-picker';
import type { DateRangePickerState } from '@sectile/temporal/date-range-picker';
import type { DOMTemporalResult } from './result.js';
import { setDatePickerCellAvailability } from './date-picker-cell.js';

/** Private host capabilities supplied only by period entrypoints. */
export interface PeriodPickerHost<State> {
  readonly createKeyEvent: (referenceYear: number) => (input: KeyboardEvent) => MonthPickerEvent | null;
  readonly projectCell: (element: HTMLElement, value: DateValue, state: State, policies?: DatePickerPolicies) => void;
}

export function createPeriodPickerHost(
  unit: 'month' | 'year',
  normalize: (value: DateValue) => DOMTemporalResult<DateValue>,
): PeriodPickerHost<DatePickerState | DateRangePickerState> {
  return {
    createKeyEvent: (referenceYear) => (input) => toPeriodPickerEvent(input, unit, referenceYear),
    projectCell: (element, value, state, policies) => {
      const canonical = normalize(value);
      element.setAttribute('role', 'gridcell');
      if (!canonical.ok) {
        element.removeAttribute('data-date-picker-id');
        element.setAttribute('aria-selected', 'false');
        setDatePickerCellAvailability(element, false);
        element.tabIndex = -1;
        return;
      }
      const range = 'calendar' in state;
      const calendar = range ? state.calendar : state;
      const highlighted = normalize(calendar.highlighted);
      const selected = range
        ? (state.value !== null && dateRangeContains(state.value, canonical.value))
          || (state.anchor !== null && compareDateValues(state.anchor, canonical.value) === 0)
        : state.value !== null && compareDateValues(state.value, canonical.value) === 0;
      const available = isCalendarValueAvailable(canonical.value, policies);
      element.dataset['datePickerId'] = calendarID(canonical.value);
      element.setAttribute('aria-selected', String(selected));
      setDatePickerCellAvailability(element, available);
      element.tabIndex = available && highlighted.ok && compareDateValues(highlighted.value, canonical.value) === 0 ? 0 : -1;
    },
  };
}

export type { MonthPickerEvent as PeriodPickerEvent } from '@sectile/temporal/month-picker';

/** Translate browser keys; Temporal owns cell strides, page bounds and eligibility. */
export function toPeriodPickerEvent(input: KeyboardEvent, unit: 'month' | 'year', referenceYear: number): MonthPickerEvent | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  const direction: PeriodPickerNavigationEvent['direction'] | null =
    input.key === 'ArrowLeft' ? 'previous' : input.key === 'ArrowRight' ? 'next'
      : input.key === 'ArrowUp' ? 'above' : input.key === 'ArrowDown' ? 'below'
        : input.key === 'PageUp' ? 'previous-page' : input.key === 'PageDown' ? 'next-page'
          : input.key === 'Home' ? 'start' : input.key === 'End' ? 'end' : null;
  if (direction !== null) return { type: 'navigate-period', unit, direction, referenceYear };
  if (input.key === 'Enter' || input.key === ' ') return 'select-highlighted';
  if (input.key === 'Escape') return 'close';
  return null;
}
