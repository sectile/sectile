import type { Result, SectileError } from '@sectile/primitives';
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

export function createTextController(options: TextControllerOptions = {}): Result<TextController> {
  const requested = options.value !== undefined ? options.value : options.defaultValue;
  const initial = requested === undefined
    ? createTextEditingState()
    : normalizeTextEditingState(requested);
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new TerminalTextController(options, snapshot.value) };
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

class TerminalTextController implements TextController {
  readonly #controlled: boolean;
  readonly #onValueChange: ((change: TextValueChangeDetails) => void) | undefined;
  #snapshot: RevisionSnapshot<TextEditingState>;

  public constructor(
    options: TextControllerOptions,
    snapshot: RevisionSnapshot<TextEditingState>,
  ) {
    this.#controlled = options.value !== undefined;
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
