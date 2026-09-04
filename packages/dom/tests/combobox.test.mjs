import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createSequence } from '@sectile/core/sequence';
import { createTextEditingState } from '@sectile/core/text';
import {
  createCombobox,
  tryCreateCombobox,
  createComboboxController,
  toComboboxEffect,
  toComboboxEvent,
  toComboboxTextEvent,
} from '../.verification-dist/combobox.js';

test('DOM combobox facade owns construction, native text input, ARIA, navigation, and acceptance', async () => {
  const input = new FakeTextElement();
  const popup = new FakeElement();
  popup.id = 'cities-popup';
  const accepted = [];
  const connection = createCombobox({
    items: items(),
    input,
    popup,
    policies: fixture().policies,
    onAccept: (id) => accepted.push(id),
  });
  connection.setInputAttributes('City');
  connection.setPopupAttributes('Cities');
  assert.equal(connection.domain.size, 3);
  assert.equal(input.attributes.get('role'), 'combobox');
  assert.equal(input.attributes.get('aria-controls'), 'cities-popup');
  assert.equal(popup.attributes.get('role'), 'listbox');

  input.value = 'al';
  input.selectionStart = 2;
  input.selectionEnd = 2;
  input.emit('input', { inputType: 'insertText' });
  assert.equal(connection.getSnapshot().state.cursor.current, 'a');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowDown')), true);
  assert.equal(input.attributes.get('aria-activedescendant'), 'sectile-combobox-s%3Ac');
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'c' });
  assert.equal(item.id, 'sectile-combobox-s%3Ac');
  assert.equal(item.attributes.get('role'), 'option');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), true);
  assert.deepEqual(accepted, ['c']);
  assert.equal(input.value, 'Alpine');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter', { isComposing: true })), false);
  connection.disconnect();

  const imeInput = new FakeTextElement();
  const imeConnection = createCombobox({
    items: items(),
    input: imeInput,
    policies: fixture().policies,
  });
  imeInput.emit('compositionstart', { data: '' });
  imeInput.value = 'be';
  imeInput.selectionStart = 2;
  imeInput.selectionEnd = 2;
  imeInput.emit('input', { inputType: 'insertCompositionText' });
  imeInput.emit('compositionend', { data: 'be' });
  imeInput.emit('input', { inputType: 'insertCompositionText' });
  await Promise.resolve();
  assert.equal(imeConnection.getSnapshot().state.text.snapshot.text, 'be');
  assert.equal(imeConnection.getSnapshot().state.cursor.current, 'b');
  imeConnection.disconnect();

  const duplicate = tryCreateCombobox({
    items: [{ id: 'a', label: 'A' }, { id: 'a', label: 'Again' }],
    input: new FakeTextElement(),
  });
  assert.equal(duplicate.ok, false);
});

test('DOM combobox restores exact popup hidden ownership on disconnect', () => {
  const input = new FakeTextElement();
  const popup = new FakeElement();
  popup.setAttribute('hidden', 'until-found');
  popup.hidden = true;
  const connection = createCombobox({ items: items(), input, popup, defaultOpen: true });

  assert.equal(popup.getAttribute('hidden'), null);
  connection.disconnect();
  assert.equal(popup.getAttribute('hidden'), 'until-found');
});

test('DOM keyboard and text inputs map onto combobox semantics', () => {
  assert.equal(toComboboxEvent({ key: 'ArrowDown' }), 'next');
  assert.equal(toComboboxEvent({ key: 'ArrowUp' }), 'previous');
  assert.equal(toComboboxEvent({ key: 'Escape' }), 'close');
  assert.equal(toComboboxEvent({ key: 'Enter' }), 'accept');
  assert.equal(toComboboxEvent({ key: 'Enter', metaKey: true }), null);
  assert.deepEqual(toComboboxTextEvent({
    type: 'beforeinput',
    inputType: 'insertText',
    data: 'a',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(1),
  }), {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: 0,
      text: 'a',
      selection: selection(1),
    },
  });
  assert.deepEqual(toComboboxTextEvent({
    type: 'input',
    inputType: 'deleteWordBackward',
    text: '',
    startCodeUnitOffset: 5,
    endCodeUnitOffset: 9,
    selection: selection(5),
  }), {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 5,
      endCodeUnitOffset: 9,
      text: '',
      selection: selection(5),
    },
  });
});

test('DOM combobox commits consecutive native IME results once each', async () => {
  const input = new FakeTextElement();
  const connection = createCombobox({
    items: [{ id: 'hangul', label: '한글' }],
    input,
  });

  await commitComposition(input, '한');
  assert.equal(connection.getSnapshot().state.text.snapshot.text, '한');
  assert.equal(input.value, '한');

  await commitComposition(input, '글');
  assert.equal(connection.getSnapshot().state.text.snapshot.text, '한글');
  assert.equal(input.value, '한글');
});

test('DOM combobox leaves live native IME text under browser ownership', async () => {
  const input = new TrackingTextElement();
  let connection;
  connection = createCombobox({
    items: [{ id: 'hangul', label: '한글' }],
    input,
    onUpdate: () => connection.render(),
  });

  input.emit('compositionstart', { data: '' });
  input.setNativeValue('한');
  input.selectionStart = 1;
  input.selectionEnd = 1;
  input.emit('input', { inputType: 'insertCompositionText' });
  assert.equal(connection.getSnapshot().state.text.snapshot.text, '한');
  assert.equal(input.valueWrites, 0);

  input.emit('compositionend', { data: '한' });
  input.emit('input', { inputType: 'insertCompositionText' });
  await Promise.resolve();
  assert.equal(input.value, '한');
  assert.equal(input.valueWrites, 0);
});

test('controlled DOM combobox carries IME proposals across synchronous composition events', () => {
  const changes = [];
  const controller = unwrap(createComboboxController({
    domain: createSequence(['hangul']),
    labels: new Map([['hangul', '한글']]),
    inputState: createTextEditingState('', selection(0)),
    onInputStateChange: ({ value }) => changes.push(value),
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
  assert.equal(controller.getSnapshot().state.text.snapshot.text, '');
  const synchronized = unwrap(controller.syncControlledValues({ inputState: changes.at(-1) }));
  assert.equal(synchronized.state.text.snapshot.text, '한');
});

test('DOM combobox adopts native word deletion through the shared text binding', () => {
  const input = new FakeTextElement();
  const connection = createCombobox({
    items: items(),
    input,
  });

  input.value = 'alpha beta';
  input.selectionStart = 10;
  input.selectionEnd = 10;
  input.emit('input', { inputType: 'insertText' });
  input.value = 'alpha ';
  input.selectionStart = 6;
  input.selectionEnd = 6;
  input.emit('input', { inputType: 'deleteWordBackward' });

  assert.equal(connection.getSnapshot().state.text.snapshot.text, 'alpha ');
  assert.equal(input.value, 'alpha ');
  connection.disconnect();
});

test('DOM combobox delegates option clicks into direct acceptance', () => {
  const input = new FakeTextElement();
  const popup = new FakeElement();
  const accepted = [];
  const connection = createCombobox({
    items: items(),
    input,
    popup,
    onAccept: (id) => accepted.push(id),
  });
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'b' });
  popup.emit('click', { target: item });
  assert.deepEqual(accepted, ['b']);
  assert.equal(input.value, 'Beta');
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['b']);
});

test('DOM combobox commands project into active-descendant and acceptance effects', () => {
  assert.deepEqual(toComboboxEffect({ type: 'focus', id: 'a' }), {
    type: 'set-active-descendant',
    id: 'a',
  });
  assert.deepEqual(toComboboxEffect({ type: 'accept', id: 'b' }), {
    type: 'dispatch-accept',
    id: 'b',
  });
});

test('uncontrolled DOM combobox filters, navigates, composes, and accepts', () => {
  const controller = unwrap(createComboboxController(fixture()));
  let result = controller.handleTextInput({
    type: 'beforeinput',
    inputType: 'insertText',
    data: 'al',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(2),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.text.snapshot.text, 'al');
  assert.equal(result.snapshot.state.popupOpen, true);
  assert.equal(result.snapshot.state.cursor.current, 'a');
  assert.deepEqual(result.commands, [{ type: 'set-active-descendant', id: 'a' }]);

  result = controller.handleKeyboardInput({ key: 'ArrowDown' });
  assert.equal(result.snapshot.state.cursor.current, 'c');
  result = controller.handleKeyboardInput({ key: 'Escape' });
  assert.equal(result.snapshot.state.popupOpen, false);

  controller.handleTextInput({
    type: 'composition-start',
    text: 'be',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 2,
    selection: selection(2),
  });
  controller.handleTextInput({
    type: 'composition-update',
    text: 'bet',
    selection: selection(3),
  });
  assert.equal(controller.getSnapshot().state.cursor.current, 'c');
  result = controller.handleTextInput({ type: 'composition-commit' });
  assert.equal(result.snapshot.state.text.snapshot.text, 'bet');
  assert.equal(result.snapshot.state.cursor.current, 'b');
  assert.equal(result.snapshot.state.text.composition, null);

  result = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(result.snapshot.state.text.snapshot.text, 'Beta');
  assert.equal(result.snapshot.state.popupOpen, false);
  assert.deepEqual(result.snapshot.state.selection.selected, ['b']);
  assert.deepEqual(result.commands, [{ type: 'dispatch-accept', id: 'b' }]);
});

test('controlled DOM combobox emits full input-state proposals until synchronized', () => {
  const inputStates = [];
  const openValues = [];
  const highlights = [];
  const initial = createTextEditingState();
  const controller = unwrap(createComboboxController({
    ...fixture(),
    inputState: initial,
    open: false,
    highlightedValue: null,
    onInputStateChange(change) {
      inputStates.push(change);
    },
    onOpenChange(change) {
      openValues.push(change);
    },
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
  }));
  const result = controller.handleTextInput({
    type: 'beforeinput',
    inputType: 'insertText',
    data: 'be',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(2),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.text.snapshot.text, '');
  assert.equal(result.snapshot.state.popupOpen, false);
  assert.equal(result.snapshot.state.cursor.current, null);
  assert.equal(inputStates[0].value.snapshot.text, 'be');
  assert.deepEqual(openValues, [{ value: true, previousValue: false }]);
  assert.deepEqual(highlights, [{ value: 'b', previousValue: null }]);
  const synchronized = unwrap(controller.syncControlledValues({
    inputState: inputStates[0].value,
    open: true,
    highlightedValue: 'b',
  }));
  assert.equal(synchronized.state.text.snapshot.text, 'be');
  assert.equal(synchronized.state.popupOpen, true);
  assert.equal(synchronized.state.cursor.current, 'b');
});

test('DOM combobox rejects malformed state and unsupported input atomically', () => {
  const malformed = createComboboxController({
    ...fixture(),
    inputState: { snapshot: null, composition: null },
  });
  assert.equal(malformed.ok, false);
  const controller = unwrap(createComboboxController(fixture()));
  const initial = controller.getSnapshot();
  const result = controller.handleTextInput({ type: 'beforeinput', inputType: 'historyUndo' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unsupported-dom-text-input');
  assert.equal(result.snapshot, initial);
});

function fixture() {
  return {
    domain: createSequence(['a', 'b', 'c']),
    labels: new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Alpine']]),
    policies: {
      matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()),
    },
  };
}

function items() {
  return [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Alpine' },
  ];
}

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}

async function commitComposition(input, text) {
  input.emit('compositionstart', { data: '' });
  input.value += text;
  input.selectionStart = input.value.length;
  input.selectionEnd = input.value.length;
  input.emit('input', { inputType: 'insertCompositionText' });
  input.emit('compositionend', { data: text });
  input.emit('input', { inputType: 'insertCompositionText' });
  await Promise.resolve();
}

function keyboardEvent(key, overrides = {}) {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    preventDefault() {},
    ...overrides,
  };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  id = '';
  hidden = false;

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

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

class FakeTextElement extends FakeElement {
  value = '';
  selectionStart = 0;
  selectionEnd = 0;
  selectionDirection = 'none';

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
}

class TrackingTextElement extends FakeElement {
  #value = '';
  valueWrites = 0;
  selectionStart = 0;
  selectionEnd = 0;

  get value() {
    return this.#value;
  }

  set value(value) {
    this.#value = value;
    this.valueWrites += 1;
  }

  setNativeValue(value) {
    this.#value = value;
  }

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
}
