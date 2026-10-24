import { unwrap } from '@sectile/core/result';
import { permitsInteraction } from '@sectile/core/interaction';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { sameTextEditingState, type TextEditingState } from '@sectile/core/text';
import { applyDateFieldEvent, formatDateFieldValue, tryCreateDateFieldState, type DateFieldFormat, type DateFieldCommand, type DateFieldEvent, type DateFieldPolicies, type DateFieldState, type DateValue } from '@sectile/temporal/date-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setFieldValidity, setInteractionAttributes } from '../interaction/attributes.js';
import { DOMTextElementBinding } from '../text/element-binding.js';
import { nativeFieldSelectionEvent, synchronizeControlledFieldInput, synchronizeFieldInputSelection } from '../text/controlled-input.js';
import { toTextEvent, type TextInput } from '../text.js';

export { formatDateValue, parseDateValue } from '@sectile/temporal/date-field';
export type { DateFieldFormat, DateRange, DateValue } from '@sectile/temporal/date-field';

export interface DateFieldOptions {
  readonly input: HTMLInputElement;
  readonly policies?: DateFieldPolicies;
  readonly value?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
  readonly format?: DateFieldFormat;
  readonly onValueChange?: (value: DateValue | null) => boolean | void;
  readonly onInputStateChange?: (value: TextEditingState, previousValue: TextEditingState) => void;
  readonly onUpdate?: () => void;
}

export type DateFieldValueChangeHandler = NonNullable<DateFieldOptions['onValueChange']>;
export type DateFieldInputStateChangeHandler = NonNullable<DateFieldOptions['onInputStateChange']>;
export type DateFieldUpdateHandler = NonNullable<DateFieldOptions['onUpdate']>;

export interface DateFieldControlledValues { readonly value?: DateValue | null; readonly inputState?: TextEditingState; }
export interface DateFieldConnection {
  getActive(): boolean;
  suspend(): void;
  resume(): void;
  getSnapshot(): RevisionSnapshot<DateFieldState>;
  getText(): string;
  getValue(): DateValue | null;
  syncControlledValues(values: DateFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateFieldState>>;
  handleEvent(event: DateFieldEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createDateField(options: DateFieldOptions): FacadeConnection<DateFieldConnection> { return unwrap(tryCreateDateField(options)); }
export function tryCreateDateField(options: DateFieldOptions): DOMTemporalResult<FacadeConnection<DateFieldConnection>> { return createDOMTemporalFacadeConnection(options, construct); }

function construct(options: DateFieldOptions): DOMTemporalResult<DateFieldConnection> {
  const valueControlled = options.value !== undefined;
  const inputControlled = options.inputState !== undefined;
  const policies = Object.freeze({ ...options.policies, ...(options.required === undefined ? {} : { required: options.required }) });
  const format = options.native === true ? undefined : options.format;
  const runtime = createDOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand, DateFieldCommand>({
    initial: tryCreateDateFieldState(options.value !== undefined ? options.value : options.defaultValue ?? null, options.inputState !== undefined ? options.inputState : options.defaultInputState, format),
    reducer: (state, event) => applyDateFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateDateFieldState(valueControlled ? previous.value : proposed.value, inputControlled ? previous.inputState : proposed.inputState, format),
    notify: (previous, proposed) => { if (!sameTextEditingState(previous.inputState, proposed.inputState)) options.onInputStateChange?.(proposed.inputState, previous.inputState); },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMDateField(options, runtime.value, valueControlled, inputControlled) } : runtime;
}

class DOMDateField implements DateFieldConnection {
  readonly #options: DateFieldOptions;
  readonly #runtime: DOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand>;
  readonly #valueControlled: boolean;
  readonly #inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #editable: boolean;
  readonly #keydown = (event: KeyboardEvent): void => {
    if (!this.getActive() || !this.#editable || this.#binding.isComposing || event.isComposing) return;
    if (this.#options.native === true && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) return;
    const semantic = event.key === 'ArrowUp' ? 'increment-segment' : event.key === 'ArrowDown' ? 'decrement-segment' : event.key === 'Enter' ? 'commit' : event.key === 'Escape' ? 'cancel' : null;
    if (semantic !== null) { event.preventDefault(); if (semantic === 'increment-segment' || semantic === 'decrement-segment') this.#syncSelection(); this.handleEvent(semantic); }
  };
  readonly #blur = (): void => {
    if (this.getActive() && this.#editable && !this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };
  public constructor(options: DateFieldOptions, runtime: DOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand>, valueControlled: boolean, inputControlled: boolean) {
    this.#options = options; this.#runtime = runtime; this.#valueControlled = valueControlled; this.#inputControlled = inputControlled;
    this.#editable = permitsInteraction({ disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }, 'mutate');
    this.#binding = new DOMTextElementBinding({ element: options.input, getState: () => this.getSnapshot().state.inputState, dispatch: (input) => this.#text(input), keydown: this.#keydown, blur: this.#blur });
    this.refresh();
  }
  public getActive(): boolean { return this.#binding.isActive; }
  public suspend(): void { this.#binding.suspend(); }
  public resume(): void { this.#binding.resume(); try { if (this.getActive()) this.refresh(); } catch (error) { this.suspend(); throw error; } }
  public getSnapshot(): RevisionSnapshot<DateFieldState> { return this.#runtime.getSnapshot(); }
  public getText(): string { return this.getSnapshot().state.inputState.snapshot.text; }
  public getValue(): DateValue | null { return this.getSnapshot().state.value; }
  public syncControlledValues(values: DateFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateFieldState>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#inputControlled !== (values.inputState !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date field values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const value = this.#valueControlled ? values.value as DateValue | null : state.value;
    const inputState = this.#inputControlled
      ? values.inputState as TextEditingState
      : synchronizeControlledFieldInput(
        synchronizeFieldInputSelection(state.inputState, this.#options.input),
        state.value === null ? '' : formatDateFieldValue(state.value, state.format),
        value === null ? '' : formatDateFieldValue(value, state.format),
      );
    const result = this.#runtime.replace(tryCreateDateFieldState(value, inputState, state.format));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); } return result;
  }
  public handleEvent(event: DateFieldEvent): boolean {
    const previous = this.getSnapshot();
    const result = this.#runtime.handle(event); setFieldValidity(this.#options.input, result);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'value-committed' && this.#options.onValueChange?.(command.value) === false) {
          this.#runtime.replace({ ok: true, value: previous.state });
          this.refresh();
          setFieldValidity(this.#options.input, { ok: false, error: { message: 'The parent control rejected the date value.' } });
          this.#options.onUpdate?.();
          return false;
        }
      }
      this.refresh(); this.#options.onUpdate?.();
    }
    return result.ok;
  }
  public refresh(): void { const input = this.#options.input; input.type = this.#options.native === true ? 'date' : 'text'; input.inputMode = this.#options.native === true ? '' : 'numeric'; const placeholder = this.#options.native === true ? '' : getDateFieldPlaceholder(this.getSnapshot().state.format); if (input.placeholder !== placeholder) input.placeholder = placeholder; input.required = this.#options.required ?? this.#options.policies?.required ?? false; setInteractionAttributes(input, this.#options, true, true); if (this.#options.label !== undefined) input.setAttribute('aria-label', this.#options.label); this.#binding.render(); }
  public disconnect(): void { this.#binding.disconnect(); }
  #text(input: TextInput): boolean { const event = toTextEvent(input); return event !== null && this.handleEvent({ type: 'text', event }); }
  #syncSelection(): void {
    this.handleEvent({ type: 'text', event: nativeFieldSelectionEvent(this.#options.input) });
  }
}

export function getDateFieldPlaceholder(format?: DateFieldFormat): string {
  if (format === undefined) return 'YYYY-MM-DD';
  let text = format.literals[0];
  for (let index = 0; index < 3; index++) text += (format.order[index] === 'year' ? 'YYYY' : format.order[index] === 'month' ? 'MM' : 'DD') + format.literals[index + 1];
  return text;
}
