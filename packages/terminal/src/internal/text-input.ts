import type { TextEditingState, TextSelectionInput } from '@sectile/core/text';
import type { TerminalKeyboardInput } from '../keyboard.js';
import type { TextInput } from '../text.js';

export function toTerminalTextInput(
  state: TextEditingState,
  input: TerminalKeyboardInput,
): TextInput | null {
  if (input.ctrlKey === true || input.altKey === true) return null;
  const snapshot = state.snapshot;
  let start = snapshot.selection.startCodeUnitOffset;
  let end = snapshot.selection.endCodeUnitOffset;
  let text: string;
  let type: TextInput['type'];
  if (input.key === 'backspace') {
    if (start === end) start = previousGraphemeOffset(snapshot.text, start);
    text = '';
    type = 'delete';
  } else if (input.key === 'delete') {
    if (start === end) end = nextGraphemeOffset(snapshot.text, end);
    text = '';
    type = 'delete';
  } else if (input.text !== undefined && input.text.length > 0) {
    text = input.text;
    type = start === end ? 'insert' : 'replace';
  } else {
    return null;
  }
  const offset = start + text.length;
  const selection = collapsedSelection(offset);
  return type === 'delete'
    ? { type, startCodeUnitOffset: start, endCodeUnitOffset: end, selection }
    : { type, text, startCodeUnitOffset: start, endCodeUnitOffset: end, selection };
}

function collapsedSelection(offset: number): TextSelectionInput {
  return Object.freeze({ anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset });
}

function previousGraphemeOffset(text: string, offset: number): number {
  let previous = 0;
  for (const segment of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    if (segment.index >= offset) break;
    previous = segment.index;
  }
  return previous;
}

function nextGraphemeOffset(text: string, offset: number): number {
  for (const segment of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    if (segment.index > offset) return segment.index;
  }
  return text.length;
}
