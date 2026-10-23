import { unwrap } from '@sectile/core/result';
import { permitsInteraction } from '@sectile/core/interaction';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { sameTextEditingState, type TextEditingState } from '@sectile/core/text';
import { applyTimeFieldEvent, formatTimeValue, formatTimeFieldValue, tryCreateTimeFieldState, type TimeFieldFormat, type TimeFieldCommand, type TimeFieldEvent, type TimeFieldPolicies, type TimeFieldState, type TimeValue } from '@sectile/temporal/time-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setFieldValidity, setInteractionAttributes } from '../interaction/attributes.js';
import { DOMTextElementBinding } from '../text/element-binding.js';
import { nativeFieldSelectionEvent, synchronizeControlledFieldInput, synchronizeFieldInputSelection } from '../text/controlled-input.js';
import { toTextEvent, type TextInput } from '../text.js';

export { formatTimeValue } from '@sectile/temporal/time-field';
export type { TimeValue } from '@sectile/temporal/time-field';

export interface TimeFieldOptions { readonly input: HTMLInputElement; readonly policies?: TimeFieldPolicies; readonly value?: TimeValue | null; readonly defaultValue?: TimeValue | null; readonly inputState?: TextEditingState; readonly defaultInputState?: TextEditingState; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly label?: string; readonly native?: boolean; readonly format?: TimeFieldFormat; readonly onValueChange?: (value: TimeValue | null) => boolean | void; readonly onInputStateChange?: (value: TextEditingState, previousValue: TextEditingState) => void; readonly onUpdate?: () => void; }

export type TimeFieldValueChangeHandler = NonNullable<TimeFieldOptions['onValueChange']>;
export type TimeFieldInputStateChangeHandler = NonNullable<TimeFieldOptions['onInputStateChange']>;
export type TimeFieldUpdateHandler = NonNullable<TimeFieldOptions['onUpdate']>;
export interface TimeFieldControlledValues { readonly value?: TimeValue | null; readonly inputState?: TextEditingState; }
export interface TimeFieldConnection { getActive(): boolean; suspend(): void; resume(): void; getSnapshot(): RevisionSnapshot<TimeFieldState>; getText(): string; getValue(): TimeValue | null; syncControlledValues(values: TimeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<TimeFieldState>>; handleEvent(event: TimeFieldEvent): boolean; refresh(): void; disconnect(): void; }

export function createTimeField(options: TimeFieldOptions): FacadeConnection<TimeFieldConnection> { return unwrap(tryCreateTimeField(options)); }
export function tryCreateTimeField(options: TimeFieldOptions): DOMTemporalResult<FacadeConnection<TimeFieldConnection>> { return createDOMTemporalFacadeConnection(options, construct); }
function construct(options: TimeFieldOptions): DOMTemporalResult<TimeFieldConnection> {
  const valueControlled = options.value !== undefined; const inputControlled = options.inputState !== undefined;
  const policies = Object.freeze({ ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) });
  const format = options.native === true ? undefined : options.format;
  const runtime = createDOMTemporalController<TimeFieldState, TimeFieldEvent, TimeFieldCommand, TimeFieldCommand>({ initial: tryCreateTimeFieldState(valueControlled ? options.value as TimeValue | null : options.defaultValue ?? null, inputControlled ? options.inputState : options.defaultInputState, format), reducer: (state, event) => applyTimeFieldEvent(state, event, policies), reconcile: (previous, proposed) => tryCreateTimeFieldState(valueControlled ? previous.value : proposed.value, inputControlled ? previous.inputState : proposed.inputState, format), notify: (previous, proposed) => { if (!sameTextEditingState(previous.inputState, proposed.inputState)) options.onInputStateChange?.(proposed.inputState, previous.inputState); }, toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new DOMTimeField(options, runtime.value, valueControlled, inputControlled) } : runtime;
}
class DOMTimeField implements TimeFieldConnection {
  readonly #options: TimeFieldOptions; readonly #runtime: DOMTemporalController<TimeFieldState, TimeFieldEvent, TimeFieldCommand>; readonly #valueControlled: boolean; readonly #inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #editable: boolean;
  readonly #keydown = (event: KeyboardEvent): void => {
    if (!this.getActive() || !this.#editable || this.#binding.isComposing || event.isComposing) return;
    const key = event.key;
    if (this.#options.native === true && (key.startsWith('Arrow') || key === 'Home' || key === 'End')) return;
    const increment = key === 'ArrowUp';
    const decrement = key === 'ArrowDown';
    const semantic = increment ? 'increment-segment' : decrement ? 'decrement-segment' : key === 'Enter' ? 'commit' : key === 'Escape' ? 'cancel' : null;
    if (semantic !== null) {
      event.preventDefault();
      if (increment || decrement) this.#syncSelection();
      this.handleEvent(semantic);
    }
  };
  readonly #blur = (): void => {
    if (this.getActive() && this.#editable && !this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };
  public constructor(options: TimeFieldOptions, runtime: DOMTemporalController<TimeFieldState, TimeFieldEvent, TimeFieldCommand>, valueControlled: boolean, inputControlled: boolean) { this.#options = options; this.#runtime = runtime; this.#valueControlled = valueControlled; this.#inputControlled = inputControlled;
    this.#editable = permitsInteraction({ disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }, 'mutate');
    this.#binding = new DOMTextElementBinding({ element: options.input, getState: () => this.getSnapshot().state.inputState, dispatch: (input) => this.#text(input), keydown: this.#keydown, blur: this.#blur }); this.refresh(); }
  public getActive(): boolean { return this.#binding.isActive; }
  public suspend(): void { this.#binding.suspend(); }
  public resume(): void { this.#binding.resume(); try { if (this.getActive()) this.refresh(); } catch (error) { this.suspend(); throw error; } }
  public getSnapshot(): RevisionSnapshot<TimeFieldState> { return this.#runtime.getSnapshot(); }
  public getText(): string { return this.getSnapshot().state.inputState.snapshot.text; }
  public getValue(): TimeValue | null { return this.getSnapshot().state.value; }
  public syncControlledValues(values: TimeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<TimeFieldState>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#inputControlled !== (values.inputState !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled time field values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state, value = this.#valueControlled ? values.value as TimeValue | null : state.value;
    const admitted = tryCreateTimeFieldState(value, this.#inputControlled ? values.inputState : state.inputState, state.format);
    if (!admitted.ok) return admitted;
    const next = admitted.value.value;
    const inputState = this.#inputControlled ? values.inputState as TextEditingState : synchronizeControlledFieldInput(synchronizeFieldInputSelection(state.inputState, this.#options.input), state.value === null ? '' : formatTimeFieldValue(state.value, state.format), next === null ? '' : formatTimeFieldValue(next, state.format));
    const result = this.#runtime.replace(tryCreateTimeFieldState(next, inputState, state.format));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); } return result;
  }
  public handleEvent(event: TimeFieldEvent): boolean { const previous = this.getSnapshot(); const result = this.#runtime.handle(event); setFieldValidity(this.#options.input, result); if (result.ok) { for (const command of result.commands) if (command.type === 'value-committed' && this.#options.onValueChange?.(command.value) === false) { this.#runtime.replace({ ok: true, value: previous.state }); this.refresh(); setFieldValidity(this.#options.input, { ok: false, error: { message: 'The parent control rejected the time value.' } }); this.#options.onUpdate?.(); return false; } this.refresh(); this.#options.onUpdate?.(); } return result.ok; }
  public refresh(): void { const input = this.#options.input; const native = this.#options.native === true, format = this.getSnapshot().state.format; input.type = native ? 'time' : 'text'; input.inputMode = native ? '' : format?.dayPeriods !== undefined ? 'text' : 'numeric'; input.placeholder = native ? '' : getTimeFieldPlaceholder(format); input.required = this.#options.required ?? this.#options.policies?.required ?? false; setInteractionAttributes(input, this.#options, true, true); if (this.#options.label !== undefined) input.setAttribute('aria-label', this.#options.label); this.#binding.render(); }
  public disconnect(): void { this.#binding.disconnect(); }
  #text(input: TextInput): boolean { const event = toTextEvent(input); return event !== null && this.handleEvent({ type: 'text', event }); }
  #syncSelection(): void {
    this.handleEvent({ type: 'text', event: nativeFieldSelectionEvent(this.#options.input) });
  }
}
export function getTimeFieldPlaceholder(format?: TimeFieldFormat): string {
  if (format === undefined) return 'HH:mm';
  const labels = { hour: format.hourCycle === 'h11' || format.hourCycle === 'h12' ? 'hh' : 'HH', minute: 'mm', second: 'ss', millisecond: 'SSS', dayPeriod: format.dayPeriods?.join('/') ?? '' };
  return format.order.reduce((text, part, index) => text + labels[part] + format.literals[index + 1], format.literals[0]!);
}
