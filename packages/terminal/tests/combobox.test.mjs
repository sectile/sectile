import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/primitives/sequence';
import {
  createComboboxController,
  toComboboxEffect,
  toComboboxEvent,
} from '../dist/combobox.js';

test('terminal Enter maps onto combobox candidate acceptance', () => {
  assert.equal(toComboboxEvent({ key: 'enter' }), 'accept');
  assert.equal(toComboboxEvent({ key: 'down' }), null);
});

test('terminal combobox commands project into submission effects', () => {
  assert.deepEqual(toComboboxEffect({ type: 'accept', id: 'b' }), {
    type: 'submit-candidate',
    id: 'b',
  });
});

test('terminal combobox supports mixed controlled state', () => {
  const inputValues = [];
  const controller = unwrap(createComboboxController({
    ...fixture(),
    inputValue: 'be',
    defaultOpen: true,
    defaultHighlightedValue: 'b',
    onInputValueChange(change) {
      inputValues.push(change);
    },
  }));
  const result = controller.handleKeyboardInput({ key: 'enter' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.text.snapshot.text, 'be');
  assert.equal(result.snapshot.state.popupOpen, false);
  assert.deepEqual(result.snapshot.state.selection.selected, ['b']);
  assert.deepEqual(inputValues, [{ value: 'Beta', previousValue: 'be' }]);
  assert.equal(
    unwrap(controller.syncControlledValues({ inputValue: 'Beta' })).state.text.snapshot.text,
    'Beta',
  );
});

test('unsupported terminal combobox input is failure-atomic', () => {
  const controller = unwrap(createComboboxController(fixture()));
  const initial = controller.getSnapshot();
  const result = controller.handleKeyboardInput({ key: 'down' });
  assert.equal(result.ok, false);
  assert.equal(result.snapshot, initial);
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
