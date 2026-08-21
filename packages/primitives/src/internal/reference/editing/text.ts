import type {
  TextComposition,
  TextEditingState,
  TextSelection,
  TextSelectionInput,
  TextSnapshot,
} from '../../editing/text.js';

export function referenceIsWellFormedPlainText(text: string): boolean {
  if (typeof text !== 'string') return false;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return false;
  }
  return true;
}

export function referenceTextCodeUnitBoundaries(text: string): readonly number[] {
  if (!referenceIsWellFormedPlainText(text)) throw new TypeError('ill-formed reference text');
  const result = [0];
  let offset = 0;
  for (const character of text) {
    offset += referenceCodeUnitWidth(character);
    result.push(offset);
  }
  return Object.freeze(result);
}

export function referenceReplacePlainText(
  text: string,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  replacement: string,
): string {
  const start = stringIndexAtOffset(text, startCodeUnitOffset);
  const end = stringIndexAtOffset(text, endCodeUnitOffset);
  if (start === null || end === null || startCodeUnitOffset > endCodeUnitOffset) {
    throw new RangeError('invalid reference text range');
  }
  if (!referenceIsWellFormedPlainText(replacement)) {
    throw new TypeError('ill-formed reference replacement');
  }
  return text.slice(0, start) + replacement + text.slice(end);
}

export function createReferenceTextEditingState(
  text = '',
  selection: TextSelectionInput = {
    anchorCodeUnitOffset: 0,
    focusCodeUnitOffset: 0,
  },
): TextEditingState {
  return referenceState(referenceSnapshot(text, selection));
}

export function referenceReplaceTextState(
  state: TextEditingState,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  replacement: string,
  selection: TextSelectionInput,
): TextEditingState {
  if (state.composition !== null) throw new TypeError('composition active');
  const text = referenceReplacePlainText(
    state.snapshot.text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    replacement,
  );
  return referenceState(referenceSnapshot(text, selection));
}

export function referenceStartTextComposition(
  state: TextEditingState,
  startCodeUnitOffset: number,
  endCodeUnitOffset: number,
  composingText: string,
  selection: TextSelectionInput,
): TextEditingState {
  if (state.composition !== null) throw new TypeError('composition active');
  const text = referenceReplacePlainText(
    state.snapshot.text,
    startCodeUnitOffset,
    endCodeUnitOffset,
    composingText,
  );
  const composition: TextComposition = Object.freeze({
    baseline: state.snapshot,
    startCodeUnitOffset,
    endCodeUnitOffset,
    composingText,
  });
  return Object.freeze({ snapshot: referenceSnapshot(text, selection), composition });
}

export function referenceUpdateTextComposition(
  state: TextEditingState,
  composingText: string,
  selection: TextSelectionInput,
): TextEditingState {
  const current = state.composition;
  if (current === null) throw new TypeError('composition inactive');
  const text = referenceReplacePlainText(
    current.baseline.text,
    current.startCodeUnitOffset,
    current.endCodeUnitOffset,
    composingText,
  );
  const composition: TextComposition = Object.freeze({ ...current, composingText });
  return Object.freeze({ snapshot: referenceSnapshot(text, selection), composition });
}

export function referenceCommitTextComposition(state: TextEditingState): TextEditingState {
  if (state.composition === null) throw new TypeError('composition inactive');
  return referenceState(state.snapshot);
}

export function referenceCancelTextComposition(state: TextEditingState): TextEditingState {
  if (state.composition === null) throw new TypeError('composition inactive');
  return referenceState(state.composition.baseline);
}

function referenceSnapshot(text: string, input: TextSelectionInput): TextSnapshot {
  const boundaries = referenceTextCodeUnitBoundaries(text);
  if (
    !boundaries.includes(input.anchorCodeUnitOffset) ||
    !boundaries.includes(input.focusCodeUnitOffset)
  ) {
    throw new RangeError('invalid reference selection');
  }
  const anchor = input.anchorCodeUnitOffset;
  const focus = input.focusCodeUnitOffset;
  const selection: TextSelection = Object.freeze({
    anchorCodeUnitOffset: anchor,
    focusCodeUnitOffset: focus,
    startCodeUnitOffset: Math.min(anchor, focus),
    endCodeUnitOffset: Math.max(anchor, focus),
    direction: anchor === focus ? 'none' : anchor < focus ? 'forward' : 'backward',
  });
  return Object.freeze({ text, selection });
}

function referenceState(snapshot: TextSnapshot): TextEditingState {
  return Object.freeze({ snapshot, composition: null });
}

function stringIndexAtOffset(text: string, target: number): number | null {
  if (!referenceIsWellFormedPlainText(text)) return null;
  let codeUnitOffset = 0;
  let stringIndex = 0;
  if (target === 0) return 0;
  for (const character of text) {
    codeUnitOffset += referenceCodeUnitWidth(character);
    stringIndex += character.length;
    if (codeUnitOffset === target) return stringIndex;
    if (codeUnitOffset > target) return null;
  }
  return null;
}

function referenceCodeUnitWidth(character: string): 1 | 2 {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) throw new TypeError('empty reference character');
  return codePoint > 0xffff ? 2 : 1;
}
