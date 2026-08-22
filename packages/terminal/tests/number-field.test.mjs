import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalculatorExpression } from '@sectile/core/number-field';
import { unwrap } from '@sectile/core/result';
import { createTextEditingState } from '@sectile/core/text';
import { createNumberField } from '../dist/number-field.js';

test('terminal number field edits at its caret and commits calculator expressions', () => {
  const field = unwrap(createNumberField({
    defaultValue: '50',
    policies: { evaluator: unwrap(createCalculatorExpression()) },
  }));
  field.handleKeyboardInput({ key: 'end' });
  field.handleTextInput('-20%');
  assert.equal(field.getText(), '50-20%');
  field.handleKeyboardInput({ key: 'left' });
  field.handleKeyboardInput({ key: 'backspace' });
  assert.equal(field.getText(), '50-2%');
  field.handleTextInput('0');
  assert.equal(field.getText(), '50-20%');
  field.handleKeyboardInput({ key: 'enter' });
  assert.equal(field.getValue(), '40');
});

test('terminal number field proposes controlled value and text state updates', () => {
  let proposed = null;
  const inputState = editing('2');
  const field = unwrap(createNumberField({
    value: '2',
    inputState,
    policies: { evaluator: unwrap(createCalculatorExpression()) },
    onValueChange: (change) => { proposed = change; },
  }));
  field.handleTextInput('^3');
  assert.equal(field.getText(), '2');
  unwrap(field.syncControlledValues({ value: '2', inputState: editing('2^3') }));
  field.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(proposed, { value: '8', expression: '2^3' });
  assert.equal(field.getValue(), '2');
});

test('terminal number field commits exact decimal arithmetic', () => {
  const field = unwrap(createNumberField({
    defaultValue: '0',
    policies: { evaluator: unwrap(createCalculatorExpression()) },
  }));
  field.handleKeyboardInput({ key: 'home' });
  field.handleKeyboardInput({ key: 'delete' });
  field.handleTextInput('0.1+0.2');
  field.handleKeyboardInput({ key: 'enter' });
  assert.equal(field.getValue(), '0.3');
  assert.equal(field.getText(), '0.3');
});

function editing(text) {
  return unwrap(createTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  }));
}
