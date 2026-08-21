import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/primitives/sequence';
import {
  createComboboxController,
  toComboboxEffect,
  toComboboxEvent,
} from '../dist/combobox.js';

test('DOM Enter maps onto combobox candidate acceptance', () => {
  assert.equal(toComboboxEvent({ key: 'Enter' }), 'accept');
  assert.equal(toComboboxEvent({ key: 'Enter', metaKey: true }), null);
  assert.equal(toComboboxEvent({ key: 'ArrowDown' }), null);
});

test('DOM combobox commands project into acceptance effects', () => {
  assert.deepEqual(toComboboxEffect({ type: 'accept', id: 'b' }), {
    type: 'dispatch-accept',
    id: 'b',
  });
});

test('uncontrolled DOM combobox accepts the current candidate', () => {
  const controller = unwrap(createComboboxController({
    ...fixture(),
    defaultInputValue: 'be',
    defaultOpen: true,
    defaultHighlightedValue: 'b',
  }));
  const result = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.text.snapshot.text, 'Beta');
  assert.equal(result.snapshot.state.popupOpen, false);
  assert.deepEqual(result.snapshot.state.selection.selected, ['b']);
  assert.deepEqual(result.commands, [{ type: 'dispatch-accept', id: 'b' }]);
});

test('controlled DOM combobox emits proposals until synchronized', () => {
  const values = [];
  const inputValues = [];
  const openValues = [];
  const controller = unwrap(createComboboxController({
    ...fixture(),
    value: null,
    inputValue: 'be',
    open: true,
    highlightedValue: 'b',
    onValueChange(change) {
      values.push(change);
    },
    onInputValueChange(change) {
      inputValues.push(change);
    },
    onOpenChange(change) {
      openValues.push(change);
    },
  }));
  const result = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.snapshot.state.selection.selected, []);
  assert.equal(result.snapshot.state.text.snapshot.text, 'be');
  assert.equal(result.snapshot.state.popupOpen, true);
  assert.deepEqual(values, [{ value: 'b', previousValue: null }]);
  assert.deepEqual(inputValues, [{ value: 'Beta', previousValue: 'be' }]);
  assert.deepEqual(openValues, [{ value: false, previousValue: true }]);
  const synchronized = unwrap(controller.syncControlledValues({
    value: 'b',
    inputValue: 'Beta',
    open: false,
    highlightedValue: 'b',
  }));
  assert.deepEqual(synchronized.state.selection.selected, ['b']);
  assert.equal(synchronized.state.text.snapshot.text, 'Beta');
  assert.equal(synchronized.state.popupOpen, false);
});

test('DOM combobox rejects acceptance without a current candidate atomically', () => {
  const controller = unwrap(createComboboxController(fixture()));
  const initial = controller.getSnapshot();
  const result = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'no-candidate');
  assert.equal(result.snapshot, initial);
});

test('DOM combobox rejects malformed input values during construction', () => {
  const result = createComboboxController({ ...fixture(), inputValue: null });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-combobox-input-value');
});

function fixture() {
  return {
    domain: unwrap(createSequence(['a', 'b'])),
    labels: new Map([['a', 'Alpha'], ['b', 'Beta']]),
  };
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
