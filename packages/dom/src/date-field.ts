import { unwrap } from '@sectile/core/result';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { sameTextEditingState, type TextEditingState } from '@sectile/core/text';
import { applyDateFieldEvent, formatDateValue, tryCreateDateFieldState, type DateFieldCommand, type DateFieldEvent, type DateFieldPolicies, type DateFieldState, type DateValue } from '@sectile/temporal/date-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setFieldValidity, setInteractionAttributes } from './internal/interaction.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { synchronizeControlledFieldInput, synchronizeFieldInputSelection } from './internal/controlled-field-input.js';
import { toTextEvent, type TextInput } from './text.js';

export { formatDateValue, parseDateValue } from '@sectile/temporal/date-field';
export type { DateRange, DateValue } from '@sectile/temporal/date-field';

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
  readonly onValueChange?: (value: DateValue | null) => boolean | void;
  readonly onInputStateChange?: (value: TextEditingState, previousValue: TextEditingState) => void;
  readonly onUpdate?: () => void;
}

export type DateFieldValueChangeHandler = NonNullable<DateFieldOptions['onValueChange']>;
export type DateFieldInputStateChangeHandler = NonNullable<DateFieldOptions['onInputStateChange']>;
export type DateFieldUpdateHandler = NonNullable<DateFieldOptions['onUpdate']>;

export interface DateFieldControlledValues { readonly value?: DateValue | null; readonly inputState?: TextEditingState; }
export interface DateFieldConnection {
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
  const runtime = createDOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand, DateFieldCommand>({
    initial: tryCreateDateFieldState(options.value !== undefined ? options.value : options.defaultValue ?? null, options.inputState !== undefined ? options.inputState : options.defaultInputState),
    reducer: (state, event) => applyDateFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateDateFieldState(valueControlled ? previous.value : proposed.value, inputControlled ? previous.inputState : proposed.inputState),
    notify: (previous, proposed) => { if (!sameTextEditingState(previous.inputState, proposed.inputState)) options.onInputStateChange?.(proposed.inputState, previous.inputState); },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMDateField(options, runtime.value, valueControlled, inputControlled) } : runtime;
}

class DOMDateField implements DateFieldConnection {
  readonly options: DateFieldOptions;
  readonly runtime: DOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand>;
  readonly valueControlled: boolean;
  readonly inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #keydown = (event: KeyboardEvent): void => {
    if (this.#binding.isComposing || event.isComposing) return;
    if (this.options.native === true && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) return;
    const semantic = event.key === 'ArrowUp' ? 'increment-segment' : event.key === 'ArrowDown' ? 'decrement-segment' : event.key === 'Enter' ? 'commit' : event.key === 'Escape' ? 'cancel' : null;
    if (semantic !== null) { event.preventDefault(); if (semantic === 'increment-segment' || semantic === 'decrement-segment') this.#syncSelection(); this.handleEvent(semantic); }
  };
  readonly #blur = (): void => {
    if (!this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };
  public constructor(options: DateFieldOptions, runtime: DOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand>, valueControlled: boolean, inputControlled: boolean) {
    this.options = options; this.runtime = runtime; this.valueControlled = valueControlled; this.inputControlled = inputControlled;
    this.#binding = new DOMTextElementBinding({ element: options.input, getState: () => this.getSnapshot().state.inputState, dispatch: (input) => this.#text(input) });
    options.input.addEventListener('keydown', this.#keydown); options.input.addEventListener('blur', this.#blur); this.refresh();
  }
  public getSnapshot(): RevisionSnapshot<DateFieldState> { return this.runtime.getSnapshot(); }
  public getText(): string { return this.getSnapshot().state.inputState.snapshot.text; }
  public getValue(): DateValue | null { return this.getSnapshot().state.value; }
  public syncControlledValues(values: DateFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateFieldState>> {
    if (this.valueControlled !== (values.value !== undefined) || this.inputControlled !== (values.inputState !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled date field values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const value = this.valueControlled ? values.value as DateValue | null : state.value;
    const inputState = this.inputControlled
      ? values.inputState as TextEditingState
      : synchronizeControlledFieldInput(
        synchronizeFieldInputSelection(state.inputState, this.options.input),
        state.value === null ? '' : formatDateValue(state.value),
        value === null ? '' : formatDateValue(value),
      );
    const result = this.runtime.replace(tryCreateDateFieldState(value, inputState));
    if (result.ok) { this.refresh(); this.options.onUpdate?.(); } return result;
  }
  public handleEvent(event: DateFieldEvent): boolean {
    const previous = this.getSnapshot();
    const result = this.runtime.handle(event); setFieldValidity(this.options.input, result);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'value-committed' && this.options.onValueChange?.(command.value) === false) {
          this.runtime.replace({ ok: true, value: previous.state });
          this.refresh();
          setFieldValidity(this.options.input, { ok: false, error: { message: 'The parent control rejected the date value.' } });
          this.options.onUpdate?.();
          return false;
        }
      }
      this.refresh(); this.options.onUpdate?.();
    }
    return result.ok;
  }
  public refresh(): void { const input = this.options.input; input.type = this.options.native === true ? 'date' : 'text'; input.inputMode = this.options.native === true ? '' : 'numeric'; input.placeholder = this.options.native === true ? '' : 'YYYY-MM-DD'; input.required = this.options.required ?? this.options.policies?.required ?? false; setInteractionAttributes(input, this.options, { native: true, readOnly: true }); if (this.options.label !== undefined) input.setAttribute('aria-label', this.options.label); this.#binding.render(); }
  public disconnect(): void { this.#binding.disconnect(); this.options.input.removeEventListener('keydown', this.#keydown); this.options.input.removeEventListener('blur', this.#blur); }
  #text(input: TextInput): boolean { const event = toTextEvent(input); return event !== null && this.handleEvent({ type: 'text', event }); }
  #syncSelection(): void { const input = this.options.input; const start = input.selectionStart ?? 0; const end = input.selectionEnd ?? start; const backward = input.selectionDirection === 'backward'; this.handleEvent({ type: 'text', event: { type: 'replace', startCodeUnitOffset: backward ? end : start, endCodeUnitOffset: backward ? end : start, text: '', selection: { anchorCodeUnitOffset: backward ? end : start, focusCodeUnitOffset: backward ? start : end } } }); }
}
