import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { terminalStringWidth } from '../.verification-dist/internal/grapheme.js';
import {
  applyTerminalTextInput,
  removeLastGrapheme,
} from '../.verification-dist/keyboard.js';
import { fitTerminalText } from '../.verification-dist/layout.js';
import { createTTYKeyboard, toTerminalKeyboardInput } from '../.verification-dist/node.js';

class FakeTTYInput extends EventEmitter {
  isTTY = true;
  isRaw;
  readableFlowing;

  constructor({ raw = false, flowing = false } = {}) {
    super();
    this.isRaw = raw;
    this.readableFlowing = flowing;
  }

  setRawMode(value) { this.isRaw = value; return this; }
  resume() { this.readableFlowing = true; return this; }
  pause() { this.readableFlowing = false; return this; }
}

test('Node keypresses normalize platform Alt variants before component dispatch', () => {
  assert.deepEqual(toTerminalKeyboardInput(undefined, { name: 'left', meta: true }), {
    key: 'left',
    altKey: true,
  });
  assert.deepEqual(toTerminalKeyboardInput('b', { name: 'b', meta: true }), {
    key: 'left',
    altKey: true,
  });
  assert.deepEqual(toTerminalKeyboardInput('f', { name: 'f', meta: true }), {
    key: 'right',
    altKey: true,
  });
  assert.deepEqual(toTerminalKeyboardInput('한', { name: undefined }), {
    key: '한',
    text: '한',
  });
});

test('Node keypresses expose portable edge aliases', () => {
  assert.deepEqual(toTerminalKeyboardInput('\u0001', { name: 'a', ctrl: true }), {
    key: 'home',
  });
  assert.deepEqual(toTerminalKeyboardInput('\u0005', { name: 'e', ctrl: true }), {
    key: 'end',
  });
});

test('terminal text editing removes one grapheme and accepts printable text', () => {
  assert.equal(removeLastGrapheme('한글'), '한');
  assert.equal(removeLastGrapheme('A👨‍👩‍👧‍👦'), 'A');
  assert.equal(applyTerminalTextInput('한', { key: '글', text: '글' }), '한글');
  assert.equal(applyTerminalTextInput('한글', { key: 'backspace' }), '한');
  assert.equal(applyTerminalTextInput('한글', { key: 'left', altKey: true }), null);
});

test('TTY keyboard owns one stream and restores raw and flow state on close', () => {
  const input = new FakeTTYInput({ raw: false, flowing: false });
  const received = [];
  const external = [];
  input.on('keypress', (value) => external.push(value));

  const first = createTTYKeyboard(input, (value) => received.push(value));
  assert.equal(first.ok, true);
  assert.equal(input.isRaw, true);
  assert.equal(input.readableFlowing, true);
  const competing = createTTYKeyboard(input, () => {});
  assert.equal(competing.ok, false);
  assert.equal(competing.error.code, 'tty-input-already-owned');

  input.emit('keypress', '한', {});
  assert.deepEqual(received, [{ key: '한', text: '한' }]);
  assert.deepEqual(external, ['한']);

  first.value.close();
  first.value.close();
  assert.equal(input.isRaw, false);
  assert.equal(input.readableFlowing, false);
  input.emit('keypress', '글', {});
  assert.deepEqual(received, [{ key: '한', text: '한' }]);
  assert.deepEqual(external, ['한', '글']);

  const reacquired = createTTYKeyboard(input, () => {});
  assert.equal(reacquired.ok, true);
  reacquired.value.close();
});

test('TTY keyboard preserves a pre-existing flowing and raw stream', () => {
  const input = new FakeTTYInput({ raw: true, flowing: true });
  const keyboard = createTTYKeyboard(input, () => {});
  assert.equal(keyboard.ok, true);
  keyboard.value.close();
  assert.equal(input.isRaw, true);
  assert.equal(input.readableFlowing, true);
});

test('terminal layout fits text by rendered Unicode width', () => {
  assert.equal(terminalStringWidth('ASCII'), 5);
  assert.equal(terminalStringWidth('한글'), 4);
  assert.equal(terminalStringWidth('e\u0301'), 1);
  assert.equal(terminalStringWidth('👨‍👩‍👧‍👦'), 2);
  assert.equal(terminalStringWidth('\u0301'), 0);
  assert.equal(terminalStringWidth('！'), 2);
  assert.equal(terminalStringWidth(fitTerminalText('  · 한글 입력', 20)), 20);
  assert.equal(terminalStringWidth(fitTerminalText('  · Design system', 20)), 20);
  assert.equal(terminalStringWidth(fitTerminalText('한글 입력이 아주 긴 경우', 10)), 10);
});
