import type { PeriodPickerNavigationEvent, MonthPickerEvent } from '@sectile/temporal/month-picker';
export type { MonthPickerEvent as PeriodPickerEvent } from '@sectile/temporal/month-picker';
import type { TerminalKeyboardInput } from '../keyboard.js';

export function toPeriodPickerEvent(input: TerminalKeyboardInput, unit: 'month' | 'year', referenceYear = 7): MonthPickerEvent | null {
  if (input.ctrlKey || input.altKey) return null;
  const direction: PeriodPickerNavigationEvent['direction'] | null =
    input.key === 'left' ? 'previous' : input.key === 'right' ? 'next'
      : input.key === 'up' ? 'above' : input.key === 'down' ? 'below'
        : input.key === 'page-up' ? 'previous-page' : input.key === 'page-down' ? 'next-page'
          : input.key === 'home' ? 'start' : input.key === 'end' ? 'end' : null;
  if (direction !== null) return { type: 'navigate-period', unit, direction, referenceYear };
  if (input.key === 'enter' || input.key === 'space') return 'select-highlighted';
  if (input.key === 'escape') return 'close';
  return null;
}
