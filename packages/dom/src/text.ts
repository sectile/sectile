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
      readonly type: 'beforeinput';
      readonly inputType: string;
      readonly data?: string | null;
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
  return { ok: true, value: new DOMTextController(options, snapshot.value) };
}

export function toTextEvent(input: TextInput): TextEvent | null {
  if (typeof input !== 'object' || input === null) return null;
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

class DOMTextController implements TextController {
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
