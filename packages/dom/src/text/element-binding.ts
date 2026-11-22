import { isWellFormedPlainText, type TextEditingState, type TextSelectionInput } from '@sectile/core/text';
import type { TextElement, TextInput } from './contracts.js';

export interface DOMTextElementBindingOptions {
  readonly element: TextElement;
  readonly getState: () => TextEditingState;
  readonly dispatch: (input: TextInput) => boolean;
  readonly observeSelection?: boolean;
  readonly keydown?: (event: KeyboardEvent) => void;
  readonly blur?: (event: FocusEvent) => void;
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

const bindingEvents = ['input', 'search', 'compositionstart', 'compositionend'] as const;
const selectionEvents = ['select', 'selectionchange', 'focus'] as const;

export class DOMTextElementBinding implements EventListenerObject {
  readonly #element: TextElement;
  readonly #getState: () => TextEditingState;
  readonly #dispatch: (input: TextInput) => boolean;
  readonly #observeSelection: boolean;
  readonly #keydown: ((event: KeyboardEvent) => void) | undefined;
  readonly #blur: ((event: FocusEvent) => void) | undefined;
  #active = true;
  #disconnected = false;
  #composing = false;
  #compositionEnding = false;
  #composition: ActiveComposition | null = null;
  #compositionGeneration = 0;
  #lastObservedText = '';
  #lastObservedSelection: TextSelectionInput | null = null;
  #selectionDocument: Document | null = null;

  public constructor(options: DOMTextElementBindingOptions) {
    this.#element = options.element;
    this.#getState = options.getState;
    this.#dispatch = options.dispatch;
    this.#observeSelection = options.observeSelection === true;
    this.#keydown = options.keydown; this.#blur = options.blur;
    try {
      this.#bind();
      this.render();
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  public handleEvent(event: Event): void {
    if (!this.#active) return;
    switch (event.type) {
      case 'keydown': this.#keydown?.(event as KeyboardEvent); return;
      case 'blur': this.#releaseDocumentSelection(); this.#blur?.(event as FocusEvent); return;
      case 'focus':
        if (this.#observeSelection) { this.#observeDocumentSelection(); this.#reconcileSelection(); }
        return;
      case 'select':
      case 'selectionchange':
        if (!this.#observeSelection) return;
        if (event.target !== this.#element
          && (event.target !== this.#selectionDocument || !this.#element.matches(':focus'))) return;
        this.#reconcileSelection();
        return;
      case 'compositionstart': this.#startComposition(); return;
      case 'compositionend': this.#endComposition(); return;
      case 'search':
        if (!this.isComposing) this.#reconcileNativeInput('insertReplacementText');
        return;
    }
    if (this.isComposing) { this.#reconcileComposition(); return; }
    const inputType = (event as Partial<InputEvent>).inputType;
    this.#reconcileNativeInput(typeof inputType === 'string' ? inputType : 'insertReplacementText');
  }

  public get isComposing(): boolean {
    return this.#composing || this.#compositionEnding;
  }
  public get isActive(): boolean { return this.#active; }

  public handleBeforeInput(_event: InputEvent): boolean {
    return false;
  }

  /** Exact explicit edits must survive native value normalization before any proposal. */
  public acceptsReplacement(input: Extract<TextInput, { readonly type: 'input' }>): boolean {
    const text = input.text, element = this.#element;
    if (typeof text !== 'string') return false;
    if (element.localName === 'textarea') return !text.includes('\r');
    if (element.localName !== 'input') return true;
    if (text.includes('\r') || text.includes('\n')) return false;
    if ((element as HTMLInputElement).type !== 'url') return true;
    const source = this.#getState().snapshot.text, start = input.startCodeUnitOffset, end = input.endCodeUnitOffset;
    // Core owns invalid ranges; this admission only inspects representable boundaries.
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > source.length) return true;
    if (source.length - (end - start) + text.length === 0) return true;
    const first = start > 0 ? source.charCodeAt(0) : text.length > 0 ? text.charCodeAt(0) : source.charCodeAt(end);
    const last = end < source.length ? source.charCodeAt(source.length - 1) : text.length > 0 ? text.charCodeAt(text.length - 1) : source.charCodeAt(start - 1);
    return !nativeASCIIWhitespace(first) && !nativeASCIIWhitespace(last);
  }

  public render(): void {
    if (!this.#active || this.isComposing) return;
    const snapshot = this.#getState().snapshot;
    if (this.#element.value !== snapshot.text) this.#element.value = snapshot.text;
    this.#lastObservedText = this.#element.value;
    if (this.#observeSelection) this.#lastObservedSelection = snapshot.selection;
    const selection = selectionFromElement(this.#element);
    if (selection === null || sameSelection(selection, snapshot.selection)) return;
    this.#element.setSelectionRange(
      snapshot.selection.startCodeUnitOffset,
      snapshot.selection.endCodeUnitOffset,
      snapshot.selection.direction,
    );
  }

  /** Pause native observation without publishing a text or composition transition. */
  public suspend(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#compositionGeneration += 1;
    for (const type of bindingEvents) this.#element.removeEventListener(type, this);
    if (this.#observeSelection) for (const type of selectionEvents) this.#element.removeEventListener(type, this);
    this.#releaseDocumentSelection();
    if (this.#keydown) this.#element.removeEventListener('keydown', this);
    if (this.#blur || this.#observeSelection) this.#element.removeEventListener('blur', this);
  }

  public resume(): void {
    if (this.#disconnected || this.#active) return;
    this.#active = true;
    this.#bind();
    try {
      // A detached native IME session cannot be resumed. Settle only the last
      // observed proposal through Core; never ingest edits made while paused.
      if (this.#composition !== null) {
        this.#composing = false;
        this.#commitComposition();
      }
      this.render();
    } catch (error) {
      this.suspend();
      throw error;
    }
  }

  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    this.suspend();
  }
  #bind(): void {
    for (const type of bindingEvents) this.#element.addEventListener(type, this);
    if (this.#observeSelection) {
      for (const type of selectionEvents) this.#element.addEventListener(type, this);
      if (this.#element.matches?.(':focus')) this.#observeDocumentSelection();
    }
    if (this.#keydown) this.#element.addEventListener('keydown', this);
    if (this.#blur || this.#observeSelection) this.#element.addEventListener('blur', this);
  }

  #observeDocumentSelection(): void {
    const document = this.#element.ownerDocument;
    if (!document || document === this.#selectionDocument) return;
    this.#releaseDocumentSelection();
    this.#selectionDocument = document;
    document.addEventListener('selectionchange', this);
  }

  #releaseDocumentSelection(): void {
    this.#selectionDocument?.removeEventListener('selectionchange', this);
    this.#selectionDocument = null;
  }

  #reconcileSelection(): void {
    if (this.isComposing) return;
    const selection = selectionFromElement(this.#element);
    if (selection === null || this.#lastObservedSelection !== null && sameSelection(selection, this.#lastObservedSelection)) return;
    // Offsets from unobserved native edits do not describe the canonical text.
    if (this.#element.value !== this.#lastObservedText) return;
    this.#lastObservedSelection = selection;
    if (!this.#dispatch({ type: 'select', selection })) this.render();
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
    if (accepted) {
      this.#lastObservedText = this.#element.value;
      if (this.#observeSelection) this.#lastObservedSelection = selectionFromElement(this.#element);
    }
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
    const text = baseText.slice(start, end);
    this.#composing = true;
    this.#composition = {
      baseText,
      startCodeUnitOffset: start,
      endCodeUnitOffset: end,
      coreActive: false,
      lastText: text,
      lastSelection: selection,
    };
    this.#composition.coreActive = this.#dispatch({
      type: 'composition-start',
      text,
      startCodeUnitOffset: start,
      endCodeUnitOffset: end,
      selection,
    });
  }

  #reconcileComposition(): void {
    const composition = this.#composition;
    if (composition === null) return;
    const currentText = this.#element.value;
    const replacedLength = composition.endCodeUnitOffset - composition.startCodeUnitOffset;
    const composingLength = currentText.length - (composition.baseText.length - replacedLength);
    const validLength = composingLength >= 0
      && composition.startCodeUnitOffset + composingLength <= currentText.length;
    let start = composition.startCodeUnitOffset;
    let end = composition.endCodeUnitOffset;
    let text: string;
    if (validLength) text = currentText.slice(start, start + composingLength);
    else {
      const replacement = deriveNativeReplacement(composition.baseText, currentText);
      start = replacement.startCodeUnitOffset;
      end = replacement.endCodeUnitOffset;
      text = replacement.text;
    }
    const selection = selectionFromElement(this.#element)
      ?? collapsedSelection(start + text.length);

    if (!composition.coreActive) {
      composition.coreActive = this.#dispatch({
        type: 'composition-start',
        text,
        startCodeUnitOffset: start,
        endCodeUnitOffset: end,
        selection,
      });
      if (composition.coreActive) {
        composition.lastText = text;
        composition.lastSelection = selection;
      }
      return;
    }
    if (composition.lastText === text
      && sameSelection(composition.lastSelection, selection)) return;
    if (this.#dispatch({ type: 'composition-update', text, selection })) {
      composition.lastText = text;
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
    if (accepted) {
      this.#lastObservedText = this.#element.value;
      if (this.#observeSelection) this.#lastObservedSelection = selectionFromElement(this.#element);
    }
    else this.render();
  }
}

function nativeASCIIWhitespace(code: number): boolean {
  return code === 9 || code === 10 || code === 12 || code === 13 || code === 32;
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
