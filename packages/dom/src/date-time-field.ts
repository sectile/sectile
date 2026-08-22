import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import {
  applyDateTimeFieldEvent,
  createDateTimeFieldState,
  type DateTimeFieldCommand,
  type DateTimeFieldEvent,
  type DateTimeFieldPolicies,
  type DateTimeFieldState,
  type DateTimeValue,
} from '@sectile/core/date-time-field';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setFieldValidity, setInteractionAttributes } from './internal/interaction.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { toTextEvent, type TextInput } from './text.js';

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
  readonly onValueChange?: (value: DateTimeValue | null) => void;
  readonly onInputStateChange?: (value: TextEditingState, previousValue: TextEditingState) => void;
  readonly onUpdate?: () => void;
}

export interface DateTimeFieldControlledValues {
  readonly value?: DateTimeValue | null;
  readonly inputState?: TextEditingState;
}

export interface DateTimeFieldConnection {
  getSnapshot(): RevisionSnapshot<DateTimeFieldState>;
  getText(): string;
  getValue(): DateTimeValue | null;
  syncControlledValues(values: DateTimeFieldControlledValues): Result<RevisionSnapshot<DateTimeFieldState>>;
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
): Result<FacadeConnection<DateTimeFieldConnection>> {
  return createFacadeConnection(options, construct);
}

function construct(options: DateTimeFieldOptions): Result<DateTimeFieldConnection> {
  const valueControlled = options.value !== undefined;
  const inputControlled = options.inputState !== undefined;
  const policies = Object.freeze({
    ...options.policies,
    ...(options.required === undefined ? {} : { required: options.required }),
  });
  const runtime = createSemanticController<
    DateTimeFieldState,
    DateTimeFieldEvent,
    DateTimeFieldCommand,
    DateTimeFieldCommand
  >({
    initial: createDateTimeFieldState(
      options.value !== undefined ? options.value : options.defaultValue ?? null,
      options.inputState !== undefined ? options.inputState : options.defaultInputState,
    ),
    reducer: (state, event) => applyDateTimeFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => createDateTimeFieldState(
      valueControlled ? previous.value : proposed.value,
      inputControlled ? previous.inputState : proposed.inputState,
    ),
    notify: (previous, proposed) => {
      if (JSON.stringify(previous.inputState) !== JSON.stringify(proposed.inputState)) {
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
  readonly options: DateTimeFieldOptions;
  readonly runtime: SemanticController<DateTimeFieldState, DateTimeFieldEvent, DateTimeFieldCommand>;
  readonly valueControlled: boolean;
  readonly inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;

  readonly #keydown = (event: KeyboardEvent): void => {
    if (this.#binding.isComposing || event.isComposing) return;
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
    if (!this.#binding.isComposing && !this.handleEvent('commit')) this.handleEvent('cancel');
  };

  public constructor(
    options: DateTimeFieldOptions,
    runtime: SemanticController<DateTimeFieldState, DateTimeFieldEvent, DateTimeFieldCommand>,
    valueControlled: boolean,
    inputControlled: boolean,
  ) {
    this.options = options;
    this.runtime = runtime;
    this.valueControlled = valueControlled;
    this.inputControlled = inputControlled;
    this.#binding = new DOMTextElementBinding({
      element: options.input,
      getState: () => this.getSnapshot().state.inputState,
      dispatch: (input) => this.#text(input),
    });
    options.input.addEventListener('keydown', this.#keydown);
    options.input.addEventListener('blur', this.#blur);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<DateTimeFieldState> {
    return this.runtime.getSnapshot();
  }

  public getText(): string {
    return this.getSnapshot().state.inputState.snapshot.text;
  }

  public getValue(): DateTimeValue | null {
    return this.getSnapshot().state.value;
  }

  public syncControlledValues(
    values: DateTimeFieldControlledValues,
  ): Result<RevisionSnapshot<DateTimeFieldState>> {
    if (
      this.valueControlled !== (values.value !== undefined)
      || this.inputControlled !== (values.inputState !== undefined)
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
    const result = this.runtime.replace(createDateTimeFieldState(
      this.valueControlled ? values.value as DateTimeValue | null : state.value,
      this.inputControlled ? values.inputState as TextEditingState : state.inputState,
    ));
    if (result.ok) {
      this.refresh();
      this.options.onUpdate?.();
    }
    return result;
  }

  public handleEvent(event: DateTimeFieldEvent): boolean {
    const result = this.runtime.handle(event);
    setFieldValidity(this.options.input, result);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'value-committed') this.options.onValueChange?.(command.value);
      }
      this.refresh();
      this.options.onUpdate?.();
    }
    return result.ok;
  }

  public refresh(): void {
    const input = this.options.input;
    input.type = 'text';
    input.inputMode = 'text';
    input.placeholder = 'YYYY-MM-DDTHH:mm';
    input.required = this.options.required ?? this.options.policies?.required ?? false;
    setInteractionAttributes(input, this.options, { native: true, readOnly: true });
    if (this.options.label !== undefined) input.setAttribute('aria-label', this.options.label);
    this.#binding.render();
  }

  public disconnect(): void {
    this.#binding.disconnect();
    this.options.input.removeEventListener('keydown', this.#keydown);
    this.options.input.removeEventListener('blur', this.#blur);
  }

  #text(input: TextInput): boolean {
    const event = toTextEvent(input);
    return event !== null && this.handleEvent({ type: 'text', event });
  }

  #syncSelection(): void {
    const input = this.options.input;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    const backward = input.selectionDirection === 'backward';
    this.handleEvent({
      type: 'text',
      event: {
        type: 'replace',
        startCodeUnitOffset: backward ? end : start,
        endCodeUnitOffset: backward ? end : start,
        text: '',
        selection: {
          anchorCodeUnitOffset: backward ? end : start,
          focusCodeUnitOffset: backward ? start : end,
        },
      },
    });
  }
}
