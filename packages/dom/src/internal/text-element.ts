import type { TextEditingState, TextSelectionInput } from '@sectile/primitives/text';
import type { TextElement, TextInput } from '../text.js';

export interface DOMTextElementBindingOptions {
  readonly element: TextElement;
  readonly getState: () => TextEditingState;
  readonly dispatch: (input: TextInput) => boolean;
}

export class DOMTextElementBinding {
  readonly #element: TextElement;
  readonly #getState: () => TextEditingState;
  readonly #dispatch: (input: TextInput) => boolean;
  readonly #handleBeforeInputEvent: (event: Event) => void;
  readonly #handleInputEvent: () => void;
  readonly #handleCompositionStart: (event: Event) => void;
  readonly #handleCompositionUpdate: (event: Event) => void;
  readonly #handleCompositionEnd: (event: Event) => void;
  #composing = false;
  #compositionStart = 0;

  public constructor(options: DOMTextElementBindingOptions) {
    this.#element = options.element;
    this.#getState = options.getState;
    this.#dispatch = options.dispatch;
    this.#handleBeforeInputEvent = (event): void => {
      if (this.handleBeforeInput(event as InputEvent)) event.preventDefault();
    };
    this.#handleInputEvent = (): void => {
      if (!this.#composing) this.render();
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
    this.#element.addEventListener('input', this.#handleInputEvent);
    this.#element.addEventListener('compositionstart', this.#handleCompositionStart);
    this.#element.addEventListener('compositionupdate', this.#handleCompositionUpdate);
    this.#element.addEventListener('compositionend', this.#handleCompositionEnd);
    this.render();
  }

  public get isComposing(): boolean {
    return this.#composing;
  }

  public handleBeforeInput(event: InputEvent): boolean {
    if (this.#composing || event.isComposing) return false;
    const snapshot = this.#getState().snapshot;
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
    if (this.#dispatch(input)) this.render();
    return true;
  }

  public render(): void {
    if (this.#composing) return;
    const snapshot = this.#getState().snapshot;
    if (this.#element.value !== snapshot.text) this.#element.value = snapshot.text;
    this.#element.setSelectionRange(
      snapshot.selection.anchorCodeUnitOffset,
      snapshot.selection.focusCodeUnitOffset,
    );
  }

  public disconnect(): void {
    this.#element.removeEventListener('beforeinput', this.#handleBeforeInputEvent);
    this.#element.removeEventListener('input', this.#handleInputEvent);
    this.#element.removeEventListener('compositionstart', this.#handleCompositionStart);
    this.#element.removeEventListener('compositionupdate', this.#handleCompositionUpdate);
    this.#element.removeEventListener('compositionend', this.#handleCompositionEnd);
  }

  #startComposition(event: CompositionEvent): void {
    if (this.#composing) return;
    const snapshot = this.#getState().snapshot;
    this.#compositionStart = this.#element.selectionStart
      ?? snapshot.selection.startCodeUnitOffset;
    const end = this.#element.selectionEnd ?? snapshot.selection.endCodeUnitOffset;
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
    const current = this.#getState().composition?.composingText ?? '';
    const text = event.data ?? current;
    if (text !== current) {
      this.#dispatch({
        type: 'composition-update',
        text,
        selection: collapsedSelection(this.#compositionStart + text.length),
      });
    }
    this.#composing = false;
    if (this.#dispatch({ type: 'composition-commit' })) this.render();
  }
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
