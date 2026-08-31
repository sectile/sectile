import { createFacadeConnection, createSemanticController, type FacadeConnection, type SemanticController } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError } from '@sectile/core';
import {
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import {
  applyTextEvent,
  createTextEditingState,
  normalizeTextEditingState,
  sameTextEditingState,
  tryCreateTextEditingState,
  type TextEditingState,
  type TextEvent,
  type TextSelectionInput,
} from '@sectile/core/text';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toTerminalTextInput } from './internal/text-input.js';

export type TextInput =
  | {
      readonly type: 'insert' | 'replace';
      readonly text: string;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'delete';
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    };

export interface TextValueChangeDetails {
  readonly value: TextEditingState;
  readonly previousValue: TextEditingState;
}

export interface TextControllerOptions {
  readonly value?: TextEditingState;
  readonly defaultValue?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onValueChange?: (change: TextValueChangeDetails) => void;
}

export type TextControllerValueChangeHandler = NonNullable<TextControllerOptions['onValueChange']>;

export interface TextControlledValues {
  readonly value: TextEditingState;
}

export interface TextController {
  getSnapshot(): RevisionSnapshot<TextEditingState>;
  syncControlledValues(
    values: TextControlledValues,
  ): Result<RevisionSnapshot<TextEditingState>>;
  handleTextInput(
    input: TextInput,
    expectedRevision?: number,
  ): RevisionResult<TextEditingState, never>;
}

export interface TextTransitionDetails {
  readonly input: TextInput;
  readonly result: RevisionResult<TextEditingState, never>;
}

export interface TextConnectionOptions {
  readonly controller: TextController;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onTransition?: (details: TextTransitionDetails) => void;
  readonly onUpdate?: () => void;
}

export type TextConnectionTransitionHandler = NonNullable<TextConnectionOptions['onTransition']>;
export type TextConnectionUpdateHandler = NonNullable<TextConnectionOptions['onUpdate']>;

export interface TextConnection {
  getSnapshot(): RevisionSnapshot<TextEditingState>;
  getValue(): string;
  syncControlledValues(
    values: TextControlledValues,
  ): Result<RevisionSnapshot<TextEditingState>>;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export type TextOptions = TextControllerOptions & Omit<TextConnectionOptions, 'controller'>;

export function createTextController(options: TextControllerOptions = {}): Result<TextController> {
  const requested = options.value !== undefined ? options.value : options.defaultValue;
  const initial = requested === undefined
    ? tryCreateTextEditingState()
    : normalizeTextEditingState(requested);
  if (!initial.ok) return initial;
  const controlled = options.value !== undefined;
  const runtime = createSemanticController<TextEditingState, TextEvent, never, never>({
    initial,
    reducer: applyTextEvent,
    reconcile: (previous, proposed) => normalizeTextEditingState(controlled ? previous : proposed),
    notify: (previous, proposed) => {
      if (!sameTextEditingState(previous, proposed)) {
        options.onValueChange?.(Object.freeze({ value: proposed, previousValue: previous }));
      }
    },
    toEffect: impossibleEffect,
    interaction: options,
    interactionIntent: () => 'mutate',
  });
  return runtime.ok
    ? { ok: true, value: new TerminalTextController(options, runtime.value) }
    : runtime;
}

export function createText(options: TextOptions = {}): FacadeConnection<TextConnection> {
  return unwrap(tryCreateText(options));
}

export function tryCreateText(options: TextOptions = {}): Result<FacadeConnection<TextConnection>> {
  return createFacadeConnection(options, (options) => tryCreateTextConnection(options));
}

function tryCreateTextConnection(options: TextOptions = {}): Result<TextConnection> {
  const controller = createTextController(options);
  if (!controller.ok) return controller;
  return { ok: true, value: connectText({ ...options, controller: controller.value }) };
}

export function connectText(options: TextConnectionOptions): TextConnection {
  return new TerminalTextConnection(options);
}

export function toTextEvent(input: TextInput): TextEvent | null {
  if (typeof input !== 'object' || input === null) return null;
  if (input.type !== 'insert' && input.type !== 'replace' && input.type !== 'delete') return null;
  if (input.type !== 'delete' && typeof input.text !== 'string') return null;
  return Object.freeze({
    type: 'replace',
    startCodeUnitOffset: input.startCodeUnitOffset,
    endCodeUnitOffset: input.endCodeUnitOffset,
    text: input.type === 'delete' ? '' : input.text,
    selection: input.selection,
  });
}

class TerminalTextConnection implements TextConnection {
  readonly #controller: TextController;
  readonly #onTransition: ((details: TextTransitionDetails) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;

  public constructor(options: TextConnectionOptions) {
    this.#controller = options.controller;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
  }

  public getSnapshot(): RevisionSnapshot<TextEditingState> {
    return this.#controller.getSnapshot();
  }

  public getValue(): string {
    return this.#controller.getSnapshot().state.snapshot.text;
  }

  public syncControlledValues(
    values: TextControlledValues,
  ): Result<RevisionSnapshot<TextEditingState>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const semanticInput = toTerminalTextInput(this.#controller.getSnapshot().state, input);
    if (semanticInput === null) return false;
    const result = this.#controller.handleTextInput(semanticInput);
    this.#onTransition?.(Object.freeze({ input: semanticInput, result }));
    if (result.ok) this.#onUpdate?.();
    return result.ok;
  }
}

class TerminalTextController implements TextController {
  readonly #controlled: boolean;
  readonly #runtime: SemanticController<TextEditingState, TextEvent, never>;

  public constructor(
    options: TextControllerOptions,
    runtime: SemanticController<TextEditingState, TextEvent, never>,
  ) {
    this.#controlled = options.value !== undefined;
    this.#runtime = runtime;
  }

  public getSnapshot(): RevisionSnapshot<TextEditingState> {
    return this.#runtime.getSnapshot();
  }

  public syncControlledValues(
    values: TextControlledValues,
  ): Result<RevisionSnapshot<TextEditingState>> {
    const error = controlledInputError(this.#controlled);
    if (error !== null) return { ok: false, error };
    return this.#runtime.replace(normalizeTextEditingState(values.value));
  }

  public handleTextInput(
    input: TextInput,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<TextEditingState, never> {
    const event = toTextEvent(input);
    if (event === null) {
      return this.#runtime.reject('unsupported-terminal-text-input', 'Terminal text input does not map to a semantic text event.');
    }
    return this.#runtime.handle(event, expectedRevision);
  }
}

function controlledInputError(controlled: boolean): SectileError | null {
  return controlled
    ? null
    : {
        class: 'construction',
        code: 'uncontrolled-value-update',
        message: 'Uncontrolled text state cannot be synchronized externally.',
      };
}

function impossibleEffect(command: never): never {
  return command;
}
