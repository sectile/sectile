import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import { applyTimeFieldEvent, tryCreateTimeFieldState, type TimeFieldCommand, type TimeFieldEvent, type TimeFieldPolicies, type TimeFieldState, type TimeValue } from '@sectile/core/time-field';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setFieldValidity, setInteractionAttributes } from './internal/interaction.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { toTextEvent, type TextInput } from './text.js';

export { formatTimeValue } from '@sectile/core/time-field';
export type { TimeValue } from '@sectile/core/time-field';

export interface TimeFieldOptions { readonly input: HTMLInputElement; readonly policies?: TimeFieldPolicies; readonly value?: TimeValue | null; readonly defaultValue?: TimeValue | null; readonly inputState?: TextEditingState; readonly defaultInputState?: TextEditingState; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly label?: string; readonly native?: boolean; readonly onValueChange?: (value: TimeValue | null) => void; readonly onInputStateChange?: (value: TextEditingState, previousValue: TextEditingState) => void; readonly onUpdate?: () => void; }
export interface TimeFieldControlledValues { readonly value?: TimeValue | null; readonly inputState?: TextEditingState; }
export interface TimeFieldConnection { getSnapshot(): RevisionSnapshot<TimeFieldState>; getText(): string; getValue(): TimeValue | null; syncControlledValues(values: TimeFieldControlledValues): Result<RevisionSnapshot<TimeFieldState>>; handleEvent(event: TimeFieldEvent): boolean; refresh(): void; disconnect(): void; }

export function createTimeField(options: TimeFieldOptions): FacadeConnection<TimeFieldConnection> { return unwrap(tryCreateTimeField(options)); }
export function tryCreateTimeField(options: TimeFieldOptions): Result<FacadeConnection<TimeFieldConnection>> { return createFacadeConnection(options, construct); }
function construct(options: TimeFieldOptions): Result<TimeFieldConnection> {
  const valueControlled = options.value !== undefined; const inputControlled = options.inputState !== undefined;
  const policies = Object.freeze({ ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) });
  const runtime = createSemanticController<TimeFieldState, TimeFieldEvent, TimeFieldCommand, TimeFieldCommand>({ initial: tryCreateTimeFieldState(options.value !== undefined ? options.value : options.defaultValue ?? null, options.inputState !== undefined ? options.inputState : options.defaultInputState), reducer: (state, event) => applyTimeFieldEvent(state, event, policies), reconcile: (previous, proposed) => tryCreateTimeFieldState(valueControlled ? previous.value : proposed.value, inputControlled ? previous.inputState : proposed.inputState), notify: (previous, proposed) => { if (JSON.stringify(previous.inputState) !== JSON.stringify(proposed.inputState)) options.onInputStateChange?.(proposed.inputState, previous.inputState); }, toEffect: (command) => command, interaction: options });
  return runtime.ok ? { ok: true, value: new DOMTimeField(options, runtime.value, valueControlled, inputControlled) } : runtime;
}
class DOMTimeField implements TimeFieldConnection {
  readonly options: TimeFieldOptions; readonly runtime: SemanticController<TimeFieldState, TimeFieldEvent, TimeFieldCommand>; readonly valueControlled: boolean; readonly inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #keydown = (event: KeyboardEvent): void => { if (this.#binding.isComposing || event.isComposing) return; if (this.options.native === true && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) return; const semantic = event.key === 'ArrowUp' ? 'increment-segment' : event.key === 'ArrowDown' ? 'decrement-segment' : event.key === 'Enter' ? 'commit' : event.key === 'Escape' ? 'cancel' : null; if (semantic !== null) { event.preventDefault(); if (semantic === 'increment-segment' || semantic === 'decrement-segment') this.#syncSelection(); this.handleEvent(semantic); } };
  readonly #blur = (): void => {
    if (!this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };
  public constructor(options: TimeFieldOptions, runtime: SemanticController<TimeFieldState, TimeFieldEvent, TimeFieldCommand>, valueControlled: boolean, inputControlled: boolean) { this.options = options; this.runtime = runtime; this.valueControlled = valueControlled; this.inputControlled = inputControlled; this.#binding = new DOMTextElementBinding({ element: options.input, getState: () => this.getSnapshot().state.inputState, dispatch: (input) => this.#text(input) }); options.input.addEventListener('keydown', this.#keydown); options.input.addEventListener('blur', this.#blur); this.refresh(); }
  public getSnapshot(): RevisionSnapshot<TimeFieldState> { return this.runtime.getSnapshot(); }
  public getText(): string { return this.getSnapshot().state.inputState.snapshot.text; }
  public getValue(): TimeValue | null { return this.getSnapshot().state.value; }
  public syncControlledValues(values: TimeFieldControlledValues): Result<RevisionSnapshot<TimeFieldState>> { if (this.valueControlled !== (values.value !== undefined) || this.inputControlled !== (values.inputState !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled time field values must preserve their construction-time shape.' } }; const state = this.getSnapshot().state; const result = this.runtime.replace(tryCreateTimeFieldState(this.valueControlled ? values.value as TimeValue | null : state.value, this.inputControlled ? values.inputState as TextEditingState : state.inputState)); if (result.ok) { this.refresh(); this.options.onUpdate?.(); } return result; }
  public handleEvent(event: TimeFieldEvent): boolean { const result = this.runtime.handle(event); setFieldValidity(this.options.input, result); if (result.ok) { for (const command of result.commands) if (command.type === 'value-committed') this.options.onValueChange?.(command.value); this.refresh(); this.options.onUpdate?.(); } return result.ok; }
  public refresh(): void { const input = this.options.input; input.type = this.options.native === true ? 'time' : 'text'; input.inputMode = this.options.native === true ? '' : 'numeric'; input.placeholder = this.options.native === true ? '' : 'HH:mm'; input.required = this.options.required ?? this.options.policies?.required ?? false; setInteractionAttributes(input, this.options, { native: true, readOnly: true }); if (this.options.label !== undefined) input.setAttribute('aria-label', this.options.label); this.#binding.render(); }
  public disconnect(): void { this.#binding.disconnect(); this.options.input.removeEventListener('keydown', this.#keydown); this.options.input.removeEventListener('blur', this.#blur); }
  #text(input: TextInput): boolean { const event = toTextEvent(input); return event !== null && this.handleEvent({ type: 'text', event }); }
  #syncSelection(): void { const input = this.options.input; const start = input.selectionStart ?? 0; const end = input.selectionEnd ?? start; const backward = input.selectionDirection === 'backward'; this.handleEvent({ type: 'text', event: { type: 'replace', startCodeUnitOffset: backward ? end : start, endCodeUnitOffset: backward ? end : start, text: '', selection: { anchorCodeUnitOffset: backward ? end : start, focusCodeUnitOffset: backward ? start : end } } }); }
}
