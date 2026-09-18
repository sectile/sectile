import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { openSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { ReadStream } from 'node:tty';
import test from 'node:test';
import { terminalStringWidth } from '../.verification-dist/text/grapheme.js';
import {
  applyTerminalTextInput,
  removeLastGrapheme,
} from '../.verification-dist/keyboard.js';
import { fitTerminalText } from '../.verification-dist/layout.js';
import { createTTYKeyboard, toTerminalKeyboardInput } from '../.verification-dist/node.js';
import { renderTerminalScreen, serializeTerminalFrame, terminalText } from '../.verification-dist/screen.js';
import { createText } from '../.verification-dist/text.js';

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

test('Node keypresses keep Unicode controls out of insertable text', () => {
  for (const control of ['\u0085', '\u009b']) {
    const input = toTerminalKeyboardInput(control, {});
    assert.notEqual(input, null);
    assert.equal(input.key, control);
    assert.equal(Object.hasOwn(input, 'text'), false);
  }

  for (const printable of ['A', '한', '😀', 'e\u0301', '！', ' ']) {
    assert.equal(toTerminalKeyboardInput(printable, {}).text, printable);
  }
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
  emitKeypressEvents(input);

  const first = createTTYKeyboard(input, (value) => received.push(value));
  assert.equal(first.ok, true);
  assert.equal(input.isRaw, true);
  assert.equal(input.readableFlowing, true);
  const competing = createTTYKeyboard(input, () => {});
  assert.equal(competing.ok, false);
  assert.equal(competing.error.code, 'tty-input-already-owned');

  input.emit('data', Buffer.from('한'));
  assert.deepEqual(received, [{ key: '한', text: '한' }]);
  assert.deepEqual(external, ['한']);

  first.value.close();
  first.value.close();
  assert.equal(input.isRaw, false);
  assert.equal(input.readableFlowing, false);
  input.emit('data', Buffer.from('글'));
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

test('TTY keyboard releases its source listener and decoder ownership on every close', () => {
  for (const raw of [false, true]) for (const flowing of [null, false, true]) {
    const input = new FakeTTYInput({ raw, flowing });
    const baselineSymbols = Object.getOwnPropertySymbols(input);
    for (let cycle = 0; cycle < 16; cycle += 1) {
      const received = [];
      const keyboard = createTTYKeyboard(input, (value) => received.push(value));
      assert.equal(keyboard.ok, true);
      assert.equal(input.listenerCount('data'), 1);
      const forward = input.rawListeners('data')[0];
      input.emit('data', Buffer.from('a'));
      assert.deepEqual(received, [{ key: 'a', text: 'a' }]);
      keyboard.value.close();
      keyboard.value.close();
      assert.equal(input.listenerCount('data'), 0);
      assert.equal(input.listenerCount('keypress'), 0);
      assert.equal(input.listenerCount('newListener'), 0);
      assert.deepEqual(Object.getOwnPropertySymbols(input), baselineSymbols);
      assert.equal(input.isRaw, raw);
      assert.equal(input.readableFlowing, flowing);
      // A captured callback is inert as well as detached from the source.
      forward(Buffer.from('b'));
      assert.equal(received.length, 1);
      let residualKeypresses = 0;
      const external = () => { residualKeypresses += 1; };
      input.on('keypress', external);
      input.emit('data', Buffer.from('c'));
      assert.equal(residualKeypresses, 0);
      input.off('keypress', external);
    }
  }
});

for (const active of [false, true]) {
  test(`TTY keyboard preserves a pre-existing ${active ? 'active' : 'idle'} readline decoder`, () => {
    const input = new FakeTTYInput({ raw: true, flowing: true });
    const externalKeys = [];
    const external = (value) => externalKeys.push(value);
    let externalChunks = 0;
    input.on('data', () => { externalChunks += 1; });
    if (active) input.on('keypress', external);
    emitKeypressEvents(input);
    const baseline = ['data', 'keypress', 'newListener'].map((event) => input.rawListeners(event));
    const received = [];
    const keyboard = createTTYKeyboard(input, (value) => received.push(value));
    assert.equal(keyboard.ok, true);
    input.emit('data', Buffer.from('a'));
    assert.deepEqual(received, [{ key: 'a', text: 'a' }]);
    assert.deepEqual(externalKeys, active ? ['a'] : []);
    keyboard.value.close();
    assert.deepEqual(['data', 'keypress', 'newListener'].map((event) => input.rawListeners(event)), baseline);
    if (!active) input.on('keypress', external);
    input.emit('data', Buffer.from('b'));
    assert.deepEqual(externalKeys, active ? ['a', 'b'] : ['b']);
    assert.equal(externalChunks, 2);
    assert.equal(received.length, 1);
    assert.equal(input.isRaw, true);
    assert.equal(input.readableFlowing, true);
  });
}

test('TTY keyboard preserves listeners and a decoder installed by another owner during acquisition', () => {
  const input = new FakeTTYInput();
  const received = [];
  const external = [];
  const keyboard = createTTYKeyboard(input, (value) => received.push(value));
  assert.equal(keyboard.ok, true);
  emitKeypressEvents(input);
  input.on('keypress', (value) => external.push(value));
  input.emit('data', Buffer.from('a'));
  assert.deepEqual(received, [{ key: 'a', text: 'a' }]);
  keyboard.value.close();
  assert.equal(input.listenerCount('data'), 1);
  input.emit('data', Buffer.from('b'));
  assert.deepEqual(external, ['a', 'b']);
  assert.equal(received.length, 1);
});

test('TTY keyboard decodes fragmented UTF-8 and escape sequences once per input', () => {
  const input = new FakeTTYInput();
  const received = [];
  const keyboard = createTTYKeyboard(input, (value) => received.push(value));
  assert.equal(keyboard.ok, true);
  try {
    const text = Buffer.from('한');
    for (const chunk of [text.subarray(0, 1), text.subarray(1), '\u001b[', 'A', '\u0001', '\u001bb']) {
      input.emit('data', chunk);
    }
    assert.deepEqual(received, [
      { key: '한', text: '한' }, { key: 'up' }, { key: 'home' }, { key: 'left', altKey: true },
    ]);
  } finally { keyboard.value.close(); }
});

test('TTY keyboard keeps decoded C1 controls out of public text and screen state', () => {
  const input = new FakeTTYInput();
  const text = createText();
  const received = [];
  const keyboard = createTTYKeyboard(input, (value) => {
    received.push(value);
    text.handleKeyboardInput(value);
  });
  assert.equal(keyboard.ok, true);
  try {
    input.emit('data', Buffer.from('\u0085'));
    input.emit('data', Buffer.from('\u009b'));
    assert.equal(received.length, 2);
    assert.equal(received.every((value) => !Object.hasOwn(value, 'text')), true);
    assert.equal(text.getValue(), '');
    assert.deepEqual(
      serializeTerminalFrame(renderTerminalScreen(terminalText(text.getValue()), { columns: 2, rows: 1 })),
      ['  '],
    );
  } finally { keyboard.value.close(); }
});

test('TTY keyboard stops publication when closed during a multi-key chunk', () => {
  const input = new FakeTTYInput();
  const received = [];
  const keyboard = createTTYKeyboard(input, (value) => {
    received.push(value);
    keyboard.value.close();
  });
  assert.equal(keyboard.ok, true);
  input.emit('data', Buffer.from('abc'));
  assert.deepEqual(received, [{ key: 'a', text: 'a' }]);
  assert.equal(input.listenerCount('data'), 0);
});

test('TTY keyboard isolates an unfinished escape from the next owner and ignores its late completion', async () => {
  const input = new FakeTTYInput();
  const received = [];
  const first = createTTYKeyboard(input, (value) => received.push(value));
  assert.equal(first.ok, true);
  input.emit('data', Buffer.from('\u001b'));
  first.value.close();
  const second = createTTYKeyboard(input, (value) => received.push(value));
  assert.equal(second.ok, true);
  input.emit('data', Buffer.from('a'));
  second.value.close();
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.deepEqual(received, [{ key: 'a', text: 'a' }]);
  assert.equal(input.listenerCount('data'), 0);
  assert.equal(input.listenerCount('keypress'), 0);
  assert.equal(input.listenerCount('newListener'), 0);
});

for (const phase of ['raw', 'listen', 'resume']) {
  test(`TTY keyboard rolls back a ${phase} setup failure and can be reacquired`, () => {
    const failure = new Error(`${phase} failed`);
    let fail = true;
    class FailingInput extends FakeTTYInput {
      setRawMode(value) {
        super.setRawMode(value);
        if (phase === 'raw' && value && fail) { fail = false; throw failure; }
        return this;
      }
      on(event, callback) {
        super.on(event, callback);
        if (phase === 'listen' && event === 'data' && fail) { fail = false; throw failure; }
        return this;
      }
      resume() {
        super.resume();
        if (phase === 'resume' && fail) { fail = false; throw failure; }
        return this;
      }
    }
    const input = new FailingInput();
    const external = () => {};
    EventEmitter.prototype.on.call(input, 'data', external);
    const result = createTTYKeyboard(input, () => {});
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'tty-input-setup-failed');
    assert.equal(result.error.details.cause, failure.message);
    assert.deepEqual(input.rawListeners('data'), [external]);
    assert.equal(input.listenerCount('newListener'), 0);
    assert.equal(input.listenerCount('keypress'), 0);
    assert.equal(input.isRaw, false);
    assert.equal(input.readableFlowing, false);
    const next = createTTYKeyboard(input, () => {});
    assert.equal(next.ok, true);
    next.value.close();
    assert.deepEqual(input.rawListeners('data'), [external]);
  });
}

test('TTY keyboard releases its listener and ownership even when raw-mode restoration throws', () => {
  const input = new FakeTTYInput();
  const keyboard = createTTYKeyboard(input, () => {});
  assert.equal(keyboard.ok, true);
  const failure = new Error('restore failed');
  input.setRawMode = () => { throw failure; };
  assert.throws(() => keyboard.value.close(), (error) => error === failure);
  keyboard.value.close();
  assert.equal(input.listenerCount('data'), 0);
  assert.equal(input.readableFlowing, false);
  delete input.setRawMode;
  const next = createTTYKeyboard(input, () => {});
  assert.equal(next.ok, true);
  next.value.close();
});

test('TTY keyboard returns an actual ReadStream to its original listener state', { skip: process.platform !== 'linux' }, async () => {
  const input = new ReadStream(openSync('/dev/ptmx', 'r+'));
  input.pause();
  const received = [];
  let keyboard;
  try {
    assert.equal(input.isTTY, true);
    const before = input.rawListeners('data');
    keyboard = createTTYKeyboard(input, (value) => received.push(value));
    assert.equal(keyboard.ok, true);
    input.emit('data', Buffer.from('a'));
    keyboard.value.close();
    assert.deepEqual(input.rawListeners('data'), before);
    assert.equal(input.isRaw, false);
    assert.equal(input.readableFlowing, false);
    assert.deepEqual(received, [{ key: 'a', text: 'a' }]);
  } finally {
    if (keyboard?.ok) keyboard.value.close();
    const closed = once(input, 'close');
    input.destroy();
    await closed;
  }
});

test('TTY keyboard restores a fresh actual ReadStream to its virgin flow behavior', { skip: process.platform !== 'linux' }, async () => {
  const input = new ReadStream(openSync('/dev/ptmx', 'r+'));
  let keyboard;
  try {
    assert.equal(input.isTTY, true);
    assert.equal(input.readableFlowing, null);
    const before = input.rawListeners('data');
    keyboard = createTTYKeyboard(input, () => {});
    assert.equal(keyboard.ok, true);
    assert.equal(input.readableFlowing, true);
    keyboard.value.close();
    assert.deepEqual(input.rawListeners('data'), before);
    assert.equal(input.isRaw, false);
    assert.equal(input.readableFlowing, null);

    const external = () => {};
    input.on('data', external);
    assert.equal(input.readableFlowing, true);
    input.off('data', external);
  } finally {
    if (keyboard?.ok) keyboard.value.close();
    const closed = once(input, 'close');
    input.destroy();
    await closed;
  }
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
