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
  const initial = unwrap(createTextEditingState());
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
