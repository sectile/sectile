import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createTextEditingState } from '@sectile/primitives/text';
import { createText, createTextController, toTextEvent } from '../dist/text.js';

test('DOM text facade owns beforeinput rendering and IME composition lifecycle', () => {
  const element = new FakeTextElement();
  const transitions = [];
  const connection = unwrap(createText({
    element,
    defaultValue: unwrap(createTextEditingState('a', selection(1))),
    onTransition: ({ input }) => transitions.push(input.type),
  }));
  assert.equal(element.value, 'a');
  assert.equal(connection.handleBeforeInput(inputEvent('insertText', '한')), true);
  assert.equal(connection.getValue(), 'a한');
  assert.equal(element.value, 'a한');
  assert.deepEqual(element.selection, [2, 2]);

  element.emit('compositionstart', { data: '' });
  element.emit('compositionupdate', { data: '글' });
  element.emit('compositionend', { data: '글' });
  assert.equal(connection.getValue(), 'a한글');
  assert.equal(connection.getSnapshot().state.composition, null);
  assert.deepEqual(transitions, [
    'beforeinput',
    'composition-start',
    'composition-update',
    'composition-commit',
  ]);
  connection.disconnect();
  assert.equal(element.listeners.get('beforeinput')?.size ?? 0, 0);
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
  assert.equal(toTextEvent({ type: 'beforeinput', inputType: 'historyUndo' }), null);
});

test('uncontrolled DOM text owns replacement and IME composition state', () => {
  const controller = unwrap(createTextController({
    defaultValue: unwrap(createTextEditingState('ab', selection(2))),
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
  const initial = unwrap(createTextEditingState('a', selection(1)));
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

function inputEvent(inputType, data = null) {
  return { inputType, data, isComposing: false, preventDefault() {} };
}

class FakeTextElement {
  value = '';
  selectionStart = 0;
  selectionEnd = 0;
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
