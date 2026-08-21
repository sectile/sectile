import { emitKeypressEvents } from 'node:readline';
import type { ReadStream } from 'node:tty';
import type { Result } from '@sectile/primitives';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface NodeKeypress {
  readonly name?: string;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
  readonly shift?: boolean;
}

export interface TTYKeyboard {
  close(): void;
}

export function toTerminalKeyboardInput(
  value: string | undefined,
  keypress: NodeKeypress,
): TerminalKeyboardInput | null {
  const name = normalizeKeyName(keypress.name);
  const altKey = keypress.meta === true;
  const key = altKey && name === 'b'
    ? 'left'
    : altKey && name === 'f'
      ? 'right'
      : name ?? printableKey(value);
  if (key === null) return null;

  const text = printableText(value, keypress);
  return Object.freeze({
    key,
    ...(text === null ? {} : { text }),
    ...(altKey ? { altKey: true } : {}),
    ...(keypress.ctrl === true ? { ctrlKey: true } : {}),
    ...(keypress.shift === true ? { shiftKey: true } : {}),
  });
}

export function createTTYKeyboard(
  input: ReadStream,
  listener: (input: TerminalKeyboardInput) => void,
): Result<TTYKeyboard> {
  if (!input.isTTY || input.setRawMode === undefined) {
    return {
      ok: false,
      error: {
        class: 'construction',
        code: 'interactive-tty-required',
        message: 'Terminal keyboard input requires an interactive TTY.',
      },
    };
  }

  const wasRaw = input.isRaw;
  let closed = false;
  const handleKeypress = (value: string | undefined, keypress: NodeKeypress): void => {
    const normalized = toTerminalKeyboardInput(value, keypress);
    if (normalized !== null) listener(normalized);
  };

  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  input.on('keypress', handleKeypress);

  return {
    ok: true,
    value: Object.freeze({
      close(): void {
        if (closed) return;
        closed = true;
        input.off('keypress', handleKeypress);
        input.setRawMode(wasRaw);
        input.pause();
      },
    }),
  };
}

function normalizeKeyName(name: string | undefined): string | null {
  if (name === undefined) return null;
  if (name === 'return') return 'enter';
  if (name === 'pageup') return 'page-up';
  if (name === 'pagedown') return 'page-down';
  return name;
}

function printableKey(value: string | undefined): string | null {
  return value !== undefined && value.length > 0 ? value : null;
}

function printableText(value: string | undefined, keypress: NodeKeypress): string | null {
  if (value === undefined || value.length === 0) return null;
  if (keypress.ctrl === true || keypress.meta === true) return null;
  return Array.from(value).every((character) => character >= ' ') ? value : null;
}
