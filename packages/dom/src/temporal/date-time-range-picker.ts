import { unwrap, type Result } from '@sectile/core/result';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/temporal/date-field';
import { formatDateTimeRange, formatDateTimeValue, type DateTimeRange } from '@sectile/temporal/date-time-field';
import { calendarID, createCalendarMonth, createCalendarWeek, createCalendarYear, isCalendarValueAvailable, type CalendarMonthValue } from '@sectile/temporal/calendar';
import {
  applyDateTimeRangePickerEvent,
  tryCreateDateTimeRangePickerState,
  type DateTimeRangePickerCommand,
  type DateTimeRangePickerEvent,
  type DateTimeRangePickerPolicies,
  type DateTimeRangePickerState,
} from '@sectile/temporal/date-time-range-picker';
export type { DateTimeRangePickerPolicies } from '@sectile/temporal/date-time-range-picker';
import { type TimeValue } from '@sectile/temporal/time-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from '../interaction/attributes.js';
import {
  focusDatePickerEntry,
  setDatePickerCellAvailability,
  setDatePickerCellFocusEntry,
  setDatePickerGridFocusEntry,
} from './internal/date-picker-cell.js';
import { createDOMLayerBinding, type DOMLayerBinding, type DOMLayerBindingOptions, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription, type DOMLayerReparentErrorCode } from '../overlay/layer/binding.js';
import { createDateField, type DateFieldConnection } from './date-field.js';
import { createTimeField, type TimeFieldConnection } from './time-field.js';
import { currentReferenceDate } from './internal/reference-date.js';
import { createPickerPosition, type PickerPositionOptions } from '../overlay/position/picker.js';
import type { PositionConnection } from '../overlay/position/connection.js';
import { createHiddenBinding, type HiddenBinding } from '../interaction/visibility.js';
import { detachedFieldState } from '../text/controlled-input.js';
import { pickerFieldFormat, preparePickerFieldState } from './internal/picker-field-options.js';
import { tryCreateDateFieldState, reformatDateFieldState, type DateFieldState, type DateFieldFormat } from '@sectile/temporal/date-field';
import { tryCreateTimeFieldState, reformatTimeFieldState, type TimeFieldState, type TimeFieldFormat } from '@sectile/temporal/time-field';

export interface DateTimeRangePickerOptions extends PickerPositionOptions {
  readonly layerHost?: Exclude<DOMLayerBindingOptions['layerHost'], undefined>;
  readonly defaultState?: DateTimeRangePickerState;
  readonly defaultFieldStates?: Readonly<{ startDate?: DateFieldState; endDate?: DateFieldState; startTime?: TimeFieldState; endTime?: TimeFieldState }>;
  readonly root: HTMLElement;
  readonly grid: HTMLElement;
  readonly trigger: HTMLElement;
  readonly startDateTimeInput?: HTMLInputElement;
  readonly endDateTimeInput?: HTMLInputElement;
  readonly startDateInput?: HTMLInputElement;
  readonly endDateInput?: HTMLInputElement;
  readonly startTimeInput?: HTMLInputElement;
  readonly endTimeInput?: HTMLInputElement;
  readonly dateFormat?: DateFieldFormat | undefined;
  readonly timeFormat?: TimeFieldFormat | undefined;
  readonly policies?: DateTimeRangePickerPolicies;
  readonly value?: DateTimeRange | null;
  readonly defaultValue?: DateTimeRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly referenceDate?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly manageVisibility?: boolean;
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
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
  getSnapshot(): RevisionSnapshot<DateTimeRangePickerState>;
  getFieldStates(): NonNullable<DateTimeRangePickerOptions['defaultFieldStates']>;
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly CalendarMonthValue[])[];
  syncControlledValues(values: DateTimeRangePickerControlledValues): DOMTemporalResult<RevisionSnapshot<DateTimeRangePickerState>>;
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
): DOMTemporalResult<FacadeConnection<DateTimeRangePickerConnection>> {
  return createDOMTemporalFacadeConnection(options, construct);
}

function construct(options: DateTimeRangePickerOptions): DOMTemporalResult<DateTimeRangePickerConnection> {
  const fields = options.defaultFieldStates;
  const startDate = preparePickerFieldState(fields?.startDate, options.dateFormat, tryCreateDateFieldState, reformatDateFieldState, Object.hasOwn(options, 'dateFormat')); if (!startDate.ok) return startDate;
  const endDate = preparePickerFieldState(fields?.endDate, options.dateFormat, tryCreateDateFieldState, reformatDateFieldState, Object.hasOwn(options, 'dateFormat')); if (!endDate.ok) return endDate;
  const startTime = preparePickerFieldState(fields?.startTime, options.timeFormat, tryCreateTimeFieldState, reformatTimeFieldState, Object.hasOwn(options, 'timeFormat')); if (!startTime.ok) return startTime;
  const endTime = preparePickerFieldState(fields?.endTime, options.timeFormat, tryCreateTimeFieldState, reformatTimeFieldState, Object.hasOwn(options, 'timeFormat')); if (!endTime.ok) return endTime;
  if (fields !== undefined) options = { ...options, defaultFieldStates: {
    ...(fields.startDate === undefined ? {} : { startDate: startDate.value }), ...(fields.endDate === undefined ? {} : { endDate: endDate.value }),
    ...(fields.startTime === undefined ? {} : { startTime: startTime.value }), ...(fields.endTime === undefined ? {} : { endTime: endTime.value }),
  } };
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
    ...options.defaultState,
    referenceDate: options.referenceDate ?? currentReferenceDate(),
    ...(requestedValue === undefined ? {} : { value: requestedValue }),
    calendar: {
      ...options.defaultState?.calendar,
      ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }),
      ...(requestedHighlight !== undefined && options.defaultState !== undefined && compareDateValues(requestedHighlight, options.defaultState.calendar.highlighted) !== 0 ? { view: { year: requestedHighlight.year, month: requestedHighlight.month } } : {}),
      ...(requestedOpen === undefined ? {} : { open: requestedOpen }),
    },
  });
  const policies = Object.freeze({
    ...options.policies,
    ...(options.required === undefined ? {} : { required: options.required }),
  });
  const runtime = createDOMTemporalController<
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
    notify: [
      (previous, proposed) => {
        if (rangeKey(previous.value) !== rangeKey(proposed.value)) options.onValueChange?.(proposed.value);
      },
      (previous, proposed) => {
        if (compareDateValues(previous.calendar.highlighted, proposed.calendar.highlighted) !== 0) {
          options.onHighlightedValueChange?.(proposed.calendar.highlighted);
        }
      },
      (previous, proposed) => {
        if (previous.calendar.open !== proposed.calendar.open) {
          options.onOpenChange?.(proposed.calendar.open);
        }
      },
    ],
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMDateTimeRangePicker(options, runtime.value, controls) }
    : runtime;
}

class DOMDateTimeRangePicker implements DateTimeRangePickerConnection {
  readonly options: DateTimeRangePickerOptions;
  readonly runtime: DOMTemporalController<DateTimeRangePickerState, DateTimeRangePickerEvent, DateTimeRangePickerCommand>;
  readonly controls: { value: boolean; highlighted: boolean; open: boolean };
  readonly #startTimeField: FacadeConnection<TimeFieldConnection> | null;
  readonly #endTimeField: FacadeConnection<TimeFieldConnection> | null;
  readonly #startDateField: FacadeConnection<DateFieldConnection> | null;
  readonly #endDateField: FacadeConnection<DateFieldConnection> | null;
  readonly #layer: DOMLayerBinding;
  readonly #position: PositionConnection;
  readonly #visibility: HiddenBinding | undefined;
  #syncingFields = false;
  #disconnected = false;
  #focusGeneration = 0;
  readonly #trigger = (): void => { if (this.getActive()) this.handleEvent('toggle'); };
  readonly #keydown = (event: KeyboardEvent): void => {
    if (!this.getActive()) return;
    const semantic = keyEvent(event);
    if (semantic !== null) {
      event.preventDefault();
      this.handleEvent(semantic);
    }
  };
  readonly #click = (event: MouseEvent): void => {
    if (!this.getActive()) return;
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
    runtime: DOMTemporalController<DateTimeRangePickerState, DateTimeRangePickerEvent, DateTimeRangePickerCommand>,
    controls: { value: boolean; highlighted: boolean; open: boolean },
  ) {
    this.options = options;
    this.runtime = runtime;
    this.controls = controls;
    const manageVisibility = options.manageVisibility;
    this.#visibility = manageVisibility === false ? undefined : createHiddenBinding(options.root);
    this.#layer = createDOMLayerBinding({ surface: options.root, owner: options.trigger, ...(options.layerHost === undefined ? {} : { layerHost: options.layerHost }), dismissOnInteractOutside: true, readOpen: () => this.getSnapshot().state.calendar.open, close: () => { this.handleEvent('close'); }, presentation: { suspend: () => this.#suspendResources(), resume: () => this.#resumeResources() } });
    this.#position = createPickerPosition(options.root, options.trigger, options);
    const state = runtime.getSnapshot().state;
    this.#startDateField = options.startDateInput === undefined ? null : createDateField({
      input: options.startDateInput,
      ...pickerFieldFormat(options.dateFormat, options.defaultFieldStates?.startDate, Object.hasOwn(options, 'dateFormat')),
      value: options.defaultFieldStates?.startDate === undefined ? state.value?.start.date ?? null : options.defaultFieldStates.startDate.value,
      ...(options.defaultFieldStates?.startDate === undefined ? {} : { defaultInputState: detachedFieldState(options.defaultFieldStates.startDate).inputState }),
      ...(options.policies?.date === undefined ? {} : { policies: options.policies.date }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) return this.handleEvent({ type: 'set-start-date', value });
        return true;
      },
    });
    this.#endDateField = options.endDateInput === undefined ? null : createDateField({
      input: options.endDateInput,
      ...pickerFieldFormat(options.dateFormat, options.defaultFieldStates?.endDate, Object.hasOwn(options, 'dateFormat')),
      value: options.defaultFieldStates?.endDate === undefined ? state.value?.end.date ?? null : options.defaultFieldStates.endDate.value,
      ...(options.defaultFieldStates?.endDate === undefined ? {} : { defaultInputState: detachedFieldState(options.defaultFieldStates.endDate).inputState }),
      ...(options.policies?.date === undefined ? {} : { policies: options.policies.date }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) return this.handleEvent({ type: 'set-end-date', value });
        return true;
      },
    });
    this.#startTimeField = options.startTimeInput === undefined ? null : createTimeField({
      input: options.startTimeInput,
      ...pickerFieldFormat(options.timeFormat, options.defaultFieldStates?.startTime, Object.hasOwn(options, 'timeFormat')),
      value: options.defaultFieldStates?.startTime === undefined ? state.startTime : options.defaultFieldStates.startTime.value,
      ...(options.defaultFieldStates?.startTime === undefined ? {} : { defaultInputState: detachedFieldState(options.defaultFieldStates.startTime).inputState }),
      ...(options.policies?.startTime === undefined ? {} : { policies: options.policies.startTime }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) return this.handleEvent({ type: 'set-start-time', value });
        return true;
      },
    });
    this.#endTimeField = options.endTimeInput === undefined ? null : createTimeField({
      input: options.endTimeInput,
      ...pickerFieldFormat(options.timeFormat, options.defaultFieldStates?.endTime, Object.hasOwn(options, 'timeFormat')),
      value: options.defaultFieldStates?.endTime === undefined ? state.endTime : options.defaultFieldStates.endTime.value,
      ...(options.defaultFieldStates?.endTime === undefined ? {} : { defaultInputState: detachedFieldState(options.defaultFieldStates.endTime).inputState }),
      ...(options.policies?.endTime === undefined ? {} : { policies: options.policies.endTime }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      required: true,
      onValueChange: (value) => {
        if (!this.#syncingFields && value !== null) return this.handleEvent({ type: 'set-end-time', value });
        return true;
      },
    });
    this.#bindNative();
    options.root.setAttribute('role', 'dialog');
    options.root.setAttribute('aria-modal', 'false');
    options.grid.setAttribute('role', 'grid');
    setInteractionAttributes(options.trigger, options, true);
    setInteractionAttributes(options.grid, options);
    this.refresh();
    if (options.layerHost === null || options.layerHost?.active === false) this.suspend();
  }

  public getActive(): boolean { return !this.#disconnected && this.#layer.getActive(); }
  public getLayerOrder(): number | null { return this.#layer.getLayerOrder(); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription { return this.#layer.subscribeLayerPresentation(listener); }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#layer.syncLayerParent(parent); }
  public suspend(): void { this.#layer.suspend(); }
  public resume(): void { this.#layer.resume(); }
  public getSnapshot(): RevisionSnapshot<DateTimeRangePickerState> { return this.runtime.getSnapshot(); }
  public getFieldStates(): NonNullable<DateTimeRangePickerOptions['defaultFieldStates']> {
    return Object.freeze({
      ...(this.#startDateField === null ? {} : { startDate: detachedFieldState(this.#startDateField.getSnapshot().state) }),
      ...(this.#endDateField === null ? {} : { endDate: detachedFieldState(this.#endDateField.getSnapshot().state) }),
      ...(this.#startTimeField === null ? {} : { startTime: detachedFieldState(this.#startTimeField.getSnapshot().state) }),
      ...(this.#endTimeField === null ? {} : { endTime: detachedFieldState(this.#endTimeField.getSnapshot().state) }),
    });
  }

  public getMonth(): readonly (readonly DateValue[])[] {
    const state = this.getSnapshot().state.calendar;
    return createCalendarMonth(state.view, this.options.policies?.date?.weekStartsOn);
  }

  public getWeek(): readonly DateValue[] {
    const state = this.getSnapshot().state.calendar;
    return createCalendarWeek(state.highlighted, this.options.policies?.date?.weekStartsOn);
  }

  public getYear(): readonly (readonly CalendarMonthValue[])[] {
    return createCalendarYear(this.getSnapshot().state.calendar.view.year);
  }

  public syncControlledValues(
    values: DateTimeRangePickerControlledValues,
  ): DOMTemporalResult<RevisionSnapshot<DateTimeRangePickerState>> {
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
    element.dataset['datePickerId'] = calendarID(value);
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-selected', String(isSelected(state, value)));
    const available = isCalendarValueAvailable(value, this.options.policies?.date);
    setDatePickerCellAvailability(element, available);
    setDatePickerCellFocusEntry(element, available, compareDateValues(state.calendar.highlighted, value) === 0);
  }

  public handleEvent(event: DateTimeRangePickerEvent): boolean {
    const result = this.runtime.handle(event);
    if (result.ok) {
      this.refresh();
      this.options.onUpdate?.();
      if (this.getActive() && !this.getSnapshot().state.calendar.open && result.commands.some((command) => command.type === 'open-changed' && !command.open)) {
        this.options.trigger.focus();
      } else if (this.getActive() && result.commands.some((command) => command.type === 'highlight-changed')) {
        const generation = this.#focusGeneration;
        queueMicrotask(() => { if (this.getActive() && generation === this.#focusGeneration) focusDatePickerEntry(this.options.grid); });
      }
    }
    return result.ok;
  }

  public refresh(): void {
    if (this.#disconnected) return;
    const state = this.getSnapshot().state;
    setDatePickerGridFocusEntry(
      this.options.grid,
      isCalendarValueAvailable(state.calendar.highlighted, this.options.policies?.date),
    );
    this.#visibility?.setHidden(!this.getActive() || !state.calendar.open);
    this.options.trigger.setAttribute('aria-haspopup', 'dialog');
    this.options.trigger.setAttribute('aria-expanded', String(state.calendar.open));
    if (this.options.label !== undefined) this.options.grid.setAttribute('aria-label', this.options.label);
    for (const [input, value] of [
      [this.options.startDateTimeInput, state.value?.start],
      [this.options.endDateTimeInput, state.value?.end],
    ] as const) {
      if (input !== undefined) {
        input.value = value === undefined ? '' : formatDateTimeValue(value);
        setInteractionAttributes(input, this.options, true);
        input.readOnly = true;
        input.setAttribute('aria-readonly', 'true');
      }
    }
    this.#syncingFields = true;
    try {
      syncDateField(this.#startDateField, state.value?.start.date ?? null);
      syncDateField(this.#endDateField, state.value?.end.date ?? null);
      syncTimeField(this.#startTimeField, state.startTime);
      syncTimeField(this.#endTimeField, state.endTime);
    } finally { this.#syncingFields = false; }
    this.#layer.sync();
    if (this.getActive()) this.#position.update();
  }

  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    let failed = false, failure: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; failure = error; } } };
    drain(() => this.#layer.disconnect()); drain(() => this.#position.disconnect()); drain(() => this.#visibility?.disconnect());
    for (const field of [this.#startDateField, this.#endDateField, this.#startTimeField, this.#endTimeField]) drain(() => field?.disconnect());
    this.#unbindNative(); if (failed) throw failure;
  }
  #bindNative(): void {
    this.options.trigger.addEventListener('click', this.#trigger);
    this.options.grid.addEventListener('keydown', this.#keydown);
    this.options.grid.addEventListener('click', this.#click);
  }
  #unbindNative(): void {
    this.options.trigger.removeEventListener('click', this.#trigger);
    this.options.grid.removeEventListener('keydown', this.#keydown);
    this.options.grid.removeEventListener('click', this.#click);
  }
  #suspendResources(): void {
    this.#focusGeneration += 1; this.#unbindNative();
    let failed = false, failure: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; failure = error; } } };
    for (const field of [this.#startDateField, this.#endDateField, this.#startTimeField, this.#endTimeField]) drain(() => field?.suspend());
    drain(() => this.#position.disconnect());
    if (!this.#disconnected) drain(() => this.#visibility?.setHidden(true));
    drain(() => this.options.onUpdate?.()); if (failed) throw failure;
  }
  #resumeResources(): void {
    this.#bindNative();
    for (const field of [this.#startDateField, this.#endDateField, this.#startTimeField, this.#endTimeField]) field?.resume();
    this.refresh(); this.options.onUpdate?.();
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
    field.syncControlledValues({ value });
  }
}

function syncDateField(field: FacadeConnection<DateFieldConnection> | null, value: DateValue | null): void {
  if (field === null) return;
  const current = field.getValue();
  if (current === null ? value !== null : value === null || compareDateValues(current, value) !== 0) {
    field.syncControlledValues({ value });
  }
}

function rangeKey(value: DateTimeRange | null): string {
  return value === null ? '' : formatDateTimeRange(value);
}
