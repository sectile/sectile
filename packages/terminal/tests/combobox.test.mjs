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
} from '../dist/combobox.js';

test('terminal combobox facade owns construction, text editing, navigation, and acceptance', () => {
  const accepted = [];
  let updates = 0;
  const connection = createCombobox({
    items: items(),
    policies: fixture().policies,
    onAccept: (id) => accepted.push(id),
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.domain.size, 3);
  assert.equal(connection.handleKeyboardInput({ key: 'a', text: 'al' }), true);
  assert.equal(connection.getInputValue(), 'al');
  assert.equal(connection.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, 'c');
  assert.equal(connection.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(connection.getInputValue(), 'Alpine');
  assert.deepEqual(accepted, ['c']);
  assert.equal(connection.handleKeyboardInput({ key: 'tab' }), false);
  assert.equal(updates, 3);

  const duplicate = tryCreateCombobox({
    items: [{ id: 'a', label: 'A' }, { id: 'a', label: 'Again' }],
  });
  assert.equal(duplicate.ok, false);
});

test('terminal keyboard and text inputs map onto combobox semantics', () => {
  assert.equal(toComboboxEvent({ key: 'down' }), 'next');
  assert.equal(toComboboxEvent({ key: 'up' }), 'previous');
  assert.equal(toComboboxEvent({ key: 'escape' }), 'close');
  assert.equal(toComboboxEvent({ key: 'enter' }), 'accept');
  assert.deepEqual(toComboboxTextEvent({
    type: 'insert',
    text: 'a',
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
});

test('terminal combobox commands project into highlight and submission effects', () => {
  assert.deepEqual(toComboboxEffect({ type: 'focus', id: 'a' }), {
    type: 'highlight-candidate',
    id: 'a',
  });
  assert.deepEqual(toComboboxEffect({ type: 'accept', id: 'b' }), {
    type: 'submit-candidate',
    id: 'b',
  });
});

test('uncontrolled terminal combobox filters, navigates, and accepts', () => {
  const controller = unwrap(createComboboxController(fixture()));
  let result = controller.handleTextInput({
    type: 'insert',
    text: 'al',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(2),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.cursor.current, 'a');
  assert.equal(result.snapshot.state.popupOpen, true);
  result = controller.handleKeyboardInput({ key: 'down' });
  assert.equal(result.snapshot.state.cursor.current, 'c');
  result = controller.handleKeyboardInput({ key: 'up' });
  assert.equal(result.snapshot.state.cursor.current, 'a');
  result = controller.handleTextInput({
    type: 'replace',
    text: 'be',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 2,
    selection: selection(2),
  });
  assert.equal(result.snapshot.state.cursor.current, 'b');
  result = controller.handleKeyboardInput({ key: 'enter' });
  assert.equal(result.snapshot.state.text.snapshot.text, 'Beta');
  assert.deepEqual(result.snapshot.state.selection.selected, ['b']);
});

test('controlled terminal combobox proposes and synchronizes complete input state', () => {
  const inputStates = [];
  const initial = createTextEditingState();
  const controller = unwrap(createComboboxController({
    ...fixture(),
    inputState: initial,
    onInputStateChange(change) {
      inputStates.push(change);
    },
  }));
  const result = controller.handleTextInput({
    type: 'insert',
    text: 'be',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(2),
  });
  assert.equal(result.snapshot.state.text.snapshot.text, '');
  assert.equal(result.snapshot.state.cursor.current, 'b');
  assert.equal(inputStates[0].value.snapshot.text, 'be');
  const synchronized = unwrap(controller.syncControlledValues({ inputState: inputStates[0].value }));
  assert.equal(synchronized.state.text.snapshot.text, 'be');
});

test('unsupported terminal combobox input is failure-atomic', () => {
  const controller = unwrap(createComboboxController(fixture()));
  const initial = controller.getSnapshot();
  const result = controller.handleTextInput({ type: 'paste' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unsupported-terminal-text-input');
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
