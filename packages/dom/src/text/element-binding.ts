import { isWellFormedPlainText, type TextEditingState, type TextSelectionInput } from '@sectile/core/text';
import type { TextElement, TextInput } from './contracts.js';

export interface DOMTextElementBindingOptions {
  readonly element: TextElement;
  readonly getState: () => TextEditingState;
  readonly dispatch: (input: TextInput) => boolean;
}

interface ActiveComposition {
  readonly baseText: string;
  readonly startCodeUnitOffset: number;
  readonly endCodeUnitOffset: number;
  coreActive: boolean;
  lastText: string;
  lastSelection: TextSelectionInput;
}

export interface NativeReplacement {
  readonly startCodeUnitOffset: number;
  readonly endCodeUnitOffset: number;
  readonly text: string;
  readonly inspectedCodeUnits: number;
}

export class DOMTextElementBinding {
  readonly #element: TextElement;
  readonly #getState: () => TextEditingState;
  readonly #dispatch: (input: TextInput) => boolean;
  readonly #handleInputEvent: (event: Event) => void;
  readonly #handleSearchEvent: () => void;
  readonly #handleCompositionStart: () => void;
  readonly #handleCompositionEnd: () => void;
  #active = true;
  #composing = false;
  #compositionEnding = false;
  #composition: ActiveComposition | null = null;
  #compositionGeneration = 0;
  #lastObservedText = '';

  public constructor(options: DOMTextElementBindingOptions) {
    this.#element = options.element;
    this.#getState = options.getState;
    this.#dispatch = options.dispatch;
    this.#handleInputEvent = (event): void => {
      const inputType = (event as Partial<InputEvent>).inputType;
      if (this.#composing || this.#compositionEnding) {
        this.#reconcileComposition();
        return;
      }
      this.#reconcileNativeInput(
        typeof inputType === 'string' ? inputType : 'insertReplacementText',
      );
    };
    this.#handleSearchEvent = (): void => {
      if (!this.isComposing) this.#reconcileNativeInput('insertReplacementText');
    };
    this.#handleCompositionStart = (): void => {
      this.#startComposition();
    };
    this.#handleCompositionEnd = (): void => {
      this.#endComposition();
    };
    this.#element.addEventListener('input', this.#handleInputEvent);
    this.#element.addEventListener('search', this.#handleSearchEvent);
    this.#element.addEventListener('compositionstart', this.#handleCompositionStart);
    this.#element.addEventListener('compositionend', this.#handleCompositionEnd);
    this.render();
  }

  public get isComposing(): boolean {
    return this.#composing || this.#compositionEnding;
  }

  public handleBeforeInput(_event: InputEvent): boolean {
    return false;
  }

  public render(): void {
    if (!this.#active || this.isComposing) return;
    const snapshot = this.#getState().snapshot;
    if (this.#element.value !== snapshot.text) this.#element.value = snapshot.text;
    this.#lastObservedText = this.#element.value;
    if (supportsSelection(this.#element)) {
      const selection = selectionFromElement(this.#element);
      if (selection !== null && sameSelection(selection, snapshot.selection)) return;
      this.#element.setSelectionRange(
        snapshot.selection.startCodeUnitOffset,
        snapshot.selection.endCodeUnitOffset,
        snapshot.selection.direction,
      );
    }
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#compositionGeneration += 1;
    this.#element.removeEventListener('input', this.#handleInputEvent);
    this.#element.removeEventListener('search', this.#handleSearchEvent);
    this.#element.removeEventListener('compositionstart', this.#handleCompositionStart);
    this.#element.removeEventListener('compositionend', this.#handleCompositionEnd);
  }

  #reconcileNativeInput(inputType: string): void {
    const currentText = this.#element.value;
    if (currentText === this.#lastObservedText) return;
    const replacement = deriveNativeReplacement(this.#lastObservedText, currentText);
    const selection = selectionFromElement(this.#element)
      ?? collapsedSelection(nativeSelectionFallback(inputType, replacement, currentText.length));
    const accepted = this.#dispatch({
      type: 'input',
      inputType,
      text: replacement.text,
      startCodeUnitOffset: replacement.startCodeUnitOffset,
      endCodeUnitOffset: replacement.endCodeUnitOffset,
      selection,
    });
    if (accepted) this.#lastObservedText = this.#element.value;
    else this.render();
  }

  #startComposition(): void {
    if (this.#compositionEnding) {
      this.#compositionGeneration += 1;
      this.#commitComposition();
      if (!this.#active) return;
    }
    if (this.#composing) return;
    const snapshot = this.#getState().snapshot;
    const baseText = this.#element.value;
    this.#lastObservedText = baseText;
    const selection = selectionFromElement(this.#element)
      ?? (snapshot.text === baseText ? snapshot.selection : collapsedSelection(baseText.length));
    const start = selectionStart(selection);
    const end = selectionEnd(selection);
    this.#composing = true;
    this.#composition = {
      baseText,
      startCodeUnitOffset: start,
      endCodeUnitOffset: end,
      coreActive: false,
      lastText: baseText.slice(start, end),
      lastSelection: selection,
    };
    this.#composition.coreActive = this.#dispatch({
      type: 'composition-start',
      text: baseText.slice(start, end),
      startCodeUnitOffset: start,
      endCodeUnitOffset: end,
      selection,
    });
  }

  #reconcileComposition(): void {
    const composition = this.#composition;
    if (composition === null) return;
    const replacedLength = composition.endCodeUnitOffset - composition.startCodeUnitOffset;
    const composingLength = this.#element.value.length - (composition.baseText.length - replacedLength);
    const validLength = composingLength >= 0
      && composition.startCodeUnitOffset + composingLength <= this.#element.value.length;
    const replacement = validLength
      ? {
          startCodeUnitOffset: composition.startCodeUnitOffset,
          endCodeUnitOffset: composition.endCodeUnitOffset,
          text: this.#element.value.slice(
            composition.startCodeUnitOffset,
            composition.startCodeUnitOffset + composingLength,
          ),
        }
      : deriveNativeReplacement(composition.baseText, this.#element.value);
    const selection = selectionFromElement(this.#element)
      ?? collapsedSelection(replacement.startCodeUnitOffset + replacement.text.length);

    if (!composition.coreActive) {
      composition.coreActive = this.#dispatch({
        type: 'composition-start',
        text: replacement.text,
        startCodeUnitOffset: replacement.startCodeUnitOffset,
        endCodeUnitOffset: replacement.endCodeUnitOffset,
        selection,
      });
      if (composition.coreActive) {
        composition.lastText = replacement.text;
        composition.lastSelection = selection;
      }
      return;
    }
    if (composition.lastText === replacement.text
      && sameSelection(composition.lastSelection, selection)) return;
    if (this.#dispatch({ type: 'composition-update', text: replacement.text, selection })) {
      composition.lastText = replacement.text;
      composition.lastSelection = selection;
    }
  }

  #endComposition(): void {
    if (!this.#composing) return;
    this.#reconcileComposition();
    this.#composing = false;
    this.#compositionEnding = true;
    const generation = ++this.#compositionGeneration;
    queueMicrotask(() => {
      if (!this.#active || generation !== this.#compositionGeneration) return;
      this.#commitComposition();
    });
  }

  #commitComposition(): void {
    const composition = this.#composition;
    const accepted = composition?.coreActive === true
      && this.#dispatch({ type: 'composition-commit' });
    this.#composition = null;
    this.#compositionEnding = false;
    if (accepted) this.#lastObservedText = this.#element.value;
    else this.render();
  }
}

export function deriveNativeReplacement(previous: string, next: string): NativeReplacement {
  let inspectedCodeUnits = next.length;
  if (!isWellFormedPlainText(next)) {
    return Object.freeze({
      startCodeUnitOffset: 0,
      endCodeUnitOffset: previous.length,
      text: next,
      inspectedCodeUnits,
    });
  }
  let start = 0;
  const sharedLength = Math.min(previous.length, next.length);
  while (start < sharedLength) {
    inspectedCodeUnits += 1;
    if (previous[start] !== next[start]) break;
    start += 1;
  }
  while (start > 0 && (!isNativeTextBoundary(previous, start) || !isNativeTextBoundary(next, start))) {
    inspectedCodeUnits += 1;
    start -= 1;
  }

  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start) {
    inspectedCodeUnits += 1;
    if (previous[previousEnd - 1] !== next[nextEnd - 1]) break;
    previousEnd -= 1;
    nextEnd -= 1;
  }
  while (!isNativeTextBoundary(previous, previousEnd) || !isNativeTextBoundary(next, nextEnd)) {
    inspectedCodeUnits += 1;
    previousEnd += 1;
    nextEnd += 1;
  }
  return Object.freeze({
    startCodeUnitOffset: start,
    endCodeUnitOffset: previousEnd,
    text: next.slice(start, nextEnd),
    inspectedCodeUnits,
  });
}

function selectionFromElement(element: TextElement): TextSelectionInput | null {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  if (start === null || end === null) return null;
  return element.selectionDirection === 'backward'
    ? { anchorCodeUnitOffset: end, focusCodeUnitOffset: start }
    : { anchorCodeUnitOffset: start, focusCodeUnitOffset: end };
}

function selectionStart(selection: TextSelectionInput): number {
  return Math.min(selection.anchorCodeUnitOffset, selection.focusCodeUnitOffset);
}

function selectionEnd(selection: TextSelectionInput): number {
  return Math.max(selection.anchorCodeUnitOffset, selection.focusCodeUnitOffset);
}

function sameSelection(left: TextSelectionInput, right: TextSelectionInput): boolean {
  return left.anchorCodeUnitOffset === right.anchorCodeUnitOffset
    && left.focusCodeUnitOffset === right.focusCodeUnitOffset;
}

function collapsedSelection(offset: number): TextSelectionInput {
  return Object.freeze({ anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset });
}

function isNativeTextBoundary(text: string, offset: number): boolean {
  if (offset <= 0 || offset >= text.length) return true;
  const before = text.charCodeAt(offset - 1);
  const after = text.charCodeAt(offset);
  return !(
    before >= 0xd800 && before <= 0xdbff
    && after >= 0xdc00 && after <= 0xdfff
  );
}

function supportsSelection(element: TextElement): boolean {
  if (element.tagName === 'TEXTAREA' || !('type' in element)) return true;
  return element.type === 'text'
    || element.type === ''
    || element.type === 'search'
    || element.type === 'tel'
    || element.type === 'url'
    || element.type === 'password';
}

function nativeSelectionFallback(
  inputType: string,
  replacement: NativeReplacement,
  nextLength: number,
): number {
  return inputType === 'insertReplacementText'
    || inputType === 'historyUndo'
    || inputType === 'historyRedo'
    ? nextLength
    : replacement.startCodeUnitOffset + replacement.text.length;
}
