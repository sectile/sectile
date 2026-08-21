import type { ErrorClass, Result } from '../../shared.js';
import { fail, isWellFormedUTF16, ok } from '../kernel/foundation.js';

export type TextSelectionDirection = 'none' | 'forward' | 'backward';

export interface TextSelectionInput {
  readonly anchorCodeUnitOffset: number;
  readonly focusCodeUnitOffset: number;
}

export interface TextSelection extends TextSelectionInput {
  readonly startCodeUnitOffset: number;
  readonly endCodeUnitOffset: number;
  readonly direction: TextSelectionDirection;
}

export interface TextSnapshot {
  readonly text: string;
  readonly selection: TextSelection;
}

export interface TextComposition {
  readonly baseline: TextSnapshot;
  readonly startCodeUnitOffset: number;
  readonly endCodeUnitOffset: number;
  readonly composingText: string;
}

export interface TextEditingState {
  readonly snapshot: TextSnapshot;
  readonly composition: TextComposition | null;
}

type TextErrorClass = Extract<ErrorClass, 'construction' | 'transition-rejection'>;

export function isWellFormedPlainText(text: string): boolean {
  return typeof text === 'string' && isWellFormedUTF16(text);
}

export function isTextCodeUnitBoundary(text: string, offset: number): boolean {
  if (!isWellFormedPlainText(text) || !Number.isSafeInteger(offset)) return false;
  if (offset < 0 || offset > text.length) return false;
  if (offset === 0 || offset === text.length) return true;
  return !(isHighSurrogate(text.charCodeAt(offset - 1)) && isLowSurrogate(text.charCodeAt(offset)));
}

export function createTextSnapshot(
  text: string,
  selection: TextSelectionInput,
): Result<TextSnapshot> {
  return createSnapshot(text, selection, 'construction');
}

export function createTextEditingState(
  text = '',
  selection: TextSelectionInput = {
    anchorCodeUnitOffset: 0,
    focusCodeUnitOffset: 0,
  },
): Result<TextEditingState> {
  const snapshot = createSnapshot(text, selection, 'construction');
  return snapshot.ok ? ok(stateFromSnapshot(snapshot.value)) : snapshot;
}

export function slicePlainText(
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
): Result<string> {
  const range = validateRange(text, startCodeUnitOffset, endCodeUnitOffset, 'construction');
  return range.ok
    ? ok(text.slice(startCodeUnitOffset, endCodeUnitOffset))
    : range;
}

export function replacePlainText(
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  replacement: string,
): Result<string> {
  return replaceChecked(
    text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    replacement,
    'construction',
  );
}

export function replaceTextState(
  state: TextEditingState,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  replacement: string,
  selection: TextSelectionInput,
): Result<TextEditingState> {
  if (state.composition !== null) {
    return fail(
      'transition-rejection',
      'composition-active',
      'Stable replacement requires composition to be inactive.',
    );
  }
  const replaced = replaceChecked(
    state.snapshot.text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    replacement,
    'transition-rejection',
  );
  if (!replaced.ok) return replaced;
  const snapshot = createSnapshot(replaced.value, selection, 'transition-rejection');
  if (!snapshot.ok) return snapshot;
  return ok(sameSnapshot(state.snapshot, snapshot.value) ? state : stateFromSnapshot(snapshot.value));
}

export function startTextComposition(
  state: TextEditingState,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  composingText: string,
  selection: TextSelectionInput,
): Result<TextEditingState> {
  if (state.composition !== null) {
    return fail(
      'transition-rejection',
      'composition-active',
      'A text composition is already active.',
    );
  }
  const projected = replaceChecked(
    state.snapshot.text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    composingText,
    'transition-rejection',
  );
  if (!projected.ok) return projected;
  const snapshot = createSnapshot(projected.value, selection, 'transition-rejection');
  if (!snapshot.ok) return snapshot;
  const composition = freezeComposition({
    baseline: state.snapshot,
    startCodeUnitOffset,
    endCodeUnitOffset,
    composingText,
  });
  return ok(Object.freeze({ snapshot: snapshot.value, composition }));
}

export function updateTextComposition(
  state: TextEditingState,
  composingText: string,
  selection: TextSelectionInput,
): Result<TextEditingState> {
  const current = state.composition;
  if (current === null) {
    return fail(
      'transition-rejection',
      'composition-inactive',
      'Text composition update requires an active composition.',
    );
  }
  const projected = replaceChecked(
    current.baseline.text,
    current.startCodeUnitOffset,
    current.endCodeUnitOffset,
    composingText,
    'transition-rejection',
  );
  if (!projected.ok) return projected;
  const snapshot = createSnapshot(projected.value, selection, 'transition-rejection');
  if (!snapshot.ok) return snapshot;
  const composition = freezeComposition({ ...current, composingText });
  return ok(Object.freeze({ snapshot: snapshot.value, composition }));
}

export function commitTextComposition(state: TextEditingState): Result<TextEditingState> {
  if (state.composition === null) {
    return fail(
      'transition-rejection',
      'composition-inactive',
      'Text composition commit requires an active composition.',
    );
  }
  return ok(stateFromSnapshot(state.snapshot));
}

export function cancelTextComposition(state: TextEditingState): Result<TextEditingState> {
  if (state.composition === null) {
    return fail(
      'transition-rejection',
      'composition-inactive',
      'Text composition cancel requires an active composition.',
    );
  }
  return ok(stateFromSnapshot(state.composition.baseline));
}

function createSnapshot(
  text: string,
  selection: TextSelectionInput,
  errorClass: TextErrorClass,
): Result<TextSnapshot> {
  if (!isWellFormedPlainText(text)) {
    return fail(errorClass, 'ill-formed-text', 'Plain text must be a well-formed UTF-16 string.');
  }
  const anchorError = validateOffset(
    text,
    selection.anchorCodeUnitOffset,
    'anchorCodeUnitOffset',
    errorClass,
  );
  if (anchorError !== null) return anchorError;
  const focusError = validateOffset(
    text,
    selection.focusCodeUnitOffset,
    'focusCodeUnitOffset',
    errorClass,
  );
  if (focusError !== null) return focusError;
  const anchor = selection.anchorCodeUnitOffset;
  const focus = selection.focusCodeUnitOffset;
  const textSelection: TextSelection = Object.freeze({
    anchorCodeUnitOffset: anchor,
    focusCodeUnitOffset: focus,
    startCodeUnitOffset: Math.min(anchor, focus),
    endCodeUnitOffset: Math.max(anchor, focus),
    direction: anchor === focus ? 'none' : anchor < focus ? 'forward' : 'backward',
  });
  return ok(Object.freeze({ text, selection: textSelection }));
}

function replaceChecked(
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  replacement: string,
  errorClass: TextErrorClass,
): Result<string> {
  const range = validateRange(text, startCodeUnitOffset, endCodeUnitOffset, errorClass);
  if (!range.ok) return range;
  if (!isWellFormedPlainText(replacement)) {
    return fail(
      errorClass,
      'ill-formed-replacement',
      'Replacement text must be a well-formed UTF-16 string.',
    );
  }
  return ok(
    text.slice(0, startCodeUnitOffset) + replacement + text.slice(endCodeUnitOffset),
  );
}

function validateRange(
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  errorClass: TextErrorClass,
): Result<true> {
  if (!isWellFormedPlainText(text)) {
    return fail(errorClass, 'ill-formed-text', 'Plain text must be a well-formed UTF-16 string.');
  }
  const startError = validateOffset(text, startCodeUnitOffset, 'startCodeUnitOffset', errorClass);
  if (startError !== null) return startError;
  const endError = validateOffset(text, endCodeUnitOffset, 'endCodeUnitOffset', errorClass);
  if (endError !== null) return endError;
  if (startCodeUnitOffset > endCodeUnitOffset) {
    return fail(
      errorClass,
      'invalid-text-range',
      'Text replacement start must not exceed its end.',
      { startCodeUnitOffset, endCodeUnitOffset },
    );
  }
  return ok(true);
}

function validateOffset(
  text: string,
  offset: number,
  name: string,
  errorClass: TextErrorClass,
): Result<never> | null {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > text.length) {
    return fail(
      errorClass,
      'invalid-text-offset',
      `${name} must be a safe UTF-16 code-unit offset within the text.`,
      { [name]: offset, codeUnitLength: text.length },
    );
  }
  if (!isTextCodeUnitBoundary(text, offset)) {
    return fail(
      errorClass,
      'surrogate-boundary',
      `${name} must not split a UTF-16 surrogate pair.`,
      { [name]: offset },
    );
  }
  return null;
}

function stateFromSnapshot(snapshot: TextSnapshot): TextEditingState {
  return Object.freeze({ snapshot, composition: null });
}

function freezeComposition(composition: TextComposition): TextComposition {
  return Object.freeze(composition);
}

function sameSnapshot(left: TextSnapshot, right: TextSnapshot): boolean {
  return (
    left.text === right.text &&
    left.selection.anchorCodeUnitOffset === right.selection.anchorCodeUnitOffset &&
    left.selection.focusCodeUnitOffset === right.selection.focusCodeUnitOffset
  );
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}
