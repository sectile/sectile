import type { Result, SectileError } from '@sectile/primitives';
import { createInteractionState, requireInteraction, type InteractionState } from '@sectile/primitives/interaction';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import {
  applyTextEvent,
  createTextEditingState,
  normalizeTextEditingState,
  type TextEditingState,
  type TextEvent,
  type TextSelectionInput,
} from '@sectile/primitives/text';
import {
  applyControllerEvent,
  sameControllerState,
  synchronizeControllerState,
} from './internal/controller.js';
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
    ? createTextEditingState()
    : normalizeTextEditingState(requested);
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = createInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new TerminalTextController(options, interaction.value, snapshot.value) };
}

export function createText(options: TextOptions = {}): Result<TextConnection> {
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
        code: 'unsupported-terminal-text-input',
        message: 'Terminal text input does not map to a semantic text event.',
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
