import assert from 'node:assert/strict';
import test from 'node:test';
import stringWidth from 'string-width';
import {
  applyTerminalTextInput,
  removeLastGrapheme,
} from '../dist/keyboard.js';
import { fitTerminalText } from '../dist/layout.js';
import { toTerminalKeyboardInput } from '../dist/node.js';

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

test('terminal text editing removes one grapheme and accepts printable text', () => {
  assert.equal(removeLastGrapheme('한글'), '한');
  assert.equal(removeLastGrapheme('A👨‍👩‍👧‍👦'), 'A');
  assert.equal(applyTerminalTextInput('한', { key: '글', text: '글' }), '한글');
  assert.equal(applyTerminalTextInput('한글', { key: 'backspace' }), '한');
  assert.equal(applyTerminalTextInput('한글', { key: 'left', altKey: true }), null);
});

test('terminal layout fits text by rendered Unicode width', () => {
  assert.equal(stringWidth(fitTerminalText('  · 한글 입력', 20)), 20);
  assert.equal(stringWidth(fitTerminalText('  · Design system', 20)), 20);
  assert.equal(stringWidth(fitTerminalText('한글 입력이 아주 긴 경우', 10)), 10);
});
