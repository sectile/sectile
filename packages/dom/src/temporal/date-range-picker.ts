import { unwrap, type Result } from '@sectile/core/result';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, dateRangeContains, formatDateValue, parseDateFieldValue, reformatDateFieldState, tryCreateDateFieldState, type DateFieldFormat, type DateFieldState, type DateRange, type DateValue } from '@sectile/temporal/date-field';
import { calendarID, createCalendarMonth, createCalendarWeek, createCalendarYear, isCalendarValueAvailable, type CalendarMonthValue } from '@sectile/temporal/calendar';
import type { DatePickerEvent, DatePickerPolicies } from '@sectile/temporal/date-picker';
import { applyDateRangePickerEvent, tryCreateDateRangePickerState, type DateRangePickerCommand, type DateRangePickerEvent, type DateRangePickerState, type DateRangePickerStateInput } from '@sectile/temporal/date-range-picker';
export type { DatePickerPolicies } from '@sectile/temporal/date-picker';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import {
  setDatePickerCellAvailability,
  setDatePickerCellFocusEntry,
  setDatePickerGridFocusEntry,
} from './internal/date-picker-cell.js';
import type { DOMLayerBindingOptions, DOMLayerPresentationListener, DOMLayerPresentationSubscription, DOMLayerReparentErrorCode } from '../overlay/layer/binding.js';
import { currentReferenceDate } from './internal/reference-date.js';
import type { PickerPositionOptions } from '../overlay/position/picker.js';
import type { PeriodPickerHost, PeriodPickerEvent } from './internal/period-picker.js';
import { createDateField, type DateFieldConnection } from './date-field.js';
import { calendarFocusEvent, PickerPopup, pickerPopupElements, type PickerPopupElements } from './internal/picker-popup.js';
import { pickerFieldFormat, preparePickerFieldState } from './internal/picker-field-options.js';
import { detachedFieldState } from '../text/controlled-input.js';
import { bindTemporalSubmit } from './internal/submit.js';

type Endpoint = 'start' | 'end';
type DateRangeFieldStates = Readonly<Partial<Record<Endpoint, DateFieldState>>>;

type DateRangePickerStateFactory = (input: DateRangePickerStateInput) => ReturnType<typeof tryCreateDateRangePickerState>;
type DateRangePickerReducer = (state: DateRangePickerState, event: DateRangePickerEvent, policies: DatePickerPolicies) => ReturnType<typeof applyDateRangePickerEvent>;
interface InternalDateRangePickerOptions extends DateRangePickerOptions, Partial<PeriodPickerHost<DateRangePickerState>> { readonly stateFactory?: DateRangePickerStateFactory; readonly reducer?: DateRangePickerReducer }

export interface DateRangePickerOptions {
  readonly layerHost?: Exclude<DOMLayerBindingOptions['layerHost'], undefined>;
  readonly format?: DateFieldFormat | undefined;
  readonly defaultFieldStates?: DateRangeFieldStates;
}

export interface DateRangePickerOptions extends PickerPositionOptions, Partial<PickerPopupElements> { readonly defaultState?: DateRangePickerState; readonly startInput?: HTMLInputElement; readonly endInput?: HTMLInputElement; readonly policies?: DatePickerPolicies; readonly value?: DateRange | null; readonly defaultValue?: DateRange | null; readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly label?: string; readonly manageVisibility?: boolean; readonly onValueChange?: (value: DateRange | null) => void; readonly onHighlightedValueChange?: (value: DateValue) => void; readonly onOpenChange?: (open: boolean) => void; readonly onUpdate?: () => void; }

export type DateRangePickerValueChangeHandler = NonNullable<DateRangePickerOptions['onValueChange']>;
export type DateRangePickerHighlightedValueChangeHandler = NonNullable<DateRangePickerOptions['onHighlightedValueChange']>;
export type DateRangePickerOpenChangeHandler = NonNullable<DateRangePickerOptions['onOpenChange']>;
export type DateRangePickerUpdateHandler = NonNullable<DateRangePickerOptions['onUpdate']>;
export interface DateRangePickerControlledValues { readonly value?: DateRange | null; readonly highlightedValue?: DateValue; readonly open?: boolean; }
export interface DateRangePickerConnection {
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
  setPopup(elements: PickerPopupElements | null): void;
  prepareSubmission(): boolean;
  getFieldStates(): DateRangeFieldStates;
  getSnapshot(): RevisionSnapshot<DateRangePickerState>; getMonth(): readonly (readonly DateValue[])[]; getWeek(): readonly DateValue[]; getYear(): readonly (readonly CalendarMonthValue[])[]; syncControlledValues(values: DateRangePickerControlledValues): DOMTemporalResult<RevisionSnapshot<DateRangePickerState>>; setCellAttributes(element: HTMLElement, value: DateValue): void; handleEvent(event: DateRangePickerEvent): boolean; refresh(): void; disconnect(): void;
}
export function createDateRangePicker(options: DateRangePickerOptions): FacadeConnection<DateRangePickerConnection> { return unwrap(tryCreateDateRangePicker(options)); }
export function tryCreateDateRangePicker(options: DateRangePickerOptions): DOMTemporalResult<FacadeConnection<DateRangePickerConnection>> { return createDOMTemporalFacadeConnection(options, construct); }
function construct(options: DateRangePickerOptions): DOMTemporalResult<DateRangePickerConnection> {
  if (options.defaultFieldStates !== undefined) {
    const fields: Partial<Record<Endpoint, DateFieldState>> = {};
    for (const endpoint of ['start', 'end'] as const) {
      const field = options.defaultFieldStates[endpoint];
      if (field === undefined) continue;
      const result = preparePickerFieldState(field, options.format, tryCreateDateFieldState, reformatDateFieldState, Object.hasOwn(options, 'format'));
      if (!result.ok) return result;
      fields[endpoint] = result.value;
    }
    options = { ...options, defaultFieldStates: fields };
  }
  const internal = options as InternalDateRangePickerOptions;
  const stateFactory = internal.stateFactory ?? tryCreateDateRangePickerState;
  const reducer = internal.reducer ?? applyDateRangePickerEvent;
  const controls = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted ? options.highlightedValue : options.defaultHighlightedValue;
  const requestedOpen = controls.open ? options.open : options.defaultOpen;
  const initial = stateFactory({ ...options.defaultState, referenceDate: options.referenceDate ?? currentReferenceDate(), ...(requestedValue === undefined ? {} : { value: requestedValue }), calendar: { ...options.defaultState?.calendar, ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }), ...(requestedOpen === undefined ? {} : { open: requestedOpen }), ...(requestedHighlight !== undefined && options.defaultState !== undefined && compareDateValues(requestedHighlight, options.defaultState.calendar.highlighted) !== 0 ? { view: { year: requestedHighlight.year, month: requestedHighlight.month } } : {}) } });
  const policies = { ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) };
  const runtime = createDOMTemporalController<DateRangePickerState, DateRangePickerEvent, DateRangePickerCommand, DateRangePickerCommand>({ initial, reducer: (state, event) => reducer(state, event, policies), reconcile: (previous, proposed) => stateFactory({ value: controls.value ? previous.value : proposed.value, anchor: proposed.anchor, calendar: { ...proposed.calendar, highlighted: controls.highlighted ? previous.calendar.highlighted : proposed.calendar.highlighted, view: controls.highlighted ? previous.calendar.view : proposed.calendar.view, open: controls.open ? previous.calendar.open : proposed.calendar.open } }), notify: [
    (previous, proposed) => { if (rangeKey(previous.value) !== rangeKey(proposed.value)) options.onValueChange?.(proposed.value); },
    (previous, proposed) => { if (compareDateValues(previous.calendar.highlighted, proposed.calendar.highlighted) !== 0) options.onHighlightedValueChange?.(proposed.calendar.highlighted); },
    (previous, proposed) => { if (previous.calendar.open !== proposed.calendar.open) options.onOpenChange?.(proposed.calendar.open); },
  ], toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new DOMDateRangePicker(options, runtime.value, controls, stateFactory) } : runtime;
}
class DOMDateRangePicker implements DateRangePickerConnection {
  readonly options: DateRangePickerOptions; readonly runtime: DOMTemporalController<DateRangePickerState, DateRangePickerEvent, DateRangePickerCommand>; readonly controls: { value: boolean; highlighted: boolean; open: boolean }; readonly stateFactory: DateRangePickerStateFactory;
  readonly #popup: PickerPopup;
  readonly #fields: Partial<Record<Endpoint, FacadeConnection<DateFieldConnection>>> = {};
  #draft: Record<Endpoint, DateValue | null>;
  #fieldBasis: DateRange | null;
  readonly #startSubmission = bindTemporalSubmit(() => this.prepareSubmission());
  readonly #endSubmission = bindTemporalSubmit(() => this.prepareSubmission());
  #disconnected = false;
  #keyEvent: ReturnType<PeriodPickerHost<DateRangePickerState>['createKeyEvent']> | undefined;
  readonly #trigger = (): void => { if (this.getActive()) this.handleEvent('toggle'); };
  readonly #keydown = (event: KeyboardEvent): void => { if (!this.getActive()) return; const semantic = this.#keyEvent!(event); if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
  readonly #click = (event: MouseEvent): void => { if (!this.getActive()) return; const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-date-picker-id]') : null; const parts = target?.dataset['datePickerId']?.split('-').map(Number); if (target !== null && this.#popup.elements?.grid.contains(target) && parts?.length === 3) this.handleEvent({ type: 'select', value: { year: parts[0] as number, month: parts[1] as number, day: parts[2] as number } }); };
  public constructor(options: DateRangePickerOptions, runtime: DOMTemporalController<DateRangePickerState, DateRangePickerEvent, DateRangePickerCommand>, controls: { value: boolean; highlighted: boolean; open: boolean }, stateFactory: DateRangePickerStateFactory) {
    this.options = options; this.runtime = runtime; this.controls = controls; this.stateFactory = stateFactory;
    this.#fieldBasis = runtime.getSnapshot().state.value;
    this.#draft = { start: this.#fieldBasis?.start ?? null, end: this.#fieldBasis?.end ?? null };
    this.#popup = new PickerPopup(options, {
      readOpen: () => this.getSnapshot().state.calendar.open,
      close: restoreFocus => { this.#handleEvent('close', restoreFocus); },
      trigger: this.#trigger, keydown: this.#keydown, click: this.#click,
      suspend: () => { this.#startSubmission(); this.#endSubmission(); this.#fields.start?.suspend(); this.#fields.end?.suspend(); options.onUpdate?.(); },
      resume: () => { this.#fields.start?.resume(); this.#fields.end?.resume(); this.refresh(); options.onUpdate?.(); },
    });
    try {
      for (const [endpoint, input] of [['start', options.startInput], ['end', options.endInput]] as const) {
        if (input === undefined || input.type === 'hidden') continue;
        const saved = options.defaultFieldStates?.[endpoint];
        if (saved !== undefined) this.#draft[endpoint] = saved.value;
        this.#fields[endpoint] = createDateField({
          input, prepareForm: false, value: this.#draft[endpoint],
          ...pickerFieldFormat(options.format, saved, Object.hasOwn(options, 'format')),
          ...(saved === undefined ? {} : { defaultInputState: detachedFieldState(saved).inputState }),
          ...(options.policies === undefined ? {} : { policies: options.policies }),
          ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
          readOnly: options.readOnly === true || input.readOnly,
          required: options.required ?? false,
          onValueChange: value => this.#commitEndpoint(endpoint, value),
        });
      }
      this.setPopup(pickerPopupElements(options));
      if (!this.getActive()) { this.#fields.start?.suspend(); this.#fields.end?.suspend(); }
    } catch (error) { this.disconnect(); throw error; }
  }
  public getActive(): boolean { return !this.#disconnected && this.#popup.getActive(); }
  public getLayerOrder(): number | null { return this.#popup.getLayerOrder(); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription { return this.#popup.subscribe(listener); }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#popup.reparent(parent); }
  public suspend(): void { this.#popup.suspend(); }
  public resume(): void { this.#popup.resume(); }
  public setPopup(elements: PickerPopupElements | null): void { this.#popup.attach(elements); this.refresh(); }
  public getFieldStates(): DateRangeFieldStates {
    return {
      ...(this.#fields.start === undefined ? {} : { start: detachedFieldState(this.#fields.start.getSnapshot().state) }),
      ...(this.#fields.end === undefined ? {} : { end: detachedFieldState(this.#fields.end.getSnapshot().state) }),
    };
  }
  public prepareSubmission(): boolean {
    if (!this.getActive() || this.options.disabled === true || this.options.readOnly === true) return true;
    const candidate = { ...this.#draft };
    for (const endpoint of ['start', 'end'] as const) {
      const field = this.#fields[endpoint];
      if (field === undefined) continue;
      const { inputState, format } = field.getSnapshot().state;
      if (inputState.composition !== null) return false;
      const text = inputState.snapshot.text;
      if (text.trim() === '') { candidate[endpoint] = null; continue; }
      const parsed = parseDateFieldValue(format === undefined ? text.trim() : text, format);
      if (!parsed.ok) return false;
      candidate[endpoint] = parsed.value;
    }
    if ((candidate.start === null) !== (candidate.end === null)) return false;
    const value = candidate.start === null || candidate.end === null ? null : { start: candidate.start, end: candidate.end };
    if (rangeKey(value) === rangeKey(this.getSnapshot().state.value)) return true;
    return this.handleEvent({ type: 'commit-range', value }) && rangeKey(value) === rangeKey(this.getSnapshot().state.value);
  }
  #commitEndpoint(endpoint: Endpoint, value: DateValue | null): boolean {
    const draft = { ...this.#draft, [endpoint]: value };
    if (draft.start !== null && draft.end !== null || draft.start === null && draft.end === null) {
      const range = draft.start !== null && draft.end !== null ? { start: draft.start, end: draft.end } : null;
      if (rangeKey(range) !== rangeKey(this.getSnapshot().state.value) && !this.handleEvent({ type: 'commit-range', value: range })) return false;
    }
    this.#draft = draft;
    this.#fields[endpoint]?.syncControlledValues({ value });
    return true;
  }
  public getSnapshot(): RevisionSnapshot<DateRangePickerState> { return this.runtime.getSnapshot(); } public getMonth(): readonly (readonly DateValue[])[] { const state = this.getSnapshot().state.calendar; return createCalendarMonth(state.view, this.options.policies?.weekStartsOn); } public getWeek(): readonly DateValue[] { const state = this.getSnapshot().state.calendar; return createCalendarWeek(state.highlighted, this.options.policies?.weekStartsOn); } public getYear(): readonly (readonly CalendarMonthValue[])[] { return createCalendarYear(this.getSnapshot().state.calendar.view.year); }
  public syncControlledValues(values: DateRangePickerControlledValues): DOMTemporalResult<RevisionSnapshot<DateRangePickerState>> { if (this.controls.value !== (values.value !== undefined) || this.controls.highlighted !== (values.highlightedValue !== undefined) || this.controls.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date range picker values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const highlighted = this.controls.highlighted ? values.highlightedValue as DateValue : state.calendar.highlighted; const result = this.runtime.replace(this.stateFactory({ value: this.controls.value ? values.value as DateRange | null : state.value, anchor: state.anchor, calendar: { highlighted, view: { year: highlighted.year, month: highlighted.month }, viewMode: state.calendar.viewMode, open: this.controls.open ? values.open as boolean : state.calendar.open } })); if (result.ok) { this.refresh(); this.options.onUpdate?.(); } return result; }
  public setCellAttributes(element: HTMLElement, value: DateValue): void {
    const state = this.getSnapshot().state;
    const project = (this.options as InternalDateRangePickerOptions).projectCell;
    if (project !== undefined) { project(element, value, state, this.options.policies); return; }
    element.setAttribute('role', 'gridcell');
    element.dataset['datePickerId'] = calendarID(value);
    element.setAttribute('aria-selected', String((state.value !== null && dateRangeContains(state.value, value)) || (state.anchor !== null && compareDateValues(state.anchor, value) === 0)));
    const available = isCalendarValueAvailable(value, this.options.policies);
    setDatePickerCellAvailability(element, available);
    setDatePickerCellFocusEntry(element, available, compareDateValues(state.calendar.highlighted, value) === 0);
  }
  public handleEvent(event: DateRangePickerEvent | PeriodPickerEvent): boolean {
    return this.#handleEvent(event, true);
  }
  #handleEvent(event: DateRangePickerEvent | PeriodPickerEvent, restoreFocus: boolean): boolean {
    const result = this.runtime.handle(event as DateRangePickerEvent);
    if (result.ok) {
      this.refresh(); this.options.onUpdate?.();
      if (this.getActive()) {
        const open = result.commands.find(command => command.type === 'open-changed')?.open;
        if (restoreFocus && open === false && !this.getSnapshot().state.calendar.open) this.#popup.focusTrigger();
        else if (open === true || calendarFocusEvent(event) && result.commands.some(command => command.type === 'highlight-changed')) this.#popup.focusGrid();
      }
    }
    return result.ok;
  }
  public refresh(): void {
    if (this.#disconnected) return;
    const state = this.getSnapshot().state;
    this.#keyEvent ??= (this.options as InternalDateRangePickerOptions).createKeyEvent?.(state.calendar.highlighted.year) ?? keyEvent;
    const grid = this.#popup.elements?.grid;
    if (grid !== undefined && (this.options as InternalDateRangePickerOptions).projectCell === undefined) setDatePickerGridFocusEntry(grid, isCalendarValueAvailable(state.calendar.highlighted, this.options.policies));
    if (rangeKey(this.#fieldBasis) !== rangeKey(state.value)) {
      this.#fieldBasis = state.value;
      this.#draft = { start: state.value?.start ?? null, end: state.value?.end ?? null };
      this.#fields.start?.syncControlledValues({ value: this.#draft.start });
      this.#fields.end?.syncControlledValues({ value: this.#draft.end });
    }
    if (this.options.startInput?.type === 'hidden') this.options.startInput.value = state.value === null ? '' : formatDateValue(state.value.start);
    if (this.options.endInput?.type === 'hidden') this.options.endInput.value = state.value === null ? '' : formatDateValue(state.value.end);
    if (this.getActive()) {
      const start = this.options.startInput?.form ?? null, end = this.options.endInput?.form ?? null;
      this.#startSubmission(start);
      this.#endSubmission(end === start ? null : end);
    }
    this.#popup.refresh();
  }
  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    let failed = false, failure: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; failure = error; } } };
    drain(() => this.#popup.disconnect()); drain(() => this.#fields.start?.disconnect()); drain(() => this.#fields.end?.disconnect());
    this.#startSubmission(); this.#endSubmission();
    if (failed) throw failure;
  }
}
function keyEvent(event: KeyboardEvent): DatePickerEvent | null { if (event.altKey || event.ctrlKey || event.metaKey) return null; if (event.key === 'ArrowLeft') return 'previous-day'; if (event.key === 'ArrowRight') return 'next-day'; if (event.key === 'ArrowUp') return 'previous-week'; if (event.key === 'ArrowDown') return 'next-week'; if (event.key === 'Home') return 'start-of-week'; if (event.key === 'End') return 'end-of-week'; if (event.key === 'PageUp') return event.shiftKey ? 'previous-year' : 'previous-month'; if (event.key === 'PageDown') return event.shiftKey ? 'next-year' : 'next-month'; if (event.key === 'Enter' || event.key === ' ') return 'select-highlighted'; if (event.key === 'Escape') return 'close'; return null; }
function rangeKey(value: DateRange | null): string { return value === null ? '' : `${formatDateValue(value.start)}/${formatDateValue(value.end)}`; }
