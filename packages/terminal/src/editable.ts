import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyEditableEvent,
  tryCreateEditableState,
  type EditableCommand,
  type EditableEvent,
  type EditablePolicies,
  type EditableState,
} from '@sectile/core/editable';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { applyTerminalTextInput, type TerminalKeyboardInput } from './keyboard.js';

export interface EditableOptions {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly policies?: EditablePolicies;
  readonly onValueChange?: (value: string) => void;
  readonly onEditingChange?: (editing: boolean) => void;
  readonly onUpdate?: () => void;
}

export type EditableValueChangeHandler = NonNullable<EditableOptions['onValueChange']>;
export type EditableEditingChangeHandler = NonNullable<EditableOptions['onEditingChange']>;
export type EditableUpdateHandler = NonNullable<EditableOptions['onUpdate']>;

export interface EditableConnection {
  getSnapshot(): RevisionSnapshot<EditableState>;
  syncControlledValue(value: string): Result<RevisionSnapshot<EditableState>>;
  handleEvent(event: EditableEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createEditable(options: EditableOptions = {}): FacadeConnection<EditableConnection> {
  return unwrap(tryCreateEditable(options));
}

export function tryCreateEditable(options: EditableOptions = {}): Result<FacadeConnection<EditableConnection>> {
  return createFacadeConnection(options, (resolved) => tryCreateEditableConnection(resolved));
}

function tryCreateEditableConnection(options: EditableOptions): Result<EditableConnection> {
  const controlled = options.value !== undefined;
  const runtime = createSemanticController<EditableState, EditableEvent, EditableCommand, EditableCommand>({
    initial: tryCreateEditableState(options.value ?? options.defaultValue ?? ''),
    reducer: (state, event) => applyEditableEvent(state, event, options.policies),
    reconcile: (previous, proposed) => tryCreateEditableState(
      controlled ? previous.value : proposed.value,
      proposed.editing ? proposed.draft : controlled ? previous.value : proposed.value,
      proposed.editing,
    ),
    notify: (previous, proposed) => {
      if (previous.value !== proposed.value) options.onValueChange?.(proposed.value);
      if (previous.editing !== proposed.editing) options.onEditingChange?.(proposed.editing);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new TerminalEditable(options, runtime.value, controlled) }
    : runtime;
}

class TerminalEditable implements EditableConnection {
  readonly #options: EditableOptions;
  readonly #runtime: SemanticController<EditableState, EditableEvent, EditableCommand>;
  readonly #controlled: boolean;

  public constructor(
    options: EditableOptions,
    runtime: SemanticController<EditableState, EditableEvent, EditableCommand>,
    controlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#controlled = controlled;
  }

  public getSnapshot(): RevisionSnapshot<EditableState> {
    return this.#runtime.getSnapshot();
  }

  public syncControlledValue(value: string): Result<RevisionSnapshot<EditableState>> {
    if (!this.#controlled) {
      return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled editable cannot be synchronized externally.' } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateEditableState(value, state.editing ? state.draft : value, state.editing));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: EditableEvent): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (input.key === 'enter') return this.handleEvent(this.getSnapshot().state.editing ? 'commit' : 'start-edit');
    if (input.key === 'escape') return this.handleEvent('cancel');
    if (!this.getSnapshot().state.editing) return false;
    const draft = applyTerminalTextInput(this.getSnapshot().state.draft, input);
    return draft === null ? false : this.handleEvent({ type: 'input', text: draft });
  }
}
