import { previousGraphemeOffset } from './internal/grapheme.js';

export interface TerminalKeyboardInput {
  readonly key: string;
  readonly text?: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly shiftKey?: boolean;
}

export function applyTerminalTextInput(
  value: string,
  input: TerminalKeyboardInput,
): string | null {
  if (input.ctrlKey === true || input.altKey === true) return null;
  if (input.key === 'backspace') return removeLastGrapheme(value);
  if (input.text === undefined || input.text.length === 0) return null;
  return `${value}${input.text}`;
}

export function removeLastGrapheme(value: string): string {
  return value.slice(0, previousGraphemeOffset(value, value.length));
}
