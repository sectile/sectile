import { unwrap } from '@sectile/core/result';
import { permitsInteraction } from '@sectile/core/interaction';
import { createDOMTemporalController, createDOMTemporalFacadeConnection, type DOMTemporalController, type DOMTemporalResult } from './internal/result.js';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { sameTextEditingState, type TextEditingState } from '@sectile/core/text';
import {
  applyDateTimeFieldEvent,
  formatDateTimeFieldValue,
  tryCreateDateTimeFieldState,
  type DateTimeFieldCommand,
  type DateTimeFieldEvent,
  type DateTimeFieldPolicies,
  type DateTimeFieldState,
  type DateTimeValue,
  type DateTimeFieldFormat,
} from '@sectile/temporal/date-time-field';
import { type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setFieldValidity, setInteractionAttributes } from '../interaction/attributes.js';
import { DOMTextElementBinding } from '../text/element-binding.js';
import { nativeFieldSelectionEvent, synchronizeControlledFieldInput, synchronizeFieldInputSelection } from '../text/controlled-input.js';
import { toTextEvent, type TextInput } from '../text.js';
import { getDateFieldPlaceholder } from './date-field.js';
import { getTimeFieldPlaceholder } from './time-field.js';

export { formatDateTimeRange, formatDateTimeValue } from '@sectile/temporal/date-time-field';
export type { DateTimeRange, DateTimeValue } from '@sectile/temporal/date-time-field';

export function getDateTimeFieldPlaceholder(format?: DateTimeFieldFormat): string {
  if (format === undefined) return 'YYYY-MM-DDTHH:mm';
  const date = getDateFieldPlaceholder(format.date), time = getTimeFieldPlaceholder(format.time);
  return format.order[0] === 'date' ? date + format.separator + time : time + format.separator + date;
}

export interface DateTimeFieldOptions {
  readonly input: HTMLInputElement;
  readonly policies?: DateTimeFieldPolicies;
  readonly value?: DateTimeValue | null;
  readonly defaultValue?: DateTimeValue | null;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
  readonly format?: DateTimeFieldFormat;
  readonly onValueChange?: (value: DateTimeValue | null) => boolean | void;
  readonly onInputStateChange?: (value: TextEditingState, previousValue: TextEditingState) => void;
  readonly onUpdate?: () => void;
}

export type DateTimeFieldValueChangeHandler = NonNullable<DateTimeFieldOptions['onValueChange']>;
export type DateTimeFieldInputStateChangeHandler = NonNullable<DateTimeFieldOptions['onInputStateChange']>;
export type DateTimeFieldUpdateHandler = NonNullable<DateTimeFieldOptions['onUpdate']>;

export interface DateTimeFieldControlledValues {
  readonly value?: DateTimeValue | null;
  readonly inputState?: TextEditingState;
}

export interface DateTimeFieldConnection {
  getActive(): boolean;
  suspend(): void;
  resume(): void;
  getSnapshot(): RevisionSnapshot<DateTimeFieldState>;
  getText(): string;
  getValue(): DateTimeValue | null;
  syncControlledValues(values: DateTimeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateTimeFieldState>>;
  handleEvent(event: DateTimeFieldEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createDateTimeField(
  options: DateTimeFieldOptions,
): FacadeConnection<DateTimeFieldConnection> {
  return unwrap(tryCreateDateTimeField(options));
}

export function tryCreateDateTimeField(
  options: DateTimeFieldOptions,
): DOMTemporalResult<FacadeConnection<DateTimeFieldConnection>> {
  return createDOMTemporalFacadeConnection(options, construct);
}

function construct(options: DateTimeFieldOptions): DOMTemporalResult<DateTimeFieldConnection> {
  const valueControlled = options.value !== undefined;
  const inputControlled = options.inputState !== undefined;
  const format = options.native === true ? undefined : options.format;
  const policies = Object.freeze({
    ...options.policies,
    ...(options.required === undefined ? {} : { required: options.required }),
  });
  const runtime = createDOMTemporalController<
    DateTimeFieldState,
    DateTimeFieldEvent,
    DateTimeFieldCommand,
    DateTimeFieldCommand
  >({
    initial: tryCreateDateTimeFieldState(
      options.value !== undefined ? options.value : options.defaultValue ?? null,
      options.inputState !== undefined ? options.inputState : options.defaultInputState,
      format,
    ),
    reducer: (state, event) => applyDateTimeFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateDateTimeFieldState(
      valueControlled ? previous.value : proposed.value,
      inputControlled ? previous.inputState : proposed.inputState,
      format,
    ),
    notify: (previous, proposed) => {
      if (!sameTextEditingState(previous.inputState, proposed.inputState)) {
        options.onInputStateChange?.(proposed.inputState, previous.inputState);
      }
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMDateTimeField(options, runtime.value, valueControlled, inputControlled) }
    : runtime;
}

class DOMDateTimeField implements DateTimeFieldConnection {
  readonly #options: DateTimeFieldOptions;
  readonly #runtime: DOMTemporalController<DateTimeFieldState, DateTimeFieldEvent, DateTimeFieldCommand>;
  readonly #valueControlled: boolean;
  readonly #inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #editable: boolean;

  readonly #keydown = (event: KeyboardEvent): void => {
    if (!this.getActive() || !this.#editable || this.#binding.isComposing || event.isComposing) return;
    if (this.#options.native === true && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) return;
    const semantic = event.key === 'ArrowUp'
      ? 'increment-segment'
      : event.key === 'ArrowDown'
        ? 'decrement-segment'
        : event.key === 'Enter'
          ? 'commit'
          : event.key === 'Escape'
            ? 'cancel'
            : null;
    if (semantic === null) return;
    event.preventDefault();
    if (semantic === 'increment-segment' || semantic === 'decrement-segment') {
      this.#syncSelection();
    }
    this.handleEvent(semantic);
  };

  readonly #blur = (): void => {
    if (this.getActive() && this.#editable && !this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };

  public constructor(
    options: DateTimeFieldOptions,
    runtime: DOMTemporalController<DateTimeFieldState, DateTimeFieldEvent, DateTimeFieldCommand>,
    valueControlled: boolean,
    inputControlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#inputControlled = inputControlled;
    this.#editable = permitsInteraction({ disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }, 'mutate');
    this.#binding = new DOMTextElementBinding({
      element: options.input,
      getState: () => this.getSnapshot().state.inputState,
      dispatch: (input) => this.#text(input),
      keydown: this.#keydown, blur: this.#blur,
    });
    this.refresh();
  }
  public getActive(): boolean { return this.#binding.isActive; }
  public suspend(): void { this.#binding.suspend(); }
  public resume(): void { this.#binding.resume(); try { if (this.getActive()) this.refresh(); } catch (error) { this.suspend(); throw error; } }

  public getSnapshot(): RevisionSnapshot<DateTimeFieldState> {
    return this.#runtime.getSnapshot();
  }

  public getText(): string {
    return this.getSnapshot().state.inputState.snapshot.text;
  }

  public getValue(): DateTimeValue | null {
    return this.getSnapshot().state.value;
  }

  public syncControlledValues(
    values: DateTimeFieldControlledValues,
  ): DOMTemporalResult<RevisionSnapshot<DateTimeFieldState>> {
    if (
      this.#valueControlled !== (values.value !== undefined)
      || this.#inputControlled !== (values.inputState !== undefined)
    ) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'controlled-shape-mismatch',
          message: 'Controlled date-time field values must preserve their construction-time shape.',
        },
      };
    }
    const state = this.getSnapshot().state;
    const value = this.#valueControlled ? values.value as DateTimeValue | null : state.value;
    const admitted = tryCreateDateTimeFieldState(value, this.#inputControlled ? values.inputState : state.inputState, state.format);
    if (!admitted.ok) return admitted;
    const next = admitted.value.value;
    const inputState = this.#inputControlled
      ? values.inputState as TextEditingState
      : synchronizeControlledFieldInput(
        synchronizeFieldInputSelection(state.inputState, this.#options.input),
        state.value === null ? '' : formatDateTimeFieldValue(state.value, state.format),
        next === null ? '' : formatDateTimeFieldValue(next, state.format),
      );
    const result = this.#runtime.replace(tryCreateDateTimeFieldState(
      next,
      inputState,
      state.format,
    ));
    if (result.ok) {
      this.refresh();
      this.#options.onUpdate?.();
    }
    return result;
  }

  public handleEvent(event: DateTimeFieldEvent): boolean {
    const previous = this.getSnapshot();
    const result = this.#runtime.handle(event);
    setFieldValidity(this.#options.input, result);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'value-committed' && this.#options.onValueChange?.(command.value) === false) {
          this.#runtime.replace({ ok: true, value: previous.state });
          this.refresh();
          setFieldValidity(this.#options.input, { ok: false, error: { message: 'The parent control rejected the date-time value.' } });
          this.#options.onUpdate?.();
          return false;
        }
      }
      this.refresh();
      this.#options.onUpdate?.();
    }
    return result.ok;
  }

  public refresh(): void {
    const input = this.#options.input;
    input.type = this.#options.native === true ? 'datetime-local' : 'text';
    input.inputMode = this.#options.native === true ? '' : 'text';
    input.placeholder = this.#options.native === true ? '' : getDateTimeFieldPlaceholder(this.getSnapshot().state.format);
    input.required = this.#options.required ?? this.#options.policies?.required ?? false;
    setInteractionAttributes(input, this.#options, true, true);
    if (this.#options.label !== undefined) input.setAttribute('aria-label', this.#options.label);
    this.#binding.render();
  }

  public disconnect(): void {
    this.#binding.disconnect();
  }

  #text(input: TextInput): boolean {
    const event = toTextEvent(input);
    return event !== null && this.handleEvent({ type: 'text', event });
  }

  #syncSelection(): void {
    this.handleEvent({ type: 'text', event: nativeFieldSelectionEvent(this.#options.input) });
  }
}
