import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/primitives/sequence';
import { createTextEditingState } from '@sectile/primitives/text';
import {
  createComboboxController,
  toComboboxEffect,
  toComboboxEvent,
  toComboboxTextEvent,
} from '../dist/combobox.js';

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
  const initial = unwrap(createTextEditingState());
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
    domain: unwrap(createSequence(['a', 'b', 'c'])),
    labels: new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Alpine']]),
    policies: {
      matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()),
    },
  };
}

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
