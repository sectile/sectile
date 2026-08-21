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

export interface TextTransitionDetails {
  readonly input: TextInput;
  readonly result: RevisionResult<TextEditingState, never>;
}

export type TextElement = HTMLInputElement | HTMLTextAreaElement;

export interface TextConnectionOptions {
  readonly controller: TextController;
  readonly element: TextElement;
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
    ? createTextEditingState()
    : normalizeTextEditingState(requested);
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMTextController(options, snapshot.value) };
}

export function createText(options: TextOptions): Result<TextConnection> {
  const controller = createTextController(options);
  if (!controller.ok) return controller;
  return { ok: true, value: connectText({ ...options, controller: controller.value }) };
}

export function connectText(options: TextConnectionOptions): TextConnection {
  return new DOMTextConnection(options);
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

class DOMTextConnection implements TextConnection {
  readonly #controller: TextController;
  readonly #element: TextElement;
  readonly #onTransition: ((details: TextTransitionDetails) => void) | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #handleBeforeInputEvent: (event: Event) => void;
  readonly #handleCompositionStart: (event: Event) => void;
  readonly #handleCompositionUpdate: (event: Event) => void;
  readonly #handleCompositionEnd: (event: Event) => void;
  #composing = false;
  #compositionStart = 0;

  public constructor(options: TextConnectionOptions) {
    this.#controller = options.controller;
    this.#element = options.element;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#handleBeforeInputEvent = (event): void => {
      if (this.handleBeforeInput(event as InputEvent)) event.preventDefault();
    };
    this.#handleCompositionStart = (event): void => {
      this.#startComposition(event as CompositionEvent);
    };
    this.#handleCompositionUpdate = (event): void => {
      this.#updateComposition(event as CompositionEvent);
    };
    this.#handleCompositionEnd = (event): void => {
      this.#endComposition(event as CompositionEvent);
    };
    this.#element.addEventListener('beforeinput', this.#handleBeforeInputEvent);
    this.#element.addEventListener('compositionstart', this.#handleCompositionStart);
    this.#element.addEventListener('compositionupdate', this.#handleCompositionUpdate);
    this.#element.addEventListener('compositionend', this.#handleCompositionEnd);
    this.render();
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
    if (this.#composing || event.isComposing) return false;
    const snapshot = this.#controller.getSnapshot().state.snapshot;
    let start = this.#element.selectionStart ?? snapshot.selection.startCodeUnitOffset;
    let end = this.#element.selectionEnd ?? snapshot.selection.endCodeUnitOffset;
    if (start === end && event.inputType === 'deleteContentBackward') {
      start = previousCodePointOffset(snapshot.text, start);
    } else if (start === end && event.inputType === 'deleteContentForward') {
      end = nextCodePointOffset(snapshot.text, end);
    }
    const insertion = event.inputType === 'insertText'
      || event.inputType === 'insertFromPaste'
      || event.inputType === 'insertReplacementText';
    const deletion = event.inputType === 'deleteContentBackward'
      || event.inputType === 'deleteContentForward'
      || event.inputType === 'deleteByCut';
    if (!insertion && !deletion) return false;
    if (insertion && typeof event.data !== 'string') return false;
    const text = deletion ? '' : event.data as string;
    const offset = start + text.length;
    const input: TextInput = {
      type: 'beforeinput',
      inputType: event.inputType,
      data: event.data,
      startCodeUnitOffset: start,
      endCodeUnitOffset: end,
      selection: collapsedSelection(offset),
    };
    const result = this.#dispatch(input);
    if (result.ok) this.render();
    return true;
  }

  public render(): void {
    const snapshot = this.#controller.getSnapshot().state.snapshot;
    if (this.#element.value !== snapshot.text) this.#element.value = snapshot.text;
    this.#element.setSelectionRange(
      snapshot.selection.anchorCodeUnitOffset,
      snapshot.selection.focusCodeUnitOffset,
    );
  }

  public disconnect(): void {
    this.#element.removeEventListener('beforeinput', this.#handleBeforeInputEvent);
    this.#element.removeEventListener('compositionstart', this.#handleCompositionStart);
    this.#element.removeEventListener('compositionupdate', this.#handleCompositionUpdate);
    this.#element.removeEventListener('compositionend', this.#handleCompositionEnd);
  }

  #startComposition(event: CompositionEvent): void {
    if (this.#composing) return;
    const snapshot = this.#controller.getSnapshot().state.snapshot;
    this.#compositionStart = this.#element.selectionStart
      ?? snapshot.selection.startCodeUnitOffset;
    const end = this.#element.selectionEnd
      ?? snapshot.selection.endCodeUnitOffset;
    this.#composing = true;
    const text = event.data ?? '';
    this.#dispatch({
      type: 'composition-start',
      text,
      startCodeUnitOffset: this.#compositionStart,
      endCodeUnitOffset: end,
      selection: collapsedSelection(this.#compositionStart + text.length),
    });
  }

  #updateComposition(event: CompositionEvent): void {
    if (!this.#composing) return;
    const text = event.data ?? '';
    this.#dispatch({
      type: 'composition-update',
      text,
      selection: collapsedSelection(this.#compositionStart + text.length),
    });
  }

  #endComposition(event: CompositionEvent): void {
    if (!this.#composing) return;
    const current = this.#controller.getSnapshot().state.composition?.composingText ?? '';
    const text = event.data ?? current;
    if (text !== current) {
      this.#dispatch({
        type: 'composition-update',
        text,
        selection: collapsedSelection(this.#compositionStart + text.length),
      });
    }
    this.#composing = false;
    const result = this.#dispatch({ type: 'composition-commit' });
    if (result.ok) this.render();
  }

  #dispatch(input: TextInput): RevisionResult<TextEditingState, never> {
    const result = this.#controller.handleTextInput(input);
    this.#onTransition?.(Object.freeze({ input, result }));
    this.#onUpdate?.();
    return result;
  }
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

function collapsedSelection(offset: number): TextSelectionInput {
  return Object.freeze({ anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset });
}

function previousCodePointOffset(text: string, offset: number): number {
  if (offset <= 0) return 0;
  const previous = text.charCodeAt(offset - 1);
  if (previous >= 0xdc00 && previous <= 0xdfff && offset >= 2) return offset - 2;
  return offset - 1;
}

function nextCodePointOffset(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  const current = text.charCodeAt(offset);
  if (current >= 0xd800 && current <= 0xdbff && offset + 1 < text.length) return offset + 2;
  return offset + 1;
}
