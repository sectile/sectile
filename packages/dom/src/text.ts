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
import { DOMTextElementBinding } from './internal/text-element.js';
import { setInteractionAttributes } from './internal/interaction.js';

export type TextInput =
  | {
      readonly type: 'beforeinput';
      readonly inputType: string;
      readonly data?: string | null;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'input';
      readonly inputType: string;
      readonly text: string;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'composition-start';
      readonly text: string;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'composition-update';
      readonly text: string;
      readonly selection: TextSelectionInput;
    }
  | { readonly type: 'composition-commit' }
  | { readonly type: 'composition-cancel' };

export interface TextValueChangeDetails {
  readonly value: TextEditingState;
  readonly previousValue: TextEditingState;
}

export type TextState = TextEditingState;

export function createTextState(value = ''): TextEditingState {
  return createTextEditingState(value, {
    anchorCodeUnitOffset: value.length,
    focusCodeUnitOffset: value.length,
  });
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

export type TextElement = HTMLInputElement | HTMLTextAreaElement;

export interface TextConnectionOptions {
  readonly controller: TextController;
  readonly element: TextElement;
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
  handleEvent(input: TextInput): boolean;
  handleBeforeInput(event: InputEvent): boolean;
  render(): void;
  disconnect(): void;
}

export type TextOptions = TextControllerOptions & Omit<TextConnectionOptions, 'controller'>;

export function createTextController(options: TextControllerOptions = {}): Result<TextController> {
  const requested = options.value !== undefined ? options.value : options.defaultValue;
  const initial = requested === undefined
    ? tryCreateTextEditingState()
    : normalizeTextEditingState(requested);
  if (!initial.ok) return initial;
  let controller: DOMTextController;
  const runtime = createSemanticController<TextEditingState, TextEvent, never, never>({
    initial,
    reducer: (state, event) => controller.reduce(state, event),
    reconcile: (previous, proposed) => controller.reconcile(previous, proposed),
    notify: (previous, proposed) => controller.notify(previous, proposed),
    toEffect: impossibleEffect,
    interaction: options,
    interactionIntent: () => 'mutate',
  });
  if (!runtime.ok) return runtime;
  controller = new DOMTextController(options, runtime.value);
  return { ok: true, value: controller };
}

export function createText(options: TextOptions): FacadeConnection<TextConnection> {
  return unwrap(tryCreateText(options));
}

export function tryCreateText(options: TextOptions): Result<FacadeConnection<TextConnection>> {
  return createFacadeConnection(options, (options) => tryCreateTextConnection(options));
}

function tryCreateTextConnection(options: TextOptions): Result<TextConnection> {
  const controller = createTextController(options);
  if (!controller.ok) return controller;
  return { ok: true, value: connectText({ ...options, controller: controller.value }) };
}

export function connectText(options: TextConnectionOptions): TextConnection {
  return new DOMTextConnection(options);
}

export function toTextEvent(input: TextInput): TextEvent | null {
  if (typeof input !== 'object' || input === null) return null;
  if (input.type === 'input') {
    if (typeof input.inputType !== 'string' || typeof input.text !== 'string') return null;
    return Object.freeze({
      type: 'replace',
      startCodeUnitOffset: input.startCodeUnitOffset,
      endCodeUnitOffset: input.endCodeUnitOffset,
      text: input.text,
      selection: input.selection,
    });
  }
  if (input.type === 'beforeinput') {
    const deletion = input.inputType === 'deleteContentBackward'
      || input.inputType === 'deleteContentForward'
      || input.inputType === 'deleteByCut';
    const insertion = input.inputType === 'insertText'
      || input.inputType === 'insertFromPaste'
      || input.inputType === 'insertReplacementText';
    if (!deletion && !insertion) return null;
    if (insertion && typeof input.data !== 'string') return null;
    return Object.freeze({
      type: 'replace',
      startCodeUnitOffset: input.startCodeUnitOffset,
      endCodeUnitOffset: input.endCodeUnitOffset,
      text: deletion ? '' : input.data as string,
      selection: input.selection,
    });
  }
  if (input.type === 'composition-start') {
    if (typeof input.text !== 'string') return null;
    return Object.freeze({
      type: 'composition-start',
      startCodeUnitOffset: input.startCodeUnitOffset,
      endCodeUnitOffset: input.endCodeUnitOffset,
      text: input.text,
      selection: input.selection,
    });
  }
  if (input.type === 'composition-update') {
    if (typeof input.text !== 'string') return null;
    return Object.freeze({
      type: 'composition-update',
      text: input.text,
      selection: input.selection,
    });
  }
  if (input.type === 'composition-commit') return Object.freeze({ type: input.type });
  if (input.type === 'composition-cancel') return Object.freeze({ type: input.type });
  return null;
}

class DOMTextConnection implements TextConnection {
  readonly #controller: TextController;
  readonly #onTransition: ((details: TextTransitionDetails) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #binding: DOMTextElementBinding;

  public constructor(options: TextConnectionOptions) {
    this.#controller = options.controller;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#binding = new DOMTextElementBinding({
      element: options.element,
      getState: () => this.#controller.getSnapshot().state,
      dispatch: (input) => this.#dispatch(input).ok,
    });
    setInteractionAttributes(options.element, options, { native: true, readOnly: true });
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
    if (result.ok) {
      this.render();
      this.#onUpdate?.();
    }
    return result;
  }

  public handleBeforeInput(event: InputEvent): boolean {
    return this.#binding.handleBeforeInput(event);
  }

  public handleEvent(input: TextInput): boolean {
    const result = this.#dispatch(input);
    if (result.ok) this.render();
    return result.ok;
  }

  public render(): void {
    this.#binding.render();
  }

  public disconnect(): void {
    this.#binding.disconnect();
  }

  #dispatch(input: TextInput): RevisionResult<TextEditingState, never> {
    const result = this.#controller.handleTextInput(input);
    this.#onTransition?.(Object.freeze({ input, result }));
    if (result.ok) this.#onUpdate?.();
    return result;
  }
}

class DOMTextController implements TextController {
  readonly #controlled: boolean;
  readonly #onValueChange: ((change: TextValueChangeDetails) => void) | undefined;
  readonly #runtime: SemanticController<TextEditingState, TextEvent, never>;
  #pendingComposition: TextEditingState | null = null;

  public constructor(
    options: TextControllerOptions,
    runtime: SemanticController<TextEditingState, TextEvent, never>,
  ) {
    this.#controlled = options.value !== undefined;
    this.#onValueChange = options.onValueChange;
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
    const snapshot = this.#runtime.replace(normalizeTextEditingState(values.value));
    if (!snapshot.ok) return snapshot;
    this.#pendingComposition = snapshot.value.state.composition === null
      ? null
      : snapshot.value.state;
    return snapshot;
  }

  public handleTextInput(
    input: TextInput,
    expectedRevision = this.#runtime.getSnapshot().revision,
  ): RevisionResult<TextEditingState, never> {
    const event = toTextEvent(input);
    if (event === null) {
      return this.#runtime.reject('unsupported-dom-text-input', 'DOM text input does not map to a semantic text event.');
    }
    return this.#runtime.handle(event, expectedRevision);
  }

  public reduce(state: TextEditingState, event: TextEvent) {
    return applyTextEvent(this.#controlled && this.#pendingComposition !== null ? this.#pendingComposition : state, event);
  }

  public reconcile(previous: TextEditingState, proposed: TextEditingState): Result<TextEditingState> {
    if (this.#controlled) this.#pendingComposition = proposed.composition === null ? null : proposed;
    return normalizeTextEditingState(this.#controlled ? previous : proposed);
  }

  public notify(previous: TextEditingState, proposed: TextEditingState): void {
    if (!sameTextEditingState(previous, proposed)) {
      this.#onValueChange?.(Object.freeze({ value: proposed, previousValue: previous }));
    }
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
