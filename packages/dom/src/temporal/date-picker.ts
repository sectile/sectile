import { unwrap, type Result } from '@sectile/core/result';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { compareDateValues, type DateValue } from '@sectile/temporal/date-field';
import { calendarID, createCalendarMonth, createCalendarWeek, createCalendarYear, isCalendarValueAvailable, type CalendarMonthValue } from '@sectile/temporal/calendar';
import { applyDatePickerEvent, tryCreateDatePickerState, type DatePickerCommand, type DatePickerEvent, type DatePickerPolicies, type DatePickerState, type DatePickerStateInput } from '@sectile/temporal/date-picker';
export { calendarID, createCalendarMonth, createCalendarWeek, createCalendarYear, isCalendarValueAvailable } from '@sectile/temporal/calendar';
export type { CalendarMonthValue, CalendarViewMode } from '@sectile/temporal/calendar';
export type { DatePickerPolicies } from '@sectile/temporal/date-picker';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from '../interaction/attributes.js';
import {
  focusDatePickerEntry,
  setDatePickerCellAvailability,
  setDatePickerCellFocusEntry,
  setDatePickerGridFocusEntry,
} from './internal/date-picker-cell.js';
import { createDateField, type DateFieldConnection } from './date-field.js';
import { createDOMLayerBinding, type DOMLayerBinding, type DOMLayerBindingOptions, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription, type DOMLayerReparentErrorCode } from '../overlay/layer/binding.js';
import { currentReferenceDate } from './internal/reference-date.js';
import { createPickerPosition, type PickerPositionOptions } from '../overlay/position/picker.js';
import type { PositionConnection } from '../overlay/position/connection.js';
import { createHiddenBinding, type HiddenBinding } from '../interaction/visibility.js';
import { detachedFieldState } from '../text/controlled-input.js';
import { pickerFieldFormat, preparePickerFieldState } from './internal/picker-field-options.js';
import { tryCreateDateFieldState, reformatDateFieldState, type DateFieldState, type DateFieldFormat } from '@sectile/temporal/date-field';
import type { PeriodPickerHost, PeriodPickerEvent } from './internal/period-picker.js';

export type { PickerPositionOptions } from '../overlay/position/picker.js';

type DatePickerStateFactory = (input: DatePickerStateInput) => ReturnType<typeof tryCreateDatePickerState>;
type DatePickerReducer = (state: DatePickerState, event: DatePickerEvent, policies: DatePickerPolicies) => ReturnType<typeof applyDatePickerEvent>;
interface InternalDatePickerOptions extends DatePickerOptions, Partial<PeriodPickerHost<DatePickerState>> { readonly stateFactory?: DatePickerStateFactory; readonly reducer?: DatePickerReducer }

export interface DatePickerOptions extends PickerPositionOptions {
  readonly layerHost?: Exclude<DOMLayerBindingOptions['layerHost'], undefined>;
  readonly defaultState?: DatePickerState;
  readonly defaultFieldStates?: Readonly<{ input?: DateFieldState }>;
  readonly root: HTMLElement;
  readonly grid: HTMLElement;
  readonly trigger: HTMLElement;
  readonly input?: HTMLInputElement;
  readonly format?: DateFieldFormat | undefined;
  readonly policies?: DatePickerPolicies;
  readonly value?: DateValue | null;
  readonly defaultValue?: DateValue | null;
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
  readonly onValueChange?: (value: DateValue | null) => void;
  readonly onHighlightedValueChange?: (value: DateValue) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type DatePickerValueChangeHandler = NonNullable<DatePickerOptions['onValueChange']>;
export type DatePickerHighlightedValueChangeHandler = NonNullable<DatePickerOptions['onHighlightedValueChange']>;
export type DatePickerOpenChangeHandler = NonNullable<DatePickerOptions['onOpenChange']>;
export type DatePickerUpdateHandler = NonNullable<DatePickerOptions['onUpdate']>;
export interface DatePickerControlledValues { readonly value?: DateValue | null; readonly highlightedValue?: DateValue; readonly open?: boolean; }
export interface DatePickerConnection {
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
  getSnapshot(): RevisionSnapshot<DatePickerState>;
  getFieldStates(): NonNullable<DatePickerOptions['defaultFieldStates']>;
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly CalendarMonthValue[])[];
  syncControlledValues(values: DatePickerControlledValues): DOMTemporalResult<RevisionSnapshot<DatePickerState>>;
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: DatePickerEvent): boolean;
  refresh(): void;
  disconnect(): void;
}
export function createDatePicker(options: DatePickerOptions): FacadeConnection<DatePickerConnection> { return unwrap(tryCreateDatePicker(options)); }
export function tryCreateDatePicker(options: DatePickerOptions): DOMTemporalResult<FacadeConnection<DatePickerConnection>> { return createDOMTemporalFacadeConnection(options, construct); }
function construct(options: DatePickerOptions): DOMTemporalResult<DatePickerConnection> {
  if (options.defaultFieldStates?.input !== undefined) {
    const field = options.defaultFieldStates.input;
    const reformatted = preparePickerFieldState(field, options.format, tryCreateDateFieldState, reformatDateFieldState, Object.hasOwn(options, 'format'));
    if (!reformatted.ok) return reformatted;
    options = { ...options, defaultFieldStates: { ...options.defaultFieldStates, input: reformatted.value } };
  } else if (options.format !== undefined) {
    const valid = tryCreateDateFieldState(null, undefined, options.format);
    if (!valid.ok) return valid;
  }
  const internal = options as InternalDatePickerOptions;
  const stateFactory = internal.stateFactory ?? tryCreateDatePickerState;
  const reducer = internal.reducer ?? applyDatePickerEvent;
  const controls = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const requestedValue = controls.value ? options.value : options.defaultValue;
  const requestedHighlight = controls.highlighted ? options.highlightedValue : options.defaultHighlightedValue;
  const requestedOpen = controls.open ? options.open : options.defaultOpen;
  const initial = stateFactory({ ...options.defaultState, referenceDate: options.referenceDate ?? currentReferenceDate(), ...(requestedValue === undefined ? {} : { value: requestedValue }), ...(requestedHighlight === undefined ? {} : { highlighted: requestedHighlight }), ...(requestedOpen === undefined ? {} : { open: requestedOpen }), ...(requestedHighlight !== undefined && options.defaultState !== undefined && compareDateValues(requestedHighlight, options.defaultState.highlighted) !== 0 ? { view: { year: requestedHighlight.year, month: requestedHighlight.month } } : {}) });
  const policies = { ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) };
  const runtime = createDOMTemporalController<DatePickerState, DatePickerEvent, DatePickerCommand, DatePickerCommand>({ initial, reducer: (state, event) => reducer(state, event, policies), reconcile: (previous, proposed) => stateFactory({ value: controls.value ? previous.value : proposed.value, highlighted: controls.highlighted ? previous.highlighted : proposed.highlighted, open: controls.open ? previous.open : proposed.open, view: controls.highlighted ? previous.view : proposed.view, viewMode: proposed.viewMode }), notify: [
    (previous, proposed) => { if (compareNullable(previous.value, proposed.value) !== 0) options.onValueChange?.(proposed.value); },
    (previous, proposed) => { if (compareDateValues(previous.highlighted, proposed.highlighted) !== 0) options.onHighlightedValueChange?.(proposed.highlighted); },
    (previous, proposed) => { if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); },
  ], toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new DOMDatePicker(options, runtime.value, controls, stateFactory) } : runtime;
}
class DOMDatePicker implements DatePickerConnection {
  readonly options: DatePickerOptions; readonly runtime: DOMTemporalController<DatePickerState, DatePickerEvent, DatePickerCommand>; readonly controls: { value: boolean; highlighted: boolean; open: boolean }; readonly stateFactory: DatePickerStateFactory;
  readonly #field: FacadeConnection<DateFieldConnection> | null;
  readonly #layer: DOMLayerBinding;
  readonly #position: PositionConnection;
  readonly #visibility: HiddenBinding | undefined;
  #syncingField = false;
  #disconnected = false;
  #focusGeneration = 0;
  readonly #keyEvent: ReturnType<PeriodPickerHost<DatePickerState>['createKeyEvent']>;
  readonly #trigger = (): void => { if (this.getActive()) this.handleEvent('toggle'); };
  readonly #keydown = (event: KeyboardEvent): void => { if (!this.getActive()) return; const semantic = this.#keyEvent(event); if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
  readonly #click = (event: MouseEvent): void => { if (!this.getActive()) return; const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-date-picker-id]') : null; if (target !== null && this.options.grid.contains(target)) { const parsed = target.dataset['datePickerId']?.split('-').map(Number); if (parsed?.length === 3) this.handleEvent({ type: 'select', value: { year: parsed[0] as number, month: parsed[1] as number, day: parsed[2] as number } }); } };
  public constructor(options: DatePickerOptions, runtime: DOMTemporalController<DatePickerState, DatePickerEvent, DatePickerCommand>, controls: { value: boolean; highlighted: boolean; open: boolean }, stateFactory: DatePickerStateFactory) {
    this.options = options;
    this.runtime = runtime;
    this.#keyEvent = (options as InternalDatePickerOptions).createKeyEvent?.(runtime.getSnapshot().state.highlighted.year) ?? keyEvent;
    this.controls = controls;
    this.stateFactory = stateFactory;
    const manageVisibility = options.manageVisibility;
    this.#visibility = manageVisibility === false ? undefined : createHiddenBinding(options.root);
    this.#layer = createDOMLayerBinding({ surface: options.root, owner: options.trigger, ...(options.layerHost === undefined ? {} : { layerHost: options.layerHost }), dismissOnInteractOutside: true, readOpen: () => this.getSnapshot().state.open, close: () => { this.handleEvent('close'); }, presentation: { suspend: () => this.#suspendResources(), resume: () => this.#resumeResources() } });
    this.#position = createPickerPosition(options.root, options.trigger, options);
    this.#field = options.input === undefined ? null : createDateField({
      input: options.input,
      ...pickerFieldFormat(options.format, options.defaultFieldStates?.input, Object.hasOwn(options, 'format')),
      value: options.defaultFieldStates?.input === undefined ? runtime.getSnapshot().state.value : options.defaultFieldStates.input.value,
      ...(options.defaultFieldStates?.input === undefined ? {} : { defaultInputState: detachedFieldState(options.defaultFieldStates.input).inputState }),
      policies: {
        ...(options.policies?.min === undefined ? {} : { min: options.policies.min }),
        ...(options.policies?.max === undefined ? {} : { max: options.policies.max }),
        ...(options.policies?.unavailable === undefined ? {} : { unavailable: options.policies.unavailable }),
      },
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }),
      ...(options.required === undefined ? {} : { required: options.required }),
      ...(options.label === undefined ? {} : { label: options.label }),
      onValueChange: (value) => {
        if (!this.#syncingField) return this.handleEvent({ type: 'set-value', value });
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
  public getSnapshot(): RevisionSnapshot<DatePickerState> { return this.runtime.getSnapshot(); }
  public getFieldStates(): NonNullable<DatePickerOptions['defaultFieldStates']> { return Object.freeze(this.#field === null ? {} : { input: detachedFieldState(this.#field.getSnapshot().state) }); }
  public getMonth(): readonly (readonly DateValue[])[] { return createCalendarMonth(this.getSnapshot().state.view, this.options.policies?.weekStartsOn); }
  public getWeek(): readonly DateValue[] { return createCalendarWeek(this.getSnapshot().state.highlighted, this.options.policies?.weekStartsOn); }
  public getYear(): readonly (readonly CalendarMonthValue[])[] { return createCalendarYear(this.getSnapshot().state.view.year); }
  public syncControlledValues(values: DatePickerControlledValues): DOMTemporalResult<RevisionSnapshot<DatePickerState>> { if (this.controls.value !== (values.value !== undefined) || this.controls.highlighted !== (values.highlightedValue !== undefined) || this.controls.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date picker values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const highlighted = this.controls.highlighted ? values.highlightedValue as DateValue : state.highlighted; const result = this.runtime.replace(this.stateFactory({ value: this.controls.value ? values.value as DateValue | null : state.value, highlighted, view: { year: highlighted.year, month: highlighted.month }, viewMode: state.viewMode, open: this.controls.open ? values.open as boolean : state.open })); if (result.ok) { this.refresh(); this.options.onUpdate?.(); } return result; }
  public setCellAttributes(element: HTMLElement, value: DateValue): void {
    const state = this.getSnapshot().state;
    const project = (this.options as InternalDatePickerOptions).projectCell;
    if (project !== undefined) { project(element, value, state, this.options.policies); return; }
    element.setAttribute('role', 'gridcell');
    element.dataset['datePickerId'] = calendarID(value);
    element.setAttribute('aria-selected', String(state.value !== null && compareDateValues(state.value, value) === 0));
    const available = isCalendarValueAvailable(value, this.options.policies);
    setDatePickerCellAvailability(element, available);
    setDatePickerCellFocusEntry(element, available, compareDateValues(state.highlighted, value) === 0);
  }
  public handleEvent(event: DatePickerEvent | PeriodPickerEvent): boolean {
    const result = this.runtime.handle(event as DatePickerEvent);
    if (result.ok) {
      this.refresh(); this.options.onUpdate?.();
      if (this.getActive()) {
        if (!this.getSnapshot().state.open && result.commands.some((command) => command.type === 'open-changed' && !command.open)) this.options.trigger.focus();
        else if (result.commands.some((command) => command.type === 'highlight-changed')) {
          const generation = this.#focusGeneration;
          queueMicrotask(() => { if (this.getActive() && generation === this.#focusGeneration) focusDatePickerEntry(this.options.grid); });
        }
      }
    }
    return result.ok;
  }
  public refresh(): void {
    if (this.#disconnected) return;
    const state = this.getSnapshot().state;
    if ((this.options as InternalDatePickerOptions).projectCell === undefined) {
      setDatePickerGridFocusEntry(
        this.options.grid,
        isCalendarValueAvailable(state.highlighted, this.options.policies),
      );
    }
    this.#visibility?.setHidden(!this.getActive() || !state.open);
    this.options.trigger.setAttribute('aria-haspopup', 'dialog');
    this.options.trigger.setAttribute('aria-expanded', String(state.open));
    if (this.options.label !== undefined) this.options.grid.setAttribute('aria-label', this.options.label);
    if (this.#field !== null && compareNullable(this.#field.getValue(), state.value) !== 0) {
      this.#syncingField = true;
      try { this.#field.syncControlledValues({ value: state.value }); }
      finally { this.#syncingField = false; }
    }
    this.#layer.sync();
    if (this.getActive()) this.#position.update();
  }
  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    let failed = false, failure: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; failure = error; } } };
    drain(() => this.#layer.disconnect());
    drain(() => this.#position.disconnect());
    drain(() => this.#visibility?.disconnect());
    drain(() => this.#field?.disconnect());
    this.#unbindNative();
    if (failed) throw failure;
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
    drain(() => this.#field?.suspend()); drain(() => this.#position.disconnect());
    if (!this.#disconnected) drain(() => this.#visibility?.setHidden(true));
    drain(() => this.options.onUpdate?.());
    if (failed) throw failure;
  }
  #resumeResources(): void {
    this.#bindNative(); this.#field?.resume(); this.refresh(); this.options.onUpdate?.();
  }
}
function keyEvent(event: KeyboardEvent): DatePickerEvent | null { if (event.altKey || event.ctrlKey || event.metaKey) return null; if (event.key === 'ArrowLeft') return 'previous-day'; if (event.key === 'ArrowRight') return 'next-day'; if (event.key === 'ArrowUp') return 'previous-week'; if (event.key === 'ArrowDown') return 'next-week'; if (event.key === 'Home') return 'start-of-week'; if (event.key === 'End') return 'end-of-week'; if (event.key === 'PageUp') return event.shiftKey ? 'previous-year' : 'previous-month'; if (event.key === 'PageDown') return event.shiftKey ? 'next-year' : 'next-month'; if (event.key === 'Enter' || event.key === ' ') return 'select-highlighted'; if (event.key === 'Escape') return 'close'; return null; }
function compareNullable(left: DateValue | null, right: DateValue | null): number { return left === null ? right === null ? 0 : -1 : right === null ? 1 : compareDateValues(left, right); }
