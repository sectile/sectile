import type { TextEditingState, TextEvent, TextSelectionInput } from '@sectile/core/text';
import type { TerminalKeyboardInput } from '../keyboard.js';
import { nextGraphemeOffset, previousGraphemeOffset } from './grapheme.js';

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
