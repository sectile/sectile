import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/core/date-field';
import { compareDateTimeValues, type DateTimeValue } from '@sectile/core/date-time-field';
import { createDatePickerMonth, createDatePickerWeek, createDatePickerYear, datePickerID, isDatePickerValueAvailable, type DatePickerMonthValue } from '@sectile/core/date-picker';
import {
  applyDateTimePickerEvent,
  createDateTimePickerState,
  type DateTimePickerCommand,
  type DateTimePickerEvent,
  type DateTimePickerPolicies,
  type DateTimePickerState,
} from '@sectile/core/date-time-picker';
export type { DateTimePickerPolicies } from '@sectile/core/date-time-picker';
import type { TimeValue } from '@sectile/core/time-field';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { setDatePickerCellAvailability } from './internal/date-picker-cell.js';
import { createDateField, type DateFieldConnection } from './date-field.js';
import { createDateTimeField, type DateTimeFieldConnection } from './date-time-field.js';
import { createTimeField, type TimeFieldConnection } from './time-field.js';

export interface DateTimePickerOptions {
  readonly root: HTMLElement;
  readonly grid: HTMLElement;
  readonly trigger: HTMLElement;
  readonly dateTimeInput?: HTMLInputElement;
  readonly dateInput?: HTMLInputElement;
  readonly timeInput?: HTMLInputElement;
  readonly policies?: DateTimePickerPolicies;
  readonly value?: DateTimeValue | null;
  readonly defaultValue?: DateTimeValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: DateTimeValue | null) => void;
  readonly onHighlightedValueChange?: (value: DateValue) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export interface DateTimePickerControlledValues {
  readonly value?: DateTimeValue | null;
  readonly highlightedValue?: DateValue;
  readonly open?: boolean;
}

export interface DateTimePickerConnection {
  getSnapshot(): RevisionSnapshot<DateTimePickerState>;
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly DatePickerMonthValue[])[];
  syncControlledValues(values: DateTimePickerControlledValues): Result<RevisionSnapshot<DateTimePickerState>>;
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: DateTimePickerEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createDateTimePicker(
  options: DateTimePickerOptions,
): FacadeConnection<DateTimePickerConnection> {
  return unwrap(tryCreateDateTimePicker(options));
}

export function tryCreateDateTimePicker(
  options: DateTimePickerOptions,
): Result<FacadeConnection<DateTimePickerConnection>> {
  return createFacadeConnection(options, construct);
}

function construct(options: DateTimePickerOptions): Result<DateTimePickerConnection> {
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
  const initial = createDateTimePickerState({
    ...(requestedValue === undefined ? {} : { value: requestedValue }),
    ...(requestedValue == null && options.policies?.defaultTime !== undefined
      ? { time: options.policies.defaultTime }
      : {}),
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
    DateTimePickerState,
    DateTimePickerEvent,
    DateTimePickerCommand,
    DateTimePickerCommand
  >({
    initial,
    reducer: (state, event) => applyDateTimePickerEvent(state, event, policies),
    reconcile: (previous, proposed) => createDateTimePickerState({
      value: controls.value ? previous.value : proposed.value,
      time: controls.value ? previous.time : proposed.time,
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
      if (compareNullable(previous.value, proposed.value) !== 0) {
        options.onValueChange?.(proposed.value);
      }
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
    ? { ok: true, value: new DOMDateTimePicker(options, runtime.value, controls) }
    : runtime;
}

class DOMDateTimePicker implements DateTimePickerConnection {
  readonly options: DateTimePickerOptions;
  readonly runtime: SemanticController<DateTimePickerState, DateTimePickerEvent, DateTimePickerCommand>;
  readonly controls: { value: boolean; highlighted: boolean; open: boolean };
  readonly #dateTimeField: FacadeConnection<DateTimeFieldConnection> | null;
  readonly #dateField: FacadeConnection<DateFieldConnection> | null;
  readonly #timeField: FacadeConnection<TimeFieldConnection> | null;
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
    options: DateTimePickerOptions,
    runtime: SemanticController<DateTimePickerState, DateTimePickerEvent, DateTimePickerCommand>,
    controls: { value: boolean; highlighted: boolean; open: boolean },
  ) {
    this.options = options;
    this.runtime = runtime;
    this.controls = controls;
    const state = runtime.getSnapshot().state;
    this.#dateTimeField = options.dateTimeInput === undefined ? null : createDateTimeField({
      input: options.dateTimeInput,
      defaultValue: state.value,
      policies: {
        ...(options.policies?.min === undefined ? {} : { min: options.policies.min }),
        ...(options.policies?.max === undefined ? {} : { max: options.policies.max }),
        ...(options.policies?.unavailable === undefined ? {} : { unavailable: options.policies.unavailable }),
        ...(options.policies?.time?.step === undefined ? {} : { step: options.policies.time.step }),
      },
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.required === undefined ? {} : { required: options.required }),
      ...(options.label === undefined ? {} : { label: options.label }),
      onValueChange: (value) => {
        if (!this.#syncingFields) this.handleEvent({ type: 'set-value', value });
      },
    });
    this.#dateField = options.dateInput === undefined ? null : createDateField({
      input: options.dateInput,
      defaultValue: state.value?.date ?? null,
      ...(options.policies?.date === undefined ? {} : { policies: options.policies.date }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.required === undefined ? {} : { required: options.required }),
      ...(options.label === undefined ? {} : { label: options.label }),
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) this.handleEvent({ type: 'set-date', value });
      },
    });
    this.#timeField = options.timeInput === undefined ? null : createTimeField({
      input: options.timeInput,
      defaultValue: state.time,
      ...(options.policies?.time === undefined ? {} : { policies: options.policies.time }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) this.handleEvent({ type: 'set-time', value });
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

  public getSnapshot(): RevisionSnapshot<DateTimePickerState> { return this.runtime.getSnapshot(); }

  public getMonth(): readonly (readonly DateValue[])[] {
    const state = this.getSnapshot().state.calendar;
    return unwrap(createDatePickerMonth(state.view, this.options.policies?.date?.weekStartsOn));
  }

  public getWeek(): readonly DateValue[] {
    const state = this.getSnapshot().state.calendar;
    return unwrap(createDatePickerWeek(state.highlighted, this.options.policies?.date?.weekStartsOn));
  }

  public getYear(): readonly (readonly DatePickerMonthValue[])[] {
    return unwrap(createDatePickerYear(this.getSnapshot().state.calendar.view.year));
  }

  public syncControlledValues(
    values: DateTimePickerControlledValues,
  ): Result<RevisionSnapshot<DateTimePickerState>> {
    if (
      this.controls.value !== (values.value !== undefined)
      || this.controls.highlighted !== (values.highlightedValue !== undefined)
      || this.controls.open !== (values.open !== undefined)
    ) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date-time picker values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const highlighted = this.controls.highlighted
      ? values.highlightedValue as DateValue
      : state.calendar.highlighted;
    const result = this.runtime.replace(createDateTimePickerState({
      value: this.controls.value ? values.value as DateTimeValue | null : state.value,
      time: state.time,
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
    element.setAttribute('aria-selected', String(
      state.value !== null && compareDateValues(state.value.date, value) === 0,
    ));
    setDatePickerCellAvailability(
      element,
      isDatePickerValueAvailable(value, this.options.policies?.date),
    );
    element.tabIndex = compareDateValues(state.calendar.highlighted, value) === 0 ? 0 : -1;
  }

  public handleEvent(event: DateTimePickerEvent): boolean {
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
    this.#syncingFields = true;
    if (this.#dateTimeField !== null && compareNullable(this.#dateTimeField.getValue(), state.value) !== 0) {
      this.#dateTimeField.handleEvent({ type: 'set-value', value: state.value });
    }
    if (this.#dateField !== null && compareDateNullable(this.#dateField.getValue(), state.value?.date ?? null) !== 0) {
      this.#dateField.handleEvent({ type: 'set-value', value: state.value?.date ?? null });
    }
    if (this.#timeField !== null && compareTime(this.#timeField.getValue(), state.time) !== 0) {
      this.#timeField.handleEvent({ type: 'set-value', value: state.time });
    }
    this.#syncingFields = false;
  }

  public disconnect(): void {
    this.#dateTimeField?.disconnect();
    this.#dateField?.disconnect();
    this.#timeField?.disconnect();
    this.options.trigger.removeEventListener('click', this.#trigger);
    this.options.grid.removeEventListener('keydown', this.#keydown);
    this.options.grid.removeEventListener('click', this.#click);
  }
}

function keyEvent(event: KeyboardEvent): DateTimePickerEvent | null {
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

function compareNullable(left: DateTimeValue | null, right: DateTimeValue | null): number {
  return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateTimeValues(left, right);
}

function compareTime(left: TimeValue | null, right: TimeValue): number {
  if (left === null) return -1;
  return left.hour - right.hour
    || left.minute - right.minute
    || left.second - right.second
    || left.millisecond - right.millisecond;
}

function compareDateNullable(left: DateValue | null, right: DateValue | null): number {
  return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateValues(left, right);
}
