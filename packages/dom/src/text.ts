import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError } from '@sectile/core';
import { tryCreateInteractionState, requireInteraction, type InteractionState } from '@sectile/core/interaction';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import {
  applyTextEvent,
  createTextEditingState,
  normalizeTextEditingState,
  tryCreateTextEditingState,
  type TextEditingState,
  type TextEvent,
  type TextSelectionInput,
} from '@sectile/core/text';
import {
  applyControllerEvent,
  sameControllerState,
  synchronizeControllerState,
} from './internal/controller.js';
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

export interface TextConnection {
  getSnapshot(): RevisionSnapshot<TextEditingState>;
  getValue(): string;
  syncControlledValues(
    values: TextControlledValues,
  ): Result<RevisionSnapshot<TextEditingState>>;
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
  const snapshot = tryCreateRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = tryCreateInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new DOMTextController(options, interaction.value, snapshot.value) };
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
  readonly #interaction: InteractionState;
  readonly #onValueChange: ((change: TextValueChangeDetails) => void) | undefined;
  #snapshot: RevisionSnapshot<TextEditingState>;

  public constructor(
    options: TextControllerOptions,
    interaction: InteractionState,
    snapshot: RevisionSnapshot<TextEditingState>,
  ) {
    this.#controlled = options.value !== undefined;
    this.#interaction = interaction;
    this.#onValueChange = options.onValueChange;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<TextEditingState> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: TextControlledValues,
  ): Result<RevisionSnapshot<TextEditingState>> {
    const error = controlledInputError(this.#controlled);
    if (error !== null) return { ok: false, error };
    const snapshot = synchronizeControllerState(
      this.#snapshot,
      normalizeTextEditingState(values.value),
    );
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleTextInput(
    input: TextInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<TextEditingState, never> {
    const permitted = requireInteraction(this.#interaction, 'mutate');
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const event = toTextEvent(input);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-text-input',
        message: 'DOM text input does not map to a semantic text event.',
      });
    }
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      applyTextEvent,
      (previous, proposed) => normalizeTextEditingState(
        this.#controlled ? previous : proposed,
      ),
      (previous, proposed) => {
        if (!sameControllerState(previous, proposed)) {
          this.#onValueChange?.(Object.freeze({ value: proposed, previousValue: previous }));
        }
      },
      impossibleEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
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
