import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/temporal/date-field';
import { compareDateTimeValues, type DateTimeValue } from '@sectile/temporal/date-time-field';
import { createCalendarMonth } from '@sectile/temporal/calendar';
import { addTimeMilliseconds } from '@sectile/temporal/time-field';
import {
  applyDateTimePickerEvent,
  tryCreateDateTimePickerState,
  type DateTimePickerCommand,
  type DateTimePickerEvent,
  type DateTimePickerPolicies,
  type DateTimePickerState,
} from '@sectile/temporal/date-time-picker';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toDatePickerEvent } from './date-picker.js';

export interface DateTimePickerOptions {
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
  readonly onValueChange?: (value: DateTimeValue | null) => void;
  readonly onHighlightedValueChange?: (value: DateValue) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type DateTimePickerValueChangeHandler = NonNullable<DateTimePickerOptions['onValueChange']>;
export type DateTimePickerHighlightedValueChangeHandler = NonNullable<DateTimePickerOptions['onHighlightedValueChange']>;
export type DateTimePickerOpenChangeHandler = NonNullable<DateTimePickerOptions['onOpenChange']>;
export type DateTimePickerUpdateHandler = NonNullable<DateTimePickerOptions['onUpdate']>;

export interface DateTimePickerControlledValues {
  readonly value?: DateTimeValue | null;
  readonly highlightedValue?: DateValue;
  readonly open?: boolean;
}

export interface DateTimePickerConnection {
  getSnapshot(): RevisionSnapshot<DateTimePickerState>;
  getMonth(): readonly (readonly DateValue[])[];
  syncControlledValues(values: DateTimePickerControlledValues): Result<RevisionSnapshot<DateTimePickerState>>;
  handleEvent(event: DateTimePickerEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createDateTimePicker(
  options: DateTimePickerOptions = {},
): FacadeConnection<DateTimePickerConnection> {
  return unwrap(tryCreateDateTimePicker(options));
}

export function tryCreateDateTimePicker(
  options: DateTimePickerOptions = {},
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
    initial: tryCreateDateTimePickerState({
      ...(requestedValue === undefined ? {} : { value: requestedValue }),
      ...(requestedValue == null && options.policies?.defaultTime !== undefined
        ? { time: options.policies.defaultTime }
        : {}),
      calendar: {
        ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }),
        ...(requestedOpen === undefined ? {} : { open: requestedOpen }),
      },
    }),
    reducer: (state, event) => applyDateTimePickerEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateDateTimePickerState({
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
      if (compareNullable(previous.value, proposed.value) !== 0) options.onValueChange?.(proposed.value);
      if (compareDateValues(previous.calendar.highlighted, proposed.calendar.highlighted) !== 0) {
        options.onHighlightedValueChange?.(proposed.calendar.highlighted);
      }
      if (previous.calendar.open !== proposed.calendar.open) options.onOpenChange?.(proposed.calendar.open);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalDateTimePicker(options, runtime.value, controls) }
    : runtime;
}

class TerminalDateTimePicker implements DateTimePickerConnection {
  readonly options: DateTimePickerOptions;
  readonly runtime: SemanticController<DateTimePickerState, DateTimePickerEvent, DateTimePickerCommand>;
  readonly controls: { value: boolean; highlighted: boolean; open: boolean };

  public constructor(
    options: DateTimePickerOptions,
    runtime: SemanticController<DateTimePickerState, DateTimePickerEvent, DateTimePickerCommand>,
    controls: { value: boolean; highlighted: boolean; open: boolean },
  ) {
    this.options = options;
    this.runtime = runtime;
    this.controls = controls;
  }

  public getSnapshot(): RevisionSnapshot<DateTimePickerState> { return this.runtime.getSnapshot(); }

  public getMonth(): readonly (readonly DateValue[])[] {
    const state = this.getSnapshot().state.calendar;
    return createCalendarMonth(state.view, this.options.policies?.date?.weekStartsOn);
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
    const result = this.runtime.replace(tryCreateDateTimePickerState({
      value: this.controls.value ? values.value as DateTimeValue | null : state.value,
      time: state.time,
      calendar: {
        highlighted,
        view: { year: highlighted.year, month: highlighted.month },
        viewMode: state.calendar.viewMode,
        open: this.controls.open ? values.open as boolean : state.calendar.open,
      },
    }));
    if (result.ok) this.options.onUpdate?.();
    return result;
  }

  public handleEvent(event: DateTimePickerEvent): boolean {
    const result = this.runtime.handle(event);
    if (result.ok) this.options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (input.altKey === true && (input.key === 'up' || input.key === 'down')) {
      const minutes = this.options.policies?.time?.step?.minute ?? 1;
      const adjusted = addTimeMilliseconds(
        this.getSnapshot().state.time,
        minutes * 60_000 * (input.key === 'up' ? 1 : -1),
      );
      return adjusted.ok && this.handleEvent({ type: 'set-time', value: adjusted.value });
    }
    const event = toDatePickerEvent(input);
    return event !== null && typeof event === 'string' && this.handleEvent(event);
  }
}

function compareNullable(left: DateTimeValue | null, right: DateTimeValue | null): number {
  return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateTimeValues(left, right);
}
