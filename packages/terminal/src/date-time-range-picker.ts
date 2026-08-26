import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/temporal/date-field';
import { formatDateTimeRange, type DateTimeRange } from '@sectile/temporal/date-time-field';
import { createDatePickerMonth } from '@sectile/temporal/date-picker';
import { addTimeMilliseconds } from '@sectile/temporal/time-field';
import {
  applyDateTimeRangePickerEvent,
  tryCreateDateTimeRangePickerState,
  type DateTimeRangePickerCommand,
  type DateTimeRangePickerEvent,
  type DateTimeRangePickerPolicies,
  type DateTimeRangePickerState,
} from '@sectile/temporal/date-time-range-picker';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toDatePickerEvent } from './date-picker.js';

export interface DateTimeRangePickerOptions {
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
  syncControlledValues(values: DateTimeRangePickerControlledValues): Result<RevisionSnapshot<DateTimeRangePickerState>>;
  handleEvent(event: DateTimeRangePickerEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createDateTimeRangePicker(
  options: DateTimeRangePickerOptions = {},
): FacadeConnection<DateTimeRangePickerConnection> {
  return unwrap(tryCreateDateTimeRangePicker(options));
}

export function tryCreateDateTimeRangePicker(
  options: DateTimeRangePickerOptions = {},
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
    initial: tryCreateDateTimeRangePickerState({
      ...(requestedValue === undefined ? {} : { value: requestedValue }),
      calendar: {
        ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }),
        ...(requestedOpen === undefined ? {} : { open: requestedOpen }),
      },
    }),
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
      if (previous.calendar.open !== proposed.calendar.open) options.onOpenChange?.(proposed.calendar.open);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalDateTimeRangePicker(options, runtime.value, controls) }
    : runtime;
}

class TerminalDateTimeRangePicker implements DateTimeRangePickerConnection {
  readonly options: DateTimeRangePickerOptions;
  readonly runtime: SemanticController<DateTimeRangePickerState, DateTimeRangePickerEvent, DateTimeRangePickerCommand>;
  readonly controls: { value: boolean; highlighted: boolean; open: boolean };

  public constructor(
    options: DateTimeRangePickerOptions,
    runtime: SemanticController<DateTimeRangePickerState, DateTimeRangePickerEvent, DateTimeRangePickerCommand>,
    controls: { value: boolean; highlighted: boolean; open: boolean },
  ) {
    this.options = options;
    this.runtime = runtime;
    this.controls = controls;
  }

  public getSnapshot(): RevisionSnapshot<DateTimeRangePickerState> { return this.runtime.getSnapshot(); }

  public getMonth(): readonly (readonly DateValue[])[] {
    const state = this.getSnapshot().state.calendar;
    return createDatePickerMonth(state.view, this.options.policies?.date?.weekStartsOn);
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
    if (result.ok) this.options.onUpdate?.();
    return result;
  }

  public handleEvent(event: DateTimeRangePickerEvent): boolean {
    const result = this.runtime.handle(event);
    if (result.ok) this.options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (input.altKey === true && (input.key === 'up' || input.key === 'down')) {
      const endpoint = input.shiftKey === true ? 'end' : 'start';
      const state = this.getSnapshot().state;
      const policies = endpoint === 'start'
        ? this.options.policies?.startTime
        : this.options.policies?.endTime;
      const minutes = policies?.step?.minute ?? 1;
      const adjusted = addTimeMilliseconds(
        endpoint === 'start' ? state.startTime : state.endTime,
        minutes * 60_000 * (input.key === 'up' ? 1 : -1),
      );
      return adjusted.ok && this.handleEvent({
        type: endpoint === 'start' ? 'set-start-time' : 'set-end-time',
        value: adjusted.value,
      });
    }
    const event = toDatePickerEvent(input);
    return event !== null && typeof event === 'string' && this.handleEvent(event);
  }
}

function rangeKey(value: DateTimeRange | null): string {
  return value === null ? '' : formatDateTimeRange(value);
}
