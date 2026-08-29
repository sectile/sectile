import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createTextEditingState } from '@sectile/core/text';
import { deriveNativeReplacement } from '../.verification-dist/internal/text-element.js';
import { createText, createTextController, createTextState, toTextEvent } from '../.verification-dist/text.js';

test('DOM text creates a caret-preserving state from a plain string', () => {
  const state = createTextState('한글');
  assert.equal(state.snapshot.text, '한글');
  assert.equal(state.snapshot.selection.anchorCodeUnitOffset, 2);
  assert.equal(state.snapshot.selection.focusCodeUnitOffset, 2);
});

test('DOM text facade separates semantic edits from native IME ownership', async () => {
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    defaultValue: createTextEditingState('a', selection(1)),
    onTransition: ({ input }) => transitions.push(input.type),
  });
  assert.equal(element.value, 'a');
  assert.equal(connection.handleEvent({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '한',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(2),
  }), true);
  assert.equal(connection.getValue(), 'a한');
  assert.equal(element.value, 'a한');
  assert.deepEqual(element.selection, [2, 2]);

  element.emit('compositionstart', { data: '' });
  element.value = 'a한ㄱ';
  element.selectionStart = 3;
  element.selectionEnd = 3;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.value = 'a한글';
  element.selectionStart = 3;
  element.selectionEnd = 3;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '글' });
  element.emit('input', { inputType: 'insertCompositionText' });
  await Promise.resolve();
  assert.equal(connection.getValue(), 'a한글');
  assert.equal(connection.getSnapshot().state.composition, null);
  assert.deepEqual(transitions, [
    'beforeinput',
    'composition-start',
    'composition-update',
    'composition-update',
    'composition-commit',
  ]);
  connection.disconnect();
  assert.equal(element.listeners.get('input')?.size ?? 0, 0);
});

test('selectionless email input adopts autocomplete and native deletion results', () => {
  const initial = 'saved@example.com';
  const element = new FakeSelectionlessTextElement();
  const connection = createText({
    element,
    defaultValue: createTextEditingState(initial, selection(initial.length)),
  });

  element.value = 'other@example.com';
  element.emit('input', { inputType: 'insertReplacementText' });
  assert.equal(connection.getValue(), 'other@example.com');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 17);

  element.value = 'other@example.co';
  element.emit('input', { inputType: 'deleteContentBackward' });
  assert.equal(connection.getValue(), 'other@example.co');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 16);
  assert.equal(element.listeners.get('beforeinput')?.size ?? 0, 0);
});

test('DOM text adopts native word and line deletion results', () => {
  const initialText = 'one two\nthree four';
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    defaultValue: createTextEditingState(initialText, selection(initialText.length)),
    onTransition: ({ input }) => transitions.push(input),
  });
  let prevented = false;
  element.emit('beforeinput', {
    inputType: 'deleteWordBackward',
    data: null,
    isComposing: false,
    cancelable: true,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, false);

  element.value = 'one two\nthree ';
  element.selectionStart = 14;
  element.selectionEnd = 14;
  element.emit('input', { inputType: 'deleteWordBackward' });
  assert.equal(connection.getValue(), 'one two\nthree ');
  assert.deepEqual(connection.getSnapshot().state.snapshot.selection, {
    anchorCodeUnitOffset: 14,
    focusCodeUnitOffset: 14,
    startCodeUnitOffset: 14,
    endCodeUnitOffset: 14,
    direction: 'none',
  });

  element.value = 'one two\n';
  element.selectionStart = 8;
  element.selectionEnd = 8;
  element.emit('input', { inputType: 'deleteSoftLineBackward' });
  assert.equal(connection.getValue(), 'one two\n');
  assert.deepEqual(transitions.map((input) => [input.type, input.inputType]), [
    ['input', 'deleteWordBackward'],
    ['input', 'deleteSoftLineBackward'],
  ]);
});

test('DOM text adopts non-cancelable and Unicode-safe native replacements', () => {
  const element = new FakeTextElement();
  const connection = createText({
    element,
    defaultValue: createTextEditingState('A😀B', selection(3)),
  });
  let prevented = false;
  element.emit('beforeinput', {
    inputType: 'insertReplacementText',
    data: '😁',
    isComposing: false,
    cancelable: false,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, false);

  element.value = 'A😁B';
  element.selectionStart = 3;
  element.selectionEnd = 3;
  element.emit('input', { inputType: 'insertReplacementText' });
  assert.equal(connection.getValue(), 'A😁B');
  assert.deepEqual(element.selection, [3, 3]);
});

test('DOM text adopts the native search clear action and removes its listener', () => {
  const element = new FakeTextElement();
  const connection = createText({ element, defaultValue: createTextState('select') });

  element.value = '';
  element.selectionStart = 0;
  element.selectionEnd = 0;
  element.emit('search', {});

  assert.equal(connection.getValue(), '');
  assert.equal(element.value, '');
  connection.disconnect();
  assert.equal(element.listeners.get('search')?.size ?? 0, 0);
});

test('controlled DOM text proposes native edits and restores until synchronized', () => {
  const initial = createTextEditingState('alpha beta', selection(10));
  const element = new FakeTextElement();
  let proposed = null;
  const connection = createText({
    element,
    value: initial,
    onValueChange: ({ value }) => { proposed = value; },
  });

  element.value = 'alpha ';
  element.selectionStart = 6;
  element.selectionEnd = 6;
  element.emit('input', { inputType: 'deleteWordBackward' });
  assert.equal(proposed.snapshot.text, 'alpha ');
  assert.equal(connection.getValue(), 'alpha beta');
  assert.equal(element.value, 'alpha beta');

  connection.syncControlledValues({ value: proposed });
  assert.equal(connection.getValue(), 'alpha ');
  assert.equal(element.value, 'alpha ');
});

test('disconnect invalidates a pending IME commit and releases native listeners', async () => {
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    onTransition: ({ input }) => transitions.push(input.type),
  });

  element.emit('compositionstart', { data: '' });
  element.value = '한';
  element.selectionStart = 1;
  element.selectionEnd = 1;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '한' });
  connection.disconnect();
  await Promise.resolve();

  assert.deepEqual(transitions, ['composition-start', 'composition-update']);
  assert.equal(element.listeners.get('input')?.size ?? 0, 0);
  assert.equal(element.listeners.get('search')?.size ?? 0, 0);
  assert.equal(element.listeners.get('compositionstart')?.size ?? 0, 0);
  assert.equal(element.listeners.get('compositionend')?.size ?? 0, 0);
});

test('native replacement reconciliation has linear bounded work and exact output', () => {
  const size = 100_000;
  const previous = `${'a'.repeat(size - 2)}😀`;
  const next = `${'a'.repeat(size - 2)}😁`;
  const replacement = deriveNativeReplacement(previous, next);
  const actual = previous.slice(0, replacement.startCodeUnitOffset)
    + replacement.text
    + previous.slice(replacement.endCodeUnitOffset);

  assert.equal(actual, next);
  assert.ok(replacement.inspectedCodeUnits <= previous.length + next.length + 2);
});

test('DOM beforeinput and composition inputs map to semantic text events', () => {
  assert.deepEqual(toTextEvent({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '😀',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(3),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    text: '😀',
    selection: selection(3),
  });
  assert.deepEqual(toTextEvent({
    type: 'beforeinput',
    inputType: 'deleteContentBackward',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    selection: selection(1),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    text: '',
    selection: selection(1),
  });
  assert.deepEqual(toTextEvent({
    type: 'input',
    inputType: 'deleteWordBackward',
    text: '',
    startCodeUnitOffset: 4,
    endCodeUnitOffset: 8,
    selection: selection(4),
  }), {
    type: 'replace',
    startCodeUnitOffset: 4,
    endCodeUnitOffset: 8,
    text: '',
    selection: selection(4),
  });
  assert.equal(toTextEvent({ type: 'beforeinput', inputType: 'historyUndo' }), null);
});

test('uncontrolled DOM text owns replacement and IME composition state', () => {
  const controller = unwrap(createTextController({
    defaultValue: createTextEditingState('ab', selection(2)),
  }));
  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: 'ㅎ',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 2,
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.getSnapshot().state.snapshot.text, 'aㅎ');
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '한',
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.getSnapshot().state.snapshot.text, 'a한');
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);
  assert.equal(controller.getSnapshot().state.composition, null);
});

test('controlled DOM text emits a full-state proposal until synchronized', () => {
  const changes = [];
  const initial = createTextEditingState('a', selection(1));
  const controller = unwrap(createTextController({
    value: initial,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleTextInput({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '😀',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(3),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.snapshot.text, 'a');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].value.snapshot.text, 'a😀');
  const synchronized = unwrap(controller.syncControlledValues({ value: changes[0].value }));
  assert.equal(synchronized.state.snapshot.text, 'a😀');
});

test('controlled DOM text carries one IME proposal across synchronous composition events', () => {
  const changes = [];
  const controller = unwrap(createTextController({
    value: createTextEditingState('', selection(0)),
    onValueChange: ({ value }) => changes.push(value),
  }));

  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: '',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(0),
  }).ok, true);
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '한',
    selection: selection(1),
  }).ok, true);
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);

  assert.equal(changes.at(-1).snapshot.text, '한');
  assert.equal(changes.at(-1).composition, null);
  assert.equal(controller.getSnapshot().state.snapshot.text, '');
  assert.equal(unwrap(controller.syncControlledValues({ value: changes.at(-1) })).state.snapshot.text, '한');
});

test('DOM text rejects unsupported input and malformed external state atomically', () => {
  const malformed = createTextController({ value: { snapshot: null, composition: null } });
  assert.equal(malformed.ok, false);
  const controller = unwrap(createTextController());
  const initial = controller.getSnapshot();
  const result = controller.handleTextInput({ type: 'beforeinput', inputType: 'historyUndo' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unsupported-dom-text-input');
  assert.equal(result.snapshot, initial);
});

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}

class FakeTextElement {
  tagName = 'INPUT';
  type = 'text';
  value = '';
  selectionStart = 0;
  selectionEnd = 0;
  selectionDirection = 'none';
  selection = [0, 0];
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selection = [start, end];
  }
}

class FakeSelectionlessTextElement extends FakeTextElement {
  type = 'email';
  selectionStart = null;
  selectionEnd = null;
  selectionDirection = null;

  setSelectionRange() {
    throw new Error('selection APIs are unavailable for email inputs');
  }
}
