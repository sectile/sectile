import { unwrap } from '@sectile/core/result';
import { permitsInteraction } from '@sectile/core/interaction';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { sameTextEditingState, type TextEditingState } from '@sectile/core/text';
import { applyDateFieldEvent, dateFieldMaximum, dateFieldNumericSegment, formatDateFieldValue, tryCreateDateFieldState, type DateFieldFormat, type DateFieldGranularity, type DateFieldCommand, type DateFieldEvent, type DateFieldPolicies, type DateFieldState, type DateValue } from '@sectile/temporal/date-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setFieldValidity, setInteractionAttributes } from '../interaction/attributes.js';
import { TemporalFieldBinding } from './internal/field-binding.js';
import { nativeFieldSelectionEvent, synchronizeControlledFieldInput, synchronizeFieldInputSelection } from '../text/controlled-input.js';
import { toTextEvent, type TextInput } from '../text.js';
import { bindTemporalSubmit } from './internal/submit.js';

export { formatDateValue, parseDateValue } from '@sectile/temporal/date-field';
export type { DateFieldFormat, DateFieldGranularity, DateRange, DateValue } from '@sectile/temporal/date-field';

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
  readonly granularity?: DateFieldGranularity;
  readonly prepareForm?: false;
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
  prepareSubmission(): boolean;
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
  const granularity = options.native === true ? 'day' : options.granularity;
  const runtime = createDOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand, DateFieldCommand>({
    initial: tryCreateDateFieldState(options.value !== undefined ? options.value : options.defaultValue ?? null, options.inputState !== undefined ? options.inputState : options.defaultInputState, format, granularity),
    reducer: (state, event) => applyDateFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateDateFieldState(valueControlled ? previous.value : proposed.value, inputControlled ? previous.inputState : proposed.inputState, format, granularity),
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
  readonly #binding: TemporalFieldBinding;
  readonly #editable: boolean;
  readonly #submission = bindTemporalSubmit(() => this.prepareSubmission());
  readonly #keydown = (event: KeyboardEvent): void => {
    if (!this.getActive() || !this.#editable || this.#binding.isComposing || event.isComposing) return;
    if (this.#options.native === true && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) return;
    const semantic = event.key === 'ArrowUp' ? 'increment-segment' : event.key === 'ArrowDown' ? 'decrement-segment' : event.key === 'Enter' ? 'commit' : event.key === 'Escape' ? 'cancel' : null;
    if (semantic !== null) { event.preventDefault(); if (semantic !== 'cancel' && this.#options.native !== true) this.#syncSelection(); this.handleEvent(semantic); }
  };
  readonly #blur = (): void => {
    if (this.getActive() && this.#editable && !this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };
  public constructor(options: DateFieldOptions, runtime: DOMTemporalController<DateFieldState, DateFieldEvent, DateFieldCommand>, valueControlled: boolean, inputControlled: boolean) {
    this.#options = options; this.#runtime = runtime; this.#valueControlled = valueControlled; this.#inputControlled = inputControlled;
    this.#editable = permitsInteraction({ disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }, 'mutate');
    this.#binding = new TemporalFieldBinding({
      element: options.input, getState: () => this.getSnapshot().state.inputState,
      dispatch: (input) => this.#text(input), keydown: this.#keydown, blur: this.#blur,
      ...(this.#editable && options.native !== true ? { segments: {
        maximum: () => dateFieldMaximum(options.format, options.granularity),
        at: (text, offset, key) => dateFieldNumericSegment(text, offset, options.format, key, options.granularity),
      } } : {}),
    });
    this.refresh();
  }
  public getActive(): boolean { return this.#binding.isActive; }
  public suspend(): void { this.#submission(); this.#binding.suspend(); }
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
        state.value === null ? '' : formatDateFieldValue(state.value, state.format, state.granularity),
        value === null ? '' : formatDateFieldValue(value, state.format, state.granularity),
      );
    const result = this.#runtime.replace(tryCreateDateFieldState(value, inputState, state.format, state.granularity));
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
  public prepareSubmission(): boolean {
    if (!this.getActive() || !this.#editable || this.#options.input.name === '') return true;
    if (this.#binding.isComposing) return false;
    const text = () => { const { value, format, granularity } = this.getSnapshot().state; return value === null ? '' : formatDateFieldValue(value, format, granularity); };
    return this.getText() === text() || this.handleEvent('commit') && this.getText() === text();
  }
  public refresh(): void { const input = this.#options.input; input.type = this.#options.native === true ? 'date' : 'text'; input.inputMode = this.#options.native === true ? '' : 'numeric'; const { format, granularity } = this.getSnapshot().state; const placeholder = this.#options.native === true ? '' : getDateFieldPlaceholder(format, granularity); if (input.placeholder !== placeholder) input.placeholder = placeholder; input.required = this.#options.required ?? this.#options.policies?.required ?? false; setInteractionAttributes(input, this.#options, true, true); if (this.#options.label !== undefined) input.setAttribute('aria-label', this.#options.label); this.#binding.render();
    if (this.#editable && this.#options.prepareForm !== false && this.getActive()) this.#submission(input.form);
  }
  public disconnect(): void { this.#submission(); this.#binding.disconnect(); }
  #text(input: TextInput): boolean { const event = toTextEvent(input); return event !== null && this.handleEvent({ type: 'text', event }); }
  #syncSelection(): void {
    this.handleEvent({ type: 'text', event: nativeFieldSelectionEvent(this.#options.input) });
  }
}

export function getDateFieldPlaceholder(format?: DateFieldFormat, granularity: DateFieldGranularity = 'day'): string {
  if (granularity === 'year') return 'YYYY';
  if (granularity === 'month') return 'YYYY-MM';
  if (format === undefined) return 'YYYY-MM-DD';
  let text = format.literals[0];
  for (let index = 0; index < 3; index++) text += (format.order[index] === 'year' ? 'YYYY' : format.order[index] === 'month' ? 'MM' : 'DD') + format.literals[index + 1];
  return text;
}
