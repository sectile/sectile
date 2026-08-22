import type { Result } from '@sectile/primitives';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import type { TextEditingState } from '@sectile/primitives/text';
import {
  applyNumberFieldEvent,
  createNumberFieldState,
  type NumberFieldCommand,
  type NumberFieldEvent,
  type NumberFieldPolicies,
  type NumberFieldState,
} from '@sectile/primitives/number-field';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { toTextEvent, type TextInput } from './text.js';

export interface NumberFieldValueChangeDetails {
  readonly value: string | null;
  readonly expression: string;
}

export interface NumberFieldInputStateChangeDetails {
  readonly value: TextEditingState;
  readonly previousValue: TextEditingState;
}

export interface NumberFieldOptions {
  readonly input: HTMLInputElement;
  readonly policies?: NumberFieldPolicies;
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly inputMode?: 'decimal' | 'text';
  readonly onValueChange?: (details: NumberFieldValueChangeDetails) => void;
  readonly onInputStateChange?: (details: NumberFieldInputStateChangeDetails) => void;
  readonly onUpdate?: () => void;
}

export interface NumberFieldControlledValues {
  readonly value?: string | null;
  readonly inputState?: TextEditingState;
}

export interface NumberFieldConnection {
  getSnapshot(): RevisionSnapshot<NumberFieldState>;
  getText(): string;
  getValue(): string | null;
  syncControlledValues(values: NumberFieldControlledValues): Result<RevisionSnapshot<NumberFieldState>>;
  handleEvent(event: NumberFieldEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createNumberField(options: NumberFieldOptions): Result<NumberFieldConnection> {
  const valueControlled = options.value !== undefined;
  const inputControlled = options.inputState !== undefined;
  const required = options.required ?? options.policies?.required;
  const policies: NumberFieldPolicies = Object.freeze({
    ...options.policies,
    ...(required === undefined ? {} : { required }),
  });
  const runtime = createSemanticController<NumberFieldState, NumberFieldEvent, NumberFieldCommand, NumberFieldCommand>({
    initial: createNumberFieldState(
      options.value !== undefined ? options.value : options.defaultValue ?? null,
      options.inputState !== undefined ? options.inputState : options.defaultInputState,
    ),
    reducer: (state, event) => applyNumberFieldEvent(state, event, policies),
    reconcile: (previous, proposed) => createNumberFieldState(
      valueControlled ? previous.value : proposed.value,
      inputControlled ? previous.inputState : proposed.inputState,
    ),
    notify: (previous, proposed) => {
      if (!sameInputState(previous.inputState, proposed.inputState)) {
        options.onInputStateChange?.(Object.freeze({
          value: proposed.inputState,
          previousValue: previous.inputState,
        }));
      }
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMNumberField(options, runtime.value, valueControlled, inputControlled) }
    : runtime;
}

class DOMNumberField implements NumberFieldConnection {
  readonly #options: NumberFieldOptions;
  readonly #runtime: SemanticController<NumberFieldState, NumberFieldEvent, NumberFieldCommand>;
  readonly #valueControlled: boolean;
  readonly #inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #keydown = (event: KeyboardEvent): void => {
    if (this.#binding.isComposing || event.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleEvent('commit');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.handleEvent('cancel');
    }
  };
  readonly #blur = (): void => {
    if (!this.#binding.isComposing) this.handleEvent('commit');
  };

  public constructor(
    options: NumberFieldOptions,
    runtime: SemanticController<NumberFieldState, NumberFieldEvent, NumberFieldCommand>,
    valueControlled: boolean,
    inputControlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#inputControlled = inputControlled;
    this.#binding = new DOMTextElementBinding({
      element: options.input,
      getState: () => this.getSnapshot().state.inputState,
      dispatch: (input) => this.#handleTextInput(input),
    });
    options.input.addEventListener('keydown', this.#keydown);
    options.input.addEventListener('blur', this.#blur);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<NumberFieldState> {
    return this.#runtime.getSnapshot();
  }

  public getText(): string {
    return this.getSnapshot().state.inputState.snapshot.text;
  }

  public getValue(): string | null {
    return this.getSnapshot().state.value;
  }

  public syncControlledValues(values: NumberFieldControlledValues): Result<RevisionSnapshot<NumberFieldState>> {
    if (this.#valueControlled !== (values.value !== undefined)
      || this.#inputControlled !== (values.inputState !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled number field values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(createNumberFieldState(
      this.#valueControlled ? values.value as string | null : state.value,
      this.#inputControlled ? values.inputState as TextEditingState : state.inputState,
    ));
    if (result.ok) {
      this.refresh();
      this.#options.onUpdate?.();
    }
    return result;
  }

  public handleEvent(event: NumberFieldEvent): boolean {
    const result = this.#runtime.handle(event);
    this.#options.input.setAttribute('aria-invalid', String(!result.ok && event === 'commit'));
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'value-committed') {
          this.#options.onValueChange?.(Object.freeze({ value: command.value, expression: command.expression }));
        }
      }
      this.refresh();
      this.#options.onUpdate?.();
    }
    return result.ok;
  }

  public refresh(): void {
    const input = this.#options.input;
    input.type = 'text';
    input.inputMode = this.#options.inputMode ?? 'decimal';
    input.required = this.#options.required ?? this.#options.policies?.required ?? false;
    setInteractionAttributes(input, this.#options, { native: true, readOnly: true });
    if (this.#options.label !== undefined) input.setAttribute('aria-label', this.#options.label);
    this.#binding.render();
  }

  public disconnect(): void {
    this.#binding.disconnect();
    this.#options.input.removeEventListener('keydown', this.#keydown);
    this.#options.input.removeEventListener('blur', this.#blur);
  }

  #handleTextInput(input: TextInput): boolean {
    const event = toTextEvent(input);
    return event !== null && this.handleEvent({ type: 'text', event });
  }
}

function sameInputState(left: TextEditingState, right: TextEditingState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
