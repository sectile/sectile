import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyCalendarEvent,
  calendarID,
  createCalendarMonth,
  createCalendarWeek,
  createCalendarYear,
  isCalendarValueAvailable,
  tryCreateCalendarState,
  type CalendarCommand,
  type CalendarEvent,
  type CalendarMonthValue,
  type CalendarPolicies,
  type CalendarState,
} from '@sectile/temporal/calendar';
import { compareDateValues, parseDateValue, type DateValue } from '@sectile/temporal/date-field';
import { setDatePickerCellAvailability } from './internal/date-picker-cell.js';
import { setInteractionAttributes } from './internal/interaction.js';
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
  readonly root: HTMLElement;
  readonly grid?: HTMLElement;
  readonly policies?: CalendarPolicies;
  readonly value?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly referenceDate?: DateValue;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
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
  syncControlledValues(values: CalendarControlledValues): DOMTemporalResult<RevisionSnapshot<CalendarState>>;
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: CalendarEvent): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  focusCurrent(): void;
  refresh(): void;
  disconnect(): void;
}

export function createCalendar(options: CalendarOptions): FacadeConnection<CalendarConnection> {
  return unwrap(tryCreateCalendar(options));
}

export function tryCreateCalendar(options: CalendarOptions): DOMTemporalResult<FacadeConnection<CalendarConnection>> {
  return createDOMTemporalFacadeConnection(options, constructCalendar);
}

function constructCalendar(options: CalendarOptions): DOMTemporalResult<CalendarConnection> {
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
  const runtime = createDOMTemporalController<CalendarState, CalendarEvent, CalendarCommand, CalendarCommand>({
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
    ? { ok: true, value: new DOMCalendar(options, runtime.value, controls) }
    : runtime;
}

class DOMCalendar implements CalendarConnection {
  readonly #options: CalendarOptions;
  readonly #grid: HTMLElement;
  readonly #runtime: DOMTemporalController<CalendarState, CalendarEvent, CalendarCommand>;
  readonly #controls: { readonly value: boolean; readonly highlighted: boolean };
  readonly #keydown = (event: KeyboardEvent): void => {
    if (this.handleKeyboardEvent(event)) event.preventDefault();
  };
  readonly #click = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-calendar-id]') : null;
    if (target === null || !this.#grid.contains(target)) return;
    const parsed = parseDateValue(target.dataset['calendarId'] ?? '');
    if (parsed.ok) this.handleEvent({ type: 'select', value: parsed.value });
  };

  public constructor(
    options: CalendarOptions,
    runtime: DOMTemporalController<CalendarState, CalendarEvent, CalendarCommand>,
    controls: { readonly value: boolean; readonly highlighted: boolean },
  ) {
    this.#options = options;
    this.#grid = options.grid ?? options.root;
    this.#runtime = runtime;
    this.#controls = controls;
    this.#grid.addEventListener('keydown', this.#keydown);
    this.#grid.addEventListener('click', this.#click);
    this.#grid.setAttribute('role', 'grid');
    setInteractionAttributes(this.#grid, options);
    this.refresh();
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
  public syncControlledValues(values: CalendarControlledValues): DOMTemporalResult<RevisionSnapshot<CalendarState>> {
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
    if (result.ok) {
      this.refresh();
      this.#options.onUpdate?.();
    }
    return result;
  }
  public setCellAttributes(element: HTMLElement, value: DateValue): void {
    const state = this.getSnapshot().state;
    element.dataset['calendarId'] = calendarID(value);
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-selected', String(state.value !== null && compareDateValues(state.value, value) === 0));
    setDatePickerCellAvailability(element, isCalendarValueAvailable(value, this.#options.policies));
    element.tabIndex = compareDateValues(state.highlighted, value) === 0 ? 0 : -1;
  }
  public handleEvent(event: CalendarEvent): boolean {
    const result = this.#runtime.handle(event);
    if (!result.ok) return false;
    this.refresh();
    this.#options.onUpdate?.();
    if (result.commands.some((command) => command.type === 'highlight-changed')) {
      queueMicrotask(() => this.focusCurrent());
    }
    return true;
  }
  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const semantic = toCalendarEvent(event);
    return semantic !== null && this.handleEvent(semantic);
  }
  public focusCurrent(): void {
    this.#grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }
  public refresh(): void {
    if (this.#options.label === undefined) this.#grid.removeAttribute('aria-label');
    else this.#grid.setAttribute('aria-label', this.#options.label);
    this.#grid.querySelectorAll<HTMLElement>('[data-calendar-id]').forEach((element) => {
      const parsed = parseDateValue(element.dataset['calendarId'] ?? '');
      if (parsed.ok) this.setCellAttributes(element, parsed.value);
    });
  }
  public disconnect(): void {
    this.#grid.removeEventListener('keydown', this.#keydown);
    this.#grid.removeEventListener('click', this.#click);
  }
}

export function toCalendarEvent(input: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): CalendarEvent | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowLeft') return 'previous-day';
  if (input.key === 'ArrowRight') return 'next-day';
  if (input.key === 'ArrowUp') return 'previous-week';
  if (input.key === 'ArrowDown') return 'next-week';
  if (input.key === 'Home') return 'start-of-week';
  if (input.key === 'End') return 'end-of-week';
  if (input.key === 'PageUp') return input.shiftKey ? 'previous-year' : 'previous-month';
  if (input.key === 'PageDown') return input.shiftKey ? 'next-year' : 'next-month';
  if (input.key === 'Enter' || input.key === ' ') return 'select-highlighted';
  return null;
}

function calendarInteractionIntent(event: CalendarEvent): 'navigate' | 'mutate' {
  if (event === 'select-highlighted') return 'mutate';
  return typeof event === 'object' && (event.type === 'select' || event.type === 'set-value') ? 'mutate' : 'navigate';
}
function compareNullable(left: DateValue | null, right: DateValue | null): number {
  return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateValues(left, right);
}
