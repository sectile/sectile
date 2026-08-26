import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import { createTerminalTemporalController, createTerminalTemporalFacadeConnection, type TerminalTemporalController, type TerminalTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyCalendarEvent,
  createCalendarMonth,
  createCalendarWeek,
  createCalendarYear,
  tryCreateCalendarState,
  type CalendarCommand,
  type CalendarEvent,
  type CalendarMonthValue,
  type CalendarPolicies,
  type CalendarState,
} from '@sectile/temporal/calendar';
import { compareDateValues, type DateValue } from '@sectile/temporal/date-field';
import type { TerminalKeyboardInput } from './keyboard.js';
import { currentReferenceDate } from './internal/reference-date.js';

export type {
  CalendarCommand,
  CalendarEvent,
  CalendarMonthValue,
  CalendarPolicies,
  CalendarState,
  CalendarView,
  CalendarViewMode,
} from '@sectile/temporal/calendar';
export type { DateValue } from '@sectile/temporal/date-field';

export interface CalendarOptions {
  readonly policies?: CalendarPolicies;
  readonly value?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly referenceDate?: DateValue;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly onValueChange?: (value: DateValue | null) => void;
  readonly onHighlightedValueChange?: (value: DateValue) => void;
  readonly onUpdate?: () => void;
}

export type CalendarValueChangeHandler = NonNullable<CalendarOptions['onValueChange']>;
export type CalendarHighlightedValueChangeHandler = NonNullable<CalendarOptions['onHighlightedValueChange']>;
export type CalendarUpdateHandler = NonNullable<CalendarOptions['onUpdate']>;

export interface CalendarControlledValues {
  readonly value?: DateValue | null;
  readonly highlightedValue?: DateValue;
}

export interface CalendarConnection {
  getSnapshot(): RevisionSnapshot<CalendarState>;
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly CalendarMonthValue[])[];
  syncControlledValues(values: CalendarControlledValues): TerminalTemporalResult<RevisionSnapshot<CalendarState>>;
  handleEvent(event: CalendarEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createCalendar(options: CalendarOptions = {}): FacadeConnection<CalendarConnection> {
  return unwrap(tryCreateCalendar(options));
}

export function tryCreateCalendar(options: CalendarOptions = {}): TerminalTemporalResult<FacadeConnection<CalendarConnection>> {
  return createTerminalTemporalFacadeConnection(options, constructCalendar);
}

function constructCalendar(options: CalendarOptions): TerminalTemporalResult<CalendarConnection> {
  const controls = {
    value: options.value !== undefined,
    highlighted: options.highlightedValue !== undefined,
  };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted ? options.highlightedValue : options.defaultHighlightedValue;
  const initial = tryCreateCalendarState({
    referenceDate: options.referenceDate ?? currentReferenceDate(),
    ...(requestedValue === undefined ? {} : { value: requestedValue }),
    ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }),
  });
  const runtime = createTerminalTemporalController<CalendarState, CalendarEvent, CalendarCommand, CalendarCommand>({
    initial,
    reducer: (state, event) => applyCalendarEvent(state, event, {
      ...options.policies,
      ...(options.required === undefined ? {} : { required: options.required }),
    }),
    reconcile: (previous, proposed) => tryCreateCalendarState({
      value: controls.value ? previous.value : proposed.value,
      highlighted: controls.highlighted ? previous.highlighted : proposed.highlighted,
      view: controls.highlighted ? previous.view : proposed.view,
      viewMode: proposed.viewMode,
    }),
    notify: (previous, proposed) => {
      if (compareNullable(previous.value, proposed.value) !== 0) options.onValueChange?.(proposed.value);
      if (compareDateValues(previous.highlighted, proposed.highlighted) !== 0) options.onHighlightedValueChange?.(proposed.highlighted);
    },
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: calendarInteractionIntent,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalCalendar(options, runtime.value, controls) }
    : runtime;
}

class TerminalCalendar implements CalendarConnection {
  readonly #options: CalendarOptions;
  readonly #runtime: TerminalTemporalController<CalendarState, CalendarEvent, CalendarCommand>;
  readonly #controls: { readonly value: boolean; readonly highlighted: boolean };

  public constructor(
    options: CalendarOptions,
    runtime: TerminalTemporalController<CalendarState, CalendarEvent, CalendarCommand>,
    controls: { readonly value: boolean; readonly highlighted: boolean },
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#controls = controls;
  }

  public getSnapshot(): RevisionSnapshot<CalendarState> { return this.#runtime.getSnapshot(); }
  public getMonth(): readonly (readonly DateValue[])[] {
    return createCalendarMonth(this.getSnapshot().state.view, this.#options.policies?.weekStartsOn);
  }
  public getWeek(): readonly DateValue[] {
    return createCalendarWeek(this.getSnapshot().state.highlighted, this.#options.policies?.weekStartsOn);
  }
  public getYear(): readonly (readonly CalendarMonthValue[])[] {
    return createCalendarYear(this.getSnapshot().state.view.year);
  }
  public syncControlledValues(values: CalendarControlledValues): TerminalTemporalResult<RevisionSnapshot<CalendarState>> {
    if (this.#controls.value !== (values.value !== undefined) || this.#controls.highlighted !== (values.highlightedValue !== undefined)) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'controlled-shape-mismatch',
          message: 'Controlled calendar values must preserve their construction-time shape.',
        },
      };
    }
    const state = this.getSnapshot().state;
    const highlighted = this.#controls.highlighted ? values.highlightedValue as DateValue : state.highlighted;
    const result = this.#runtime.replace(tryCreateCalendarState({
      value: this.#controls.value ? values.value as DateValue | null : state.value,
      highlighted,
      view: { year: highlighted.year, month: highlighted.month },
      viewMode: state.viewMode,
    }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }
  public handleEvent(event: CalendarEvent): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = toCalendarEvent(input);
    return event !== null && this.handleEvent(event);
  }
}

export function toCalendarEvent(input: TerminalKeyboardInput): CalendarEvent | null {
  if (input.ctrlKey || input.altKey) return null;
  if (input.key === 'left') return 'previous-day';
  if (input.key === 'right') return 'next-day';
  if (input.key === 'up') return 'previous-week';
  if (input.key === 'down') return 'next-week';
  if (input.key === 'home') return 'start-of-week';
  if (input.key === 'end') return 'end-of-week';
  if (input.key === 'page-up') return input.shiftKey ? 'previous-year' : 'previous-month';
  if (input.key === 'page-down') return input.shiftKey ? 'next-year' : 'next-month';
  if (input.key === 'enter' || input.key === 'space') return 'select-highlighted';
  return null;
}

function calendarInteractionIntent(event: CalendarEvent): 'navigate' | 'mutate' {
  if (event === 'select-highlighted') return 'mutate';
  return typeof event === 'object' && (event.type === 'select' || event.type === 'set-value') ? 'mutate' : 'navigate';
}
function compareNullable(left: DateValue | null, right: DateValue | null): number {
  return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateValues(left, right);
}
