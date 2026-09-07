import { unwrap } from '@sectile/core/result';
import { createTerminalTemporalController, createTerminalTemporalFacadeConnection, type TerminalTemporalController, type TerminalTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, formatDateValue, type DateRange, type DateValue } from '@sectile/temporal/date-field';
import { createCalendarMonth } from '@sectile/temporal/calendar';
import type { DatePickerEvent, DatePickerPolicies } from '@sectile/temporal/date-picker';
import { applyDateRangePickerEvent, tryCreateDateRangePickerState, type DateRangePickerCommand, type DateRangePickerEvent, type DateRangePickerState, type DateRangePickerStateInput } from '@sectile/temporal/date-range-picker';
import { applyMonthRangePickerEvent, tryCreateMonthRangePickerState } from '@sectile/temporal/month-range-picker';
import { applyYearRangePickerEvent, tryCreateYearRangePickerState } from '@sectile/temporal/year-range-picker';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { currentReferenceDate } from './internal/reference-date.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toDatePickerEvent } from './date-picker.js';

type DateRangePickerValueGranularity = 'date' | 'month' | 'year';
interface InternalDateRangePickerOptions extends DateRangePickerOptions { readonly valueGranularity?: DateRangePickerValueGranularity }

export interface DateRangePickerOptions { readonly policies?: DatePickerPolicies; readonly value?: DateRange | null; readonly defaultValue?: DateRange | null; readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly onValueChange?: (value: DateRange | null) => void; readonly onHighlightedValueChange?: (value: DateValue) => void; readonly onOpenChange?: (open: boolean) => void; readonly onUpdate?: () => void; }

export type DateRangePickerValueChangeHandler = NonNullable<DateRangePickerOptions['onValueChange']>;
export type DateRangePickerHighlightedValueChangeHandler = NonNullable<DateRangePickerOptions['onHighlightedValueChange']>;
export type DateRangePickerOpenChangeHandler = NonNullable<DateRangePickerOptions['onOpenChange']>;
export type DateRangePickerUpdateHandler = NonNullable<DateRangePickerOptions['onUpdate']>;
export interface DateRangePickerControlledValues { readonly value?: DateRange | null; readonly highlightedValue?: DateValue; readonly open?: boolean; }
export interface DateRangePickerConnection { getSnapshot(): RevisionSnapshot<DateRangePickerState>; getMonth(): readonly (readonly DateValue[])[]; syncControlledValues(values: DateRangePickerControlledValues): TerminalTemporalResult<RevisionSnapshot<DateRangePickerState>>; handleEvent(event: DateRangePickerEvent): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean; }
export function createDateRangePicker(options: DateRangePickerOptions = {}): FacadeConnection<DateRangePickerConnection> { return unwrap(tryCreateDateRangePicker(options)); }
export function tryCreateDateRangePicker(options: DateRangePickerOptions = {}): TerminalTemporalResult<FacadeConnection<DateRangePickerConnection>> { return createTerminalTemporalFacadeConnection(options, construct); }
function construct(options: DateRangePickerOptions): TerminalTemporalResult<DateRangePickerConnection> {
  const granularity = (options as InternalDateRangePickerOptions).valueGranularity ?? 'date';
  const controls = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted ? options.highlightedValue : options.defaultHighlightedValue;
  const requestedOpen = controls.open ? options.open : options.defaultOpen;
  const initial = tryCreateGranularRangePickerState({ referenceDate: options.referenceDate ?? currentReferenceDate(), ...(requestedValue === undefined ? {} : { value: requestedValue }), calendar: { ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }), ...(requestedOpen === undefined ? {} : { open: requestedOpen }) } }, granularity);
  const policies = { ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) };
  const runtime = createTerminalTemporalController<DateRangePickerState, DateRangePickerEvent, DateRangePickerCommand, DateRangePickerCommand>({ initial, reducer: (state, event) => applyGranularRangePickerEvent(state, event, policies, granularity), reconcile: (previous, proposed) => tryCreateGranularRangePickerState({ value: controls.value ? previous.value : proposed.value, anchor: proposed.anchor, calendar: { ...proposed.calendar, highlighted: controls.highlighted ? previous.calendar.highlighted : proposed.calendar.highlighted, view: controls.highlighted ? previous.calendar.view : proposed.calendar.view, open: controls.open ? previous.calendar.open : proposed.calendar.open } }, granularity), notify: (previous, proposed) => { if (rangeKey(previous.value) !== rangeKey(proposed.value)) options.onValueChange?.(proposed.value); if (compareDateValues(previous.calendar.highlighted, proposed.calendar.highlighted) !== 0) options.onHighlightedValueChange?.(proposed.calendar.highlighted); if (previous.calendar.open !== proposed.calendar.open) options.onOpenChange?.(proposed.calendar.open); }, toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new TerminalDateRangePicker(options, runtime.value, controls, granularity) } : runtime;
}
class TerminalDateRangePicker implements DateRangePickerConnection {
  readonly options: DateRangePickerOptions; readonly runtime: TerminalTemporalController<DateRangePickerState, DateRangePickerEvent, DateRangePickerCommand>; readonly controls: { value: boolean; highlighted: boolean; open: boolean }; readonly granularity: DateRangePickerValueGranularity;
  public constructor(options: DateRangePickerOptions, runtime: TerminalTemporalController<DateRangePickerState, DateRangePickerEvent, DateRangePickerCommand>, controls: { value: boolean; highlighted: boolean; open: boolean }, granularity: DateRangePickerValueGranularity) { this.options = options; this.runtime = runtime; this.controls = controls; this.granularity = granularity; }
  public getSnapshot(): RevisionSnapshot<DateRangePickerState> { return this.runtime.getSnapshot(); } public getMonth(): readonly (readonly DateValue[])[] { const state = this.getSnapshot().state.calendar; return createCalendarMonth(state.view, this.options.policies?.weekStartsOn); }
  public syncControlledValues(values: DateRangePickerControlledValues): TerminalTemporalResult<RevisionSnapshot<DateRangePickerState>> { if (this.controls.value !== (values.value !== undefined) || this.controls.highlighted !== (values.highlightedValue !== undefined) || this.controls.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date range picker values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const highlighted = this.controls.highlighted ? values.highlightedValue as DateValue : state.calendar.highlighted; const result = this.runtime.replace(tryCreateGranularRangePickerState({ value: this.controls.value ? values.value as DateRange | null : state.value, anchor: state.anchor, calendar: { highlighted, view: { year: highlighted.year, month: highlighted.month }, viewMode: state.calendar.viewMode, open: this.controls.open ? values.open as boolean : state.calendar.open } }, this.granularity)); if (result.ok) this.options.onUpdate?.(); return result; }
  public handleEvent(event: DateRangePickerEvent): boolean { const result = this.runtime.handle(event); if (result.ok) this.options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event: DatePickerEvent | null = toDatePickerEvent(input); return event !== null && this.handleEvent(event); }
}
function tryCreateGranularRangePickerState(input: DateRangePickerStateInput, granularity: DateRangePickerValueGranularity): ReturnType<typeof tryCreateDateRangePickerState> { return granularity === 'month' ? tryCreateMonthRangePickerState(input) : granularity === 'year' ? tryCreateYearRangePickerState(input) : tryCreateDateRangePickerState(input); }
function applyGranularRangePickerEvent(state: DateRangePickerState, event: DateRangePickerEvent, policies: DatePickerPolicies, granularity: DateRangePickerValueGranularity): ReturnType<typeof applyDateRangePickerEvent> { return granularity === 'month' ? applyMonthRangePickerEvent(state, event, policies) : granularity === 'year' ? applyYearRangePickerEvent(state, event, policies) : applyDateRangePickerEvent(state, event, policies); }
function rangeKey(value: DateRange | null): string { return value === null ? '' : `${formatDateValue(value.start)}/${formatDateValue(value.end)}`; }
