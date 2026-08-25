import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/core/date-field';
import { formatDateTimeRange, formatDateTimeValue, type DateTimeRange } from '@sectile/core/date-time-field';
import { createDatePickerMonth, createDatePickerWeek, createDatePickerYear, datePickerID, isDatePickerValueAvailable, type DatePickerMonthValue } from '@sectile/core/date-picker';
import {
  applyDateTimeRangePickerEvent,
  tryCreateDateTimeRangePickerState,
  type DateTimeRangePickerCommand,
  type DateTimeRangePickerEvent,
  type DateTimeRangePickerPolicies,
  type DateTimeRangePickerState,
} from '@sectile/core/date-time-range-picker';
export type { DateTimeRangePickerPolicies } from '@sectile/core/date-time-range-picker';
import type { TimeValue } from '@sectile/core/time-field';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { setDatePickerCellAvailability } from './internal/date-picker-cell.js';
import { createDateField, type DateFieldConnection } from './date-field.js';
import { createTimeField, type TimeFieldConnection } from './time-field.js';

export interface DateTimeRangePickerOptions {
  readonly root: HTMLElement;
  readonly grid: HTMLElement;
  readonly trigger: HTMLElement;
  readonly startDateTimeInput?: HTMLInputElement;
  readonly endDateTimeInput?: HTMLInputElement;
  readonly startDateInput?: HTMLInputElement;
  readonly endDateInput?: HTMLInputElement;
  readonly startTimeInput?: HTMLInputElement;
  readonly endTimeInput?: HTMLInputElement;
  readonly policies?: DateTimeRangePickerPolicies;
  readonly value?: DateTimeRange | null;
  readonly defaultValue?: DateTimeRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: DateTimeRange | null) => void;
  readonly onHighlightedValueChange?: (value: DateValue) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type DateTimeRangePickerValueChangeHandler = NonNullable<DateTimeRangePickerOptions['onValueChange']>;
export type DateTimeRangePickerHighlightedValueChangeHandler = NonNullable<DateTimeRangePickerOptions['onHighlightedValueChange']>;
export type DateTimeRangePickerOpenChangeHandler = NonNullable<DateTimeRangePickerOptions['onOpenChange']>;
export type DateTimeRangePickerUpdateHandler = NonNullable<DateTimeRangePickerOptions['onUpdate']>;

export interface DateTimeRangePickerControlledValues {
  readonly value?: DateTimeRange | null;
  readonly highlightedValue?: DateValue;
  readonly open?: boolean;
}

export interface DateTimeRangePickerConnection {
  getSnapshot(): RevisionSnapshot<DateTimeRangePickerState>;
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly DatePickerMonthValue[])[];
  syncControlledValues(values: DateTimeRangePickerControlledValues): Result<RevisionSnapshot<DateTimeRangePickerState>>;
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: DateTimeRangePickerEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createDateTimeRangePicker(
  options: DateTimeRangePickerOptions,
): FacadeConnection<DateTimeRangePickerConnection> {
  return unwrap(tryCreateDateTimeRangePicker(options));
}

export function tryCreateDateTimeRangePicker(
  options: DateTimeRangePickerOptions,
): Result<FacadeConnection<DateTimeRangePickerConnection>> {
  return createFacadeConnection(options, construct);
}

function construct(options: DateTimeRangePickerOptions): Result<DateTimeRangePickerConnection> {
  const controls = {
    value: options.value !== undefined,
    highlighted: options.highlightedValue !== undefined,
    open: options.open !== undefined,
  };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted
    ? options.highlightedValue
    : options.defaultHighlightedValue;
  const requestedOpen = controls.open ? options.open : options.defaultOpen;
  const initial = tryCreateDateTimeRangePickerState({
    ...(requestedValue === undefined ? {} : { value: requestedValue }),
    calendar: {
      ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }),
      ...(requestedOpen === undefined ? {} : { open: requestedOpen }),
    },
  });
  const policies = Object.freeze({
    ...options.policies,
    ...(options.required === undefined ? {} : { required: options.required }),
  });
  const runtime = createSemanticController<
    DateTimeRangePickerState,
    DateTimeRangePickerEvent,
    DateTimeRangePickerCommand,
    DateTimeRangePickerCommand
  >({
    initial,
    reducer: (state, event) => applyDateTimeRangePickerEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateDateTimeRangePickerState({
      value: controls.value ? previous.value : proposed.value,
      anchor: proposed.anchor,
      startTime: controls.value ? previous.startTime : proposed.startTime,
      endTime: controls.value ? previous.endTime : proposed.endTime,
      calendar: {
        ...proposed.calendar,
        highlighted: controls.highlighted
          ? previous.calendar.highlighted
          : proposed.calendar.highlighted,
        view: controls.highlighted ? previous.calendar.view : proposed.calendar.view,
        open: controls.open ? previous.calendar.open : proposed.calendar.open,
      },
    }),
    notify: (previous, proposed) => {
      if (rangeKey(previous.value) !== rangeKey(proposed.value)) options.onValueChange?.(proposed.value);
      if (compareDateValues(previous.calendar.highlighted, proposed.calendar.highlighted) !== 0) {
        options.onHighlightedValueChange?.(proposed.calendar.highlighted);
      }
      if (previous.calendar.open !== proposed.calendar.open) {
        options.onOpenChange?.(proposed.calendar.open);
      }
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMDateTimeRangePicker(options, runtime.value, controls) }
    : runtime;
}

class DOMDateTimeRangePicker implements DateTimeRangePickerConnection {
  readonly options: DateTimeRangePickerOptions;
  readonly runtime: SemanticController<DateTimeRangePickerState, DateTimeRangePickerEvent, DateTimeRangePickerCommand>;
  readonly controls: { value: boolean; highlighted: boolean; open: boolean };
  readonly #startTimeField: FacadeConnection<TimeFieldConnection> | null;
  readonly #endTimeField: FacadeConnection<TimeFieldConnection> | null;
  readonly #startDateField: FacadeConnection<DateFieldConnection> | null;
  readonly #endDateField: FacadeConnection<DateFieldConnection> | null;
  #syncingFields = false;
  readonly #trigger = (): void => { this.handleEvent('toggle'); };
  readonly #keydown = (event: KeyboardEvent): void => {
    const semantic = keyEvent(event);
    if (semantic !== null) {
      event.preventDefault();
      this.handleEvent(semantic);
    }
  };
  readonly #click = (event: MouseEvent): void => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-date-picker-id]')
      : null;
    const parts = target?.dataset['datePickerId']?.split('-').map(Number);
    if (target !== null && this.options.grid.contains(target) && parts?.length === 3) {
      this.handleEvent({
        type: 'select-date',
        value: { year: parts[0] as number, month: parts[1] as number, day: parts[2] as number },
      });
    }
  };

  public constructor(
    options: DateTimeRangePickerOptions,
    runtime: SemanticController<DateTimeRangePickerState, DateTimeRangePickerEvent, DateTimeRangePickerCommand>,
    controls: { value: boolean; highlighted: boolean; open: boolean },
  ) {
    this.options = options;
    this.runtime = runtime;
    this.controls = controls;
    const state = runtime.getSnapshot().state;
    this.#startDateField = options.startDateInput === undefined ? null : createDateField({
      input: options.startDateInput,
      defaultValue: state.value?.start.date ?? null,
      ...(options.policies?.date === undefined ? {} : { policies: options.policies.date }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) this.handleEvent({ type: 'set-start-date', value });
      },
    });
    this.#endDateField = options.endDateInput === undefined ? null : createDateField({
      input: options.endDateInput,
      defaultValue: state.value?.end.date ?? null,
      ...(options.policies?.date === undefined ? {} : { policies: options.policies.date }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) this.handleEvent({ type: 'set-end-date', value });
      },
    });
    this.#startTimeField = options.startTimeInput === undefined ? null : createTimeField({
      input: options.startTimeInput,
      defaultValue: state.startTime,
      ...(options.policies?.startTime === undefined ? {} : { policies: options.policies.startTime }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) this.handleEvent({ type: 'set-start-time', value });
      },
    });
    this.#endTimeField = options.endTimeInput === undefined ? null : createTimeField({
      input: options.endTimeInput,
      defaultValue: state.endTime,
      ...(options.policies?.endTime === undefined ? {} : { policies: options.policies.endTime }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) this.handleEvent({ type: 'set-end-time', value });
      },
    });
    options.trigger.addEventListener('click', this.#trigger);
    options.grid.addEventListener('keydown', this.#keydown);
    options.grid.addEventListener('click', this.#click);
    options.root.setAttribute('role', 'dialog');
    options.root.setAttribute('aria-modal', 'false');
    options.grid.setAttribute('role', 'grid');
    setInteractionAttributes(options.trigger, options, { native: true });
    setInteractionAttributes(options.grid, options);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<DateTimeRangePickerState> { return this.runtime.getSnapshot(); }

  public getMonth(): readonly (readonly DateValue[])[] {
    const state = this.getSnapshot().state.calendar;
    return createDatePickerMonth(state.view, this.options.policies?.date?.weekStartsOn);
  }

  public getWeek(): readonly DateValue[] {
    const state = this.getSnapshot().state.calendar;
    return createDatePickerWeek(state.highlighted, this.options.policies?.date?.weekStartsOn);
  }

  public getYear(): readonly (readonly DatePickerMonthValue[])[] {
    return createDatePickerYear(this.getSnapshot().state.calendar.view.year);
  }

  public syncControlledValues(
    values: DateTimeRangePickerControlledValues,
  ): Result<RevisionSnapshot<DateTimeRangePickerState>> {
    if (
      this.controls.value !== (values.value !== undefined)
      || this.controls.highlighted !== (values.highlightedValue !== undefined)
      || this.controls.open !== (values.open !== undefined)
    ) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date-time range picker values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const highlighted = this.controls.highlighted
      ? values.highlightedValue as DateValue
      : state.calendar.highlighted;
    const result = this.runtime.replace(tryCreateDateTimeRangePickerState({
      value: this.controls.value ? values.value as DateTimeRange | null : state.value,
      anchor: state.anchor,
      startTime: state.startTime,
      endTime: state.endTime,
      calendar: {
        highlighted,
        view: { year: highlighted.year, month: highlighted.month },
        viewMode: state.calendar.viewMode,
        open: this.controls.open ? values.open as boolean : state.calendar.open,
      },
    }));
    if (result.ok) {
      this.refresh();
      this.options.onUpdate?.();
    }
    return result;
  }

  public setCellAttributes(element: HTMLElement, value: DateValue): void {
    const state = this.getSnapshot().state;
    element.dataset['datePickerId'] = datePickerID(value);
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-selected', String(isSelected(state, value)));
    setDatePickerCellAvailability(
      element,
      isDatePickerValueAvailable(value, this.options.policies?.date),
    );
    element.tabIndex = compareDateValues(state.calendar.highlighted, value) === 0 ? 0 : -1;
  }

  public handleEvent(event: DateTimeRangePickerEvent): boolean {
    const result = this.runtime.handle(event);
    if (result.ok) {
      this.refresh();
      this.options.onUpdate?.();
      if (result.commands.some((command) => command.type === 'open-changed' && !command.open)) {
        this.options.trigger.focus();
      } else if (result.commands.some((command) => command.type === 'highlight-changed')) {
        queueMicrotask(() => this.options.grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
      }
    }
    return result.ok;
  }

  public refresh(): void {
    const state = this.getSnapshot().state;
    this.options.root.hidden = !state.calendar.open;
    this.options.trigger.setAttribute('aria-haspopup', 'dialog');
    this.options.trigger.setAttribute('aria-expanded', String(state.calendar.open));
    if (this.options.label !== undefined) this.options.grid.setAttribute('aria-label', this.options.label);
    for (const [input, value] of [
      [this.options.startDateTimeInput, state.value?.start],
      [this.options.endDateTimeInput, state.value?.end],
    ] as const) {
      if (input !== undefined) {
        input.value = value === undefined ? '' : formatDateTimeValue(value);
        input.readOnly = true;
        setInteractionAttributes(input, this.options, { native: true, readOnly: true });
      }
    }
    this.#syncingFields = true;
    syncDateField(this.#startDateField, state.value?.start.date ?? null);
    syncDateField(this.#endDateField, state.value?.end.date ?? null);
    syncTimeField(this.#startTimeField, state.startTime);
    syncTimeField(this.#endTimeField, state.endTime);
    this.#syncingFields = false;
  }

  public disconnect(): void {
    this.#startTimeField?.disconnect();
    this.#endTimeField?.disconnect();
    this.#startDateField?.disconnect();
    this.#endDateField?.disconnect();
    this.options.trigger.removeEventListener('click', this.#trigger);
    this.options.grid.removeEventListener('keydown', this.#keydown);
    this.options.grid.removeEventListener('click', this.#click);
  }
}

function keyEvent(event: KeyboardEvent): DateTimeRangePickerEvent | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'ArrowLeft') return 'previous-day';
  if (event.key === 'ArrowRight') return 'next-day';
  if (event.key === 'ArrowUp') return 'previous-week';
  if (event.key === 'ArrowDown') return 'next-week';
  if (event.key === 'Home') return 'start-of-week';
  if (event.key === 'End') return 'end-of-week';
  if (event.key === 'PageUp') return event.shiftKey ? 'previous-year' : 'previous-month';
  if (event.key === 'PageDown') return event.shiftKey ? 'next-year' : 'next-month';
  if (event.key === 'Enter' || event.key === ' ') return 'select-highlighted';
  if (event.key === 'Escape') return 'close';
  return null;
}

function isSelected(state: DateTimeRangePickerState, value: DateValue): boolean {
  if (state.anchor !== null && compareDateValues(state.anchor, value) === 0) return true;
  return state.value !== null
    && compareDateValues(state.value.start.date, value) <= 0
    && compareDateValues(value, state.value.end.date) <= 0;
}

function syncTimeField(field: FacadeConnection<TimeFieldConnection> | null, value: TimeValue): void {
  if (field === null) return;
  const current = field.getValue();
  if (
    current === null
    || current.hour !== value.hour
    || current.minute !== value.minute
    || current.second !== value.second
    || current.millisecond !== value.millisecond
  ) {
    field.handleEvent({ type: 'set-value', value });
  }
}

function syncDateField(field: FacadeConnection<DateFieldConnection> | null, value: DateValue | null): void {
  if (field === null) return;
  const current = field.getValue();
  if (current === null ? value !== null : value === null || compareDateValues(current, value) !== 0) {
    field.handleEvent({ type: 'set-value', value });
  }
}

function rangeKey(value: DateTimeRange | null): string {
  return value === null ? '' : formatDateTimeRange(value);
}
