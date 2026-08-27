import { unwrap } from '@sectile/core/result';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import { formatDateValue, type DateRange, type DateValue } from '@sectile/temporal/date-field';
import { applyDateRangeFieldEvent, tryCreateDateRangeFieldState, type DateRangeFieldCommand, type DateRangeFieldEndpoint, type DateRangeFieldEvent, type DateRangeFieldPolicies, type DateRangeFieldState } from '@sectile/temporal/date-range-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setFieldValidity, setInteractionAttributes } from './internal/interaction.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { synchronizeControlledFieldInput, synchronizeFieldInputSelection } from './internal/controlled-field-input.js';
import { toTextEvent, type TextInput } from './text.js';

export interface DateRangeFieldOptions {
  readonly startInput: HTMLInputElement; readonly endInput: HTMLInputElement;
  readonly policies?: DateRangeFieldPolicies; readonly value?: DateRange | null; readonly defaultValue?: DateRange | null;
  readonly startInputState?: TextEditingState; readonly defaultStartInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly defaultEndInputState?: TextEditingState;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly startLabel?: string; readonly endLabel?: string;
  readonly onValueChange?: (value: DateRange | null) => void; readonly onStartInputStateChange?: (value: TextEditingState) => void; readonly onEndInputStateChange?: (value: TextEditingState) => void; readonly onUpdate?: () => void;
}

export type DateRangeFieldValueChangeHandler = NonNullable<DateRangeFieldOptions['onValueChange']>;
export type DateRangeFieldStartInputStateChangeHandler = NonNullable<DateRangeFieldOptions['onStartInputStateChange']>;
export type DateRangeFieldEndInputStateChangeHandler = NonNullable<DateRangeFieldOptions['onEndInputStateChange']>;
export type DateRangeFieldUpdateHandler = NonNullable<DateRangeFieldOptions['onUpdate']>;
export interface DateRangeFieldControlledValues { readonly value?: DateRange | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState }
export interface DateRangeFieldConnection { getSnapshot(): RevisionSnapshot<DateRangeFieldState>; getValue(): DateRange | null; syncControlledValues(values: DateRangeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateRangeFieldState>>; handleEvent(event: DateRangeFieldEvent): boolean; refresh(): void; disconnect(): void }

export function createDateRangeField(options: DateRangeFieldOptions): FacadeConnection<DateRangeFieldConnection> { return unwrap(tryCreateDateRangeField(options)); }
export function tryCreateDateRangeField(options: DateRangeFieldOptions): DOMTemporalResult<FacadeConnection<DateRangeFieldConnection>> { return createDOMTemporalFacadeConnection(options, construct); }
function construct(options: DateRangeFieldOptions): DOMTemporalResult<DateRangeFieldConnection> {
  const controlled = { value: options.value !== undefined, start: options.startInputState !== undefined, end: options.endInputState !== undefined };
  const initialValue = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const runtime = createDOMTemporalController<DateRangeFieldState, DateRangeFieldEvent, DateRangeFieldCommand, DateRangeFieldCommand>({
    initial: tryCreateDateRangeFieldState({ value: initialValue, ...optionalInputState('startInputState', options.startInputState ?? options.defaultStartInputState), ...optionalInputState('endInputState', options.endInputState ?? options.defaultEndInputState) }),
    reducer: (state, event) => applyDateRangeFieldEvent(state, event, { ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) }),
    reconcile: (previous, proposed) => tryCreateDateRangeFieldState({
      startValue: controlled.value ? previous.start.value : proposed.start.value, endValue: controlled.value ? previous.end.value : proposed.end.value,
      startInputState: controlled.start ? previous.start.inputState : proposed.start.inputState, endInputState: controlled.end ? previous.end.inputState : proposed.end.inputState, active: proposed.active,
    }),
    notify: (previous, proposed) => { if (previous.start.inputState !== proposed.start.inputState) options.onStartInputStateChange?.(proposed.start.inputState); if (previous.end.inputState !== proposed.end.inputState) options.onEndInputStateChange?.(proposed.end.inputState); },
    toEffect: (command) => command, interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMDateRangeField(options, runtime.value, controlled) } : runtime;
}

function optionalInputState<Key extends 'startInputState' | 'endInputState'>(key: Key, value: TextEditingState | undefined): { readonly [Property in Key]?: TextEditingState } { return value === undefined ? {} : { [key]: value } as { readonly [Property in Key]?: TextEditingState }; }

class DOMDateRangeField implements DateRangeFieldConnection {
  readonly #options: DateRangeFieldOptions; readonly #runtime: DOMTemporalController<DateRangeFieldState, DateRangeFieldEvent, DateRangeFieldCommand>; readonly #controlled: { readonly value: boolean; readonly start: boolean; readonly end: boolean };
  readonly #bindings: Record<DateRangeFieldEndpoint, DOMTextElementBinding>;
  readonly #keydown: Record<DateRangeFieldEndpoint, (event: Event) => void>; readonly #blur: Record<DateRangeFieldEndpoint, () => void>; readonly #focus: Record<DateRangeFieldEndpoint, () => void>;
  public constructor(options: DateRangeFieldOptions, runtime: DOMTemporalController<DateRangeFieldState, DateRangeFieldEvent, DateRangeFieldCommand>, controlled: { readonly value: boolean; readonly start: boolean; readonly end: boolean }) {
    this.#options = options; this.#runtime = runtime; this.#controlled = controlled;
    this.#bindings = {
      start: new DOMTextElementBinding({ element: options.startInput, getState: () => this.getSnapshot().state.start.inputState, dispatch: (input) => this.#text('start', input) }),
      end: new DOMTextElementBinding({ element: options.endInput, getState: () => this.getSnapshot().state.end.inputState, dispatch: (input) => this.#text('end', input) }),
    };
    this.#keydown = { start: (event) => this.#key('start', event), end: (event) => this.#key('end', event) };
    this.#blur = { start: () => this.#commitOrCancel('start'), end: () => this.#commitOrCancel('end') };
    this.#focus = { start: () => { this.handleEvent({ type: 'focus', endpoint: 'start' }); }, end: () => { this.handleEvent({ type: 'focus', endpoint: 'end' }); } };
    for (const endpoint of ['start', 'end'] as const) { const input = this.#input(endpoint); input.addEventListener('keydown', this.#keydown[endpoint]); input.addEventListener('blur', this.#blur[endpoint]); input.addEventListener('focus', this.#focus[endpoint]); }
    this.refresh();
  }
  public getSnapshot(): RevisionSnapshot<DateRangeFieldState> { return this.#runtime.getSnapshot(); }
  public getValue(): DateRange | null { return this.getSnapshot().state.value; }
  public syncControlledValues(values: DateRangeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateRangeFieldState>> {
    if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.start !== (values.startInputState !== undefined) || this.#controlled.end !== (values.endInputState !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date range field values must preserve their construction-time shape.' } };
    const current = this.getSnapshot().state; const value = this.#controlled.value ? values.value as DateRange | null : current.value;
    const startValue = value?.start ?? null; const endValue = value?.end ?? null;
    const startInputState = this.#controlled.start ? values.startInputState : synchronizeControlledFieldInput(synchronizeFieldInputSelection(current.start.inputState, this.#options.startInput), current.start.value === null ? '' : formatDateValue(current.start.value), startValue === null ? '' : formatDateValue(startValue));
    const endInputState = this.#controlled.end ? values.endInputState : synchronizeControlledFieldInput(synchronizeFieldInputSelection(current.end.inputState, this.#options.endInput), current.end.value === null ? '' : formatDateValue(current.end.value), endValue === null ? '' : formatDateValue(endValue));
    const result = this.#runtime.replace(tryCreateDateRangeFieldState({ value, ...optionalInputState('startInputState', startInputState), ...optionalInputState('endInputState', endInputState), active: current.active }));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); } return result;
  }
  public handleEvent(event: DateRangeFieldEvent): boolean { const result = this.#runtime.handle(event); if (typeof event === 'object' && event.type === 'field') setFieldValidity(this.#input(event.endpoint), result); if (result.ok) { for (const command of result.commands) { if (command.type === 'range-committed') this.#options.onValueChange?.(command.value); if (command.type === 'focus-endpoint') this.#input(command.endpoint).focus(); } this.refresh(); this.#options.onUpdate?.(); } return result.ok; }
  public refresh(): void { for (const endpoint of ['start', 'end'] as const) { const input = this.#input(endpoint); input.type = 'text'; input.inputMode = 'numeric'; input.placeholder = 'YYYY-MM-DD'; input.required = this.#options.required ?? this.#options.policies?.required ?? false; setInteractionAttributes(input, this.#options, { native: true, readOnly: true }); const label = endpoint === 'start' ? this.#options.startLabel : this.#options.endLabel; if (label !== undefined) input.setAttribute('aria-label', label); this.#bindings[endpoint].render(); } }
  public disconnect(): void { for (const endpoint of ['start', 'end'] as const) { const input = this.#input(endpoint); this.#bindings[endpoint].disconnect(); input.removeEventListener('keydown', this.#keydown[endpoint]); input.removeEventListener('blur', this.#blur[endpoint]); input.removeEventListener('focus', this.#focus[endpoint]); } }
  #input(endpoint: DateRangeFieldEndpoint): HTMLInputElement { return endpoint === 'start' ? this.#options.startInput : this.#options.endInput; }
  #text(endpoint: DateRangeFieldEndpoint, input: TextInput): boolean { const event = toTextEvent(input); return event !== null && this.handleEvent({ type: 'field', endpoint, event: { type: 'text', event } }); }
  #key(endpoint: DateRangeFieldEndpoint, nativeEvent: Event): void { const event = nativeEvent as KeyboardEvent; if (this.#bindings[endpoint].isComposing || event.isComposing) return; const semantic = event.key === 'ArrowUp' ? 'increment-segment' : event.key === 'ArrowDown' ? 'decrement-segment' : event.key === 'Enter' ? 'commit' : event.key === 'Escape' ? 'cancel' : null; if (semantic !== null) { event.preventDefault(); if (semantic === 'increment-segment' || semantic === 'decrement-segment') this.#syncSelection(endpoint); this.handleEvent(semantic === 'cancel' ? 'cancel' : { type: 'field', endpoint, event: semantic }); } }
  #syncSelection(endpoint: DateRangeFieldEndpoint): void { const input = this.#input(endpoint); const start = input.selectionStart ?? 0; const end = input.selectionEnd ?? start; const backward = input.selectionDirection === 'backward'; this.handleEvent({ type: 'field', endpoint, event: { type: 'text', event: { type: 'replace', startCodeUnitOffset: backward ? end : start, endCodeUnitOffset: backward ? end : start, text: '', selection: { anchorCodeUnitOffset: backward ? end : start, focusCodeUnitOffset: backward ? start : end } } } }); }
  #commitOrCancel(endpoint: DateRangeFieldEndpoint): void { if (!this.#bindings[endpoint].isComposing && !this.handleEvent({ type: 'field', endpoint, event: 'commit' })) this.handleEvent({ type: 'field', endpoint, event: 'cancel' }); }
}

export { tryCreateDateRangeFieldState } from '@sectile/temporal/date-range-field';
export type { DateRangeFieldPolicies, DateRangeFieldState } from '@sectile/temporal/date-range-field';
