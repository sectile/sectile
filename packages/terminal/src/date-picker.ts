import { unwrap } from '@sectile/core/result';
import { createTerminalTemporalController, createTerminalTemporalFacadeConnection, type TerminalTemporalController, type TerminalTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/temporal/date-field';
import { createCalendarMonth } from '@sectile/temporal/calendar';
import { applyDatePickerEvent, tryCreateDatePickerState, type DatePickerCommand, type DatePickerEvent, type DatePickerPolicies, type DatePickerState, type DatePickerStateInput } from '@sectile/temporal/date-picker';
import { applyMonthPickerEvent, tryCreateMonthPickerState } from '@sectile/temporal/month-picker';
import { applyYearPickerEvent, tryCreateYearPickerState } from '@sectile/temporal/year-picker';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { currentReferenceDate } from './internal/reference-date.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toPeriodPickerEvent } from './internal/period-picker.js';

type DatePickerValueGranularity = 'date' | 'month' | 'year';
interface InternalDatePickerOptions extends DatePickerOptions { readonly valueGranularity?: DatePickerValueGranularity }

export interface DatePickerOptions { readonly policies?: DatePickerPolicies; readonly value?: DateValue | null; readonly defaultValue?: DateValue | null; readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly onValueChange?: (value: DateValue | null) => void; readonly onHighlightedValueChange?: (value: DateValue) => void; readonly onOpenChange?: (open: boolean) => void; readonly onUpdate?: () => void; }

export type DatePickerValueChangeHandler = NonNullable<DatePickerOptions['onValueChange']>;
export type DatePickerHighlightedValueChangeHandler = NonNullable<DatePickerOptions['onHighlightedValueChange']>;
export type DatePickerOpenChangeHandler = NonNullable<DatePickerOptions['onOpenChange']>;
export type DatePickerUpdateHandler = NonNullable<DatePickerOptions['onUpdate']>;
export interface DatePickerControlledValues { readonly value?: DateValue | null; readonly highlightedValue?: DateValue; readonly open?: boolean; }
export interface DatePickerConnection { getSnapshot(): RevisionSnapshot<DatePickerState>; getMonth(): readonly (readonly DateValue[])[]; syncControlledValues(values: DatePickerControlledValues): TerminalTemporalResult<RevisionSnapshot<DatePickerState>>; handleEvent(event: DatePickerEvent): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean; }
export function createDatePicker(options: DatePickerOptions = {}): FacadeConnection<DatePickerConnection> { return unwrap(tryCreateDatePicker(options)); }
export function tryCreateDatePicker(options: DatePickerOptions = {}): TerminalTemporalResult<FacadeConnection<DatePickerConnection>> { return createTerminalTemporalFacadeConnection(options, construct); }
function construct(options: DatePickerOptions): TerminalTemporalResult<DatePickerConnection> {
  const granularity = (options as InternalDatePickerOptions).valueGranularity ?? 'date';
  const controls = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted ? options.highlightedValue : options.defaultHighlightedValue;
  const requestedOpen = controls.open ? options.open : options.defaultOpen;
  const initial = tryCreateGranularPickerState({ referenceDate: options.referenceDate ?? currentReferenceDate(), ...(requestedValue === undefined ? {} : { value: requestedValue }), ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }), ...(requestedOpen === undefined ? {} : { open: requestedOpen }) }, granularity);
  const policies = { ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) };
  const runtime = createTerminalTemporalController<DatePickerState, DatePickerEvent, DatePickerCommand, DatePickerCommand>({ initial, reducer: (state, event) => applyGranularPickerEvent(state, event, policies, granularity), reconcile: (previous, proposed) => tryCreateGranularPickerState({ value: controls.value ? previous.value : proposed.value, highlighted: controls.highlighted ? previous.highlighted : proposed.highlighted, view: controls.highlighted ? previous.view : proposed.view, viewMode: proposed.viewMode, open: controls.open ? previous.open : proposed.open }, granularity), notify: (previous, proposed) => { if (compareNullable(previous.value, proposed.value) !== 0) options.onValueChange?.(proposed.value); if (compareDateValues(previous.highlighted, proposed.highlighted) !== 0) options.onHighlightedValueChange?.(proposed.highlighted); if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); }, toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new TerminalDatePicker(options, runtime.value, controls, granularity) } : runtime;
}
class TerminalDatePicker implements DatePickerConnection {
  readonly options: DatePickerOptions; readonly runtime: TerminalTemporalController<DatePickerState, DatePickerEvent, DatePickerCommand>; readonly controls: { value: boolean; highlighted: boolean; open: boolean }; readonly granularity: DatePickerValueGranularity; readonly referenceYear: number;
  public constructor(options: DatePickerOptions, runtime: TerminalTemporalController<DatePickerState, DatePickerEvent, DatePickerCommand>, controls: { value: boolean; highlighted: boolean; open: boolean }, granularity: DatePickerValueGranularity) { this.options = options; this.runtime = runtime; this.controls = controls; this.granularity = granularity; this.referenceYear = runtime.getSnapshot().state.highlighted.year; }
  public getSnapshot(): RevisionSnapshot<DatePickerState> { return this.runtime.getSnapshot(); } public getMonth(): readonly (readonly DateValue[])[] { const state = this.getSnapshot().state; return createCalendarMonth(state.view, this.options.policies?.weekStartsOn); }
  public syncControlledValues(values: DatePickerControlledValues): TerminalTemporalResult<RevisionSnapshot<DatePickerState>> { if (this.controls.value !== (values.value !== undefined) || this.controls.highlighted !== (values.highlightedValue !== undefined) || this.controls.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date picker values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const highlighted = this.controls.highlighted ? values.highlightedValue as DateValue : state.highlighted; const result = this.runtime.replace(tryCreateGranularPickerState({ value: this.controls.value ? values.value as DateValue | null : state.value, highlighted, view: { year: highlighted.year, month: highlighted.month }, viewMode: state.viewMode, open: this.controls.open ? values.open as boolean : state.open }, this.granularity)); if (result.ok) this.options.onUpdate?.(); return result; }
  public handleEvent(event: DatePickerEvent | NonNullable<ReturnType<typeof toPeriodPickerEvent>>): boolean { const result = this.runtime.handle(event as DatePickerEvent); if (result.ok) this.options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = this.granularity === 'date' ? keyEvent(input) : toPeriodPickerEvent(input, this.granularity, this.referenceYear); return event !== null && this.handleEvent(event); }
}
function tryCreateGranularPickerState(input: DatePickerStateInput, granularity: DatePickerValueGranularity): ReturnType<typeof tryCreateDatePickerState> { return granularity === 'month' ? tryCreateMonthPickerState(input) : granularity === 'year' ? tryCreateYearPickerState(input) : tryCreateDatePickerState(input); }
function applyGranularPickerEvent(state: DatePickerState, event: DatePickerEvent, policies: DatePickerPolicies, granularity: DatePickerValueGranularity): ReturnType<typeof applyDatePickerEvent> { return granularity === 'month' ? applyMonthPickerEvent(state, event, policies) : granularity === 'year' ? applyYearPickerEvent(state, event, policies) : applyDatePickerEvent(state, event, policies); }
export function toDatePickerEvent(input: TerminalKeyboardInput): DatePickerEvent | null { return keyEvent(input); }
function keyEvent(input: TerminalKeyboardInput): DatePickerEvent | null { if (input.ctrlKey || input.altKey) return null; if (input.key === 'left') return 'previous-day'; if (input.key === 'right') return 'next-day'; if (input.key === 'up') return 'previous-week'; if (input.key === 'down') return 'next-week'; if (input.key === 'home') return 'start-of-week'; if (input.key === 'end') return 'end-of-week'; if (input.key === 'page-up') return input.shiftKey ? 'previous-year' : 'previous-month'; if (input.key === 'page-down') return input.shiftKey ? 'next-year' : 'next-month'; if (input.key === 'enter' || input.key === 'space') return 'select-highlighted'; if (input.key === 'escape') return 'close'; return null; }
function compareNullable(left: DateValue | null, right: DateValue | null): number { return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateValues(left, right); }
