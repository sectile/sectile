import { emitKeypressEvents } from 'node:readline';
import type { ReadStream } from 'node:tty';
import type { Result } from '@sectile/core';
import type {
  TerminalAppearance,
  TerminalCapabilities,
  TerminalColorLevel,
} from './appearance.js';
import { createTerminalAppearance } from './appearance.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import type { TerminalFrame, TerminalFrameCursor } from './screen.js';
import { serializeTerminalFrame } from './screen.js';

export interface NodeKeypress {
  readonly name?: string;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
  readonly shift?: boolean;
}

export interface TTYKeyboard {
  close(): void;
}

const ownedTTYInputs = new WeakSet<ReadStream>();

export type TTYKeyboardInputHandler = (input: TerminalKeyboardInput) => void;

export interface NodeTerminalOutput {
  readonly isTTY?: boolean;
  readonly columns?: number;
  readonly rows?: number;
  write(chunk: string): unknown;
  getColorDepth?(): number;
}

export interface NodeTerminalEnvironment {
  readonly TERM?: string;
  readonly COLORTERM?: string;
  readonly NO_COLOR?: string;
  readonly FORCE_COLOR?: string;
}

export interface TerminalScreenWriterOptions {
  readonly appearance?: TerminalAppearance;
  readonly alternateScreen?: boolean;
  readonly clearOnStart?: boolean;
}

export interface TerminalScreenWriter {
  readonly appearance: TerminalAppearance;
  render(frame: TerminalFrame | readonly string[]): void;
  close(): void;
}

export function toTerminalKeyboardInput(
  value: string | undefined,
  keypress: NodeKeypress,
): TerminalKeyboardInput | null {
  const name = normalizeKeyName(keypress.name);
  const altKey = keypress.meta === true;
  const portableEdgeKey = keypress.ctrl === true && name === 'a'
    ? 'home'
    : keypress.ctrl === true && name === 'e'
      ? 'end'
      : null;
  const key = portableEdgeKey
    ?? (altKey && name === 'b'
    ? 'left'
    : altKey && name === 'f'
      ? 'right'
      : name ?? printableKey(value));
  if (key === null) return null;

  const text = printableText(value, keypress);
  return Object.freeze({
    key,
    ...(text === null ? {} : { text }),
    ...(altKey ? { altKey: true } : {}),
    ...(keypress.ctrl === true && portableEdgeKey === null ? { ctrlKey: true } : {}),
    ...(keypress.shift === true ? { shiftKey: true } : {}),
  });
}

export function createTTYKeyboard(
  input: ReadStream,
  listener: TTYKeyboardInputHandler,
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
  if (ownedTTYInputs.has(input)) {
    return {
      ok: false,
      error: {
        class: 'construction',
        code: 'tty-input-already-owned',
        message: 'Terminal keyboard input allows one active owner per TTY stream.',
      },
    };
  }

  const wasRaw = input.isRaw;
  const wasFlowing = input.readableFlowing === true;
  let closed = false;
  const handleKeypress = (value: string | undefined, keypress: NodeKeypress): void => {
    const normalized = toTerminalKeyboardInput(value, keypress);
    if (normalized !== null) listener(normalized);
  };

  ownedTTYInputs.add(input);
  try {
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', handleKeypress);
  } catch (cause) {
    ownedTTYInputs.delete(input);
    try {
      input.off('keypress', handleKeypress);
      input.setRawMode(wasRaw);
      if (wasFlowing) input.resume();
      else input.pause();
    } catch {
      // The original setup failure remains the actionable error.
    }
    return {
      ok: false,
      error: {
        class: 'construction',
        code: 'tty-input-setup-failed',
        message: 'Terminal keyboard input could not acquire the TTY stream.',
        details: { cause: cause instanceof Error ? cause.message : String(cause) },
      },
    };
  }

  return {
    ok: true,
    value: Object.freeze({
      close(): void {
        if (closed) return;
        closed = true;
        input.off('keypress', handleKeypress);
        try {
          input.setRawMode(wasRaw);
        } finally {
          try {
            if (wasFlowing) input.resume();
            else input.pause();
          } finally {
            ownedTTYInputs.delete(input);
          }
        }
      },
    }),
  };
}

export function detectTerminalCapabilities(
  output: NodeTerminalOutput,
  environment: NodeTerminalEnvironment = process.env,
): TerminalCapabilities {
  const forced = parseForcedColor(environment.FORCE_COLOR);
  const colorLevel = forced
    ?? (environment.NO_COLOR !== undefined
      ? 0
      : output.isTTY === true
        ? colorLevelFromDepth(output.getColorDepth?.() ?? inferredColorDepth(environment))
        : 0);
  return Object.freeze({
    colorLevel,
    unicode: output.isTTY === true && environment.TERM !== 'dumb',
  });
}

export function createTerminalScreenWriter(
  output: NodeTerminalOutput,
  options: TerminalScreenWriterOptions = {},
): TerminalScreenWriter {
  const appearance = options.appearance ?? createTerminalAppearance({
    capabilities: detectTerminalCapabilities(output),
  });
  const alternateScreen = options.alternateScreen === true;
  const clearOnStart = options.clearOnStart !== false;
  let previous: readonly string[] = Object.freeze([]);
  let closed = false;
  let started = false;

  const start = (): void => {
    if (started) return;
    started = true;
    if (alternateScreen) output.write('\u001b[?1049h');
    output.write('\u001b[?25l');
    if (clearOnStart) output.write('\u001b[2J\u001b[H');
  };

  return Object.freeze({
    appearance,
    render(frame: TerminalFrame | readonly string[]): void {
      if (closed) return;
      start();
      const structured = isTerminalFrame(frame);
      const next = structured ? serializeTerminalFrame(frame, appearance) : frame;
      const maximumRows = Math.max(previous.length, next.length);
      let payload = '\u001b[?25l';
      for (let row = 0; row < maximumRows; row += 1) {
        const line = next[row] ?? '';
        if (line === (previous[row] ?? '')) continue;
        payload += moveCursor(row, 0);
        payload += line;
        payload += '\u001b[K';
      }
      payload += cursorSequence(structured ? frame.cursor : null);
      if (payload !== '\u001b[?25l') output.write(payload);
      previous = next;
    },
    close(): void {
      if (closed) return;
      closed = true;
      if (started) {
        output.write(`${appearance.reset}\u001b[?25h${alternateScreen ? '\u001b[?1049l' : ''}`);
      }
      previous = Object.freeze([]);
    },
  });
}

function cursorSequence(cursor: TerminalFrameCursor | null): string {
  if (cursor === null || !cursor.visible) return '\u001b[?25l';
  const shape = cursor.shape === 'bar'
    ? (cursor.blink ? 5 : 6)
    : cursor.shape === 'underline'
      ? (cursor.blink ? 3 : 4)
      : (cursor.blink ? 1 : 2);
  return `${moveCursor(cursor.row, cursor.column)}\u001b[${shape} q\u001b[?25h`;
}

function moveCursor(row: number, column: number): string {
  return `\u001b[${row + 1};${column + 1}H`;
}

function parseForcedColor(value: string | undefined): TerminalColorLevel | null {
  if (value === undefined) return null;
  if (value === '' || value === 'true') return 1;
  if (value === 'false' || value === '0') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(3, Math.floor(parsed))) as TerminalColorLevel;
}

function inferredColorDepth(environment: NodeTerminalEnvironment): number {
  if (environment.COLORTERM === 'truecolor' || environment.COLORTERM === '24bit') return 24;
  if (environment.TERM?.includes('256color') === true) return 8;
  return 4;
}

function colorLevelFromDepth(depth: number): TerminalColorLevel {
  if (depth >= 24) return 3;
  if (depth >= 8) return 2;
  if (depth >= 4) return 1;
  return 0;
}

function isTerminalFrame(value: TerminalFrame | readonly string[]): value is TerminalFrame {
  return !Array.isArray(value);
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
