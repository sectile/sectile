import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalculatorExpression } from '@sectile/core/number-field';
import { unwrap } from '@sectile/core/result';
import {
  createImperialUnitSystem,
  createStandardUnitRegistry,
  createUnitRegistry,
} from '@sectile/core/units';
import { createQuantityField } from '../dist/quantity-field.js';

const registry = unwrap(createUnitRegistry([
  { id: 'meter', symbol: 'm', dimension: { length: 1 }, scale: '1' },
  { id: 'centimeter', symbol: 'cm', dimension: { length: 1 }, scale: '0.01' },
  { id: 'inch', symbol: 'in', dimension: { length: 1 }, scale: '0.0254' },
]));

test('terminal quantity field cycles units and commits canonical decimal values', () => {
  const field = unwrap(createQuantityField({
    policies: { registry, canonicalUnit: 'meter' },
    defaultQuantity: { value: '1', unit: 'meter' },
  }));
  field.handleKeyboardInput({ key: ']' });
  assert.equal(field.getDisplayUnit(), 'centimeter');
  assert.equal(field.getText(), '100');
  field.handleKeyboardInput({ key: 'home' });
  field.handleKeyboardInput({ key: 'delete' });
  field.handleKeyboardInput({ key: 'delete' });
  field.handleKeyboardInput({ key: 'delete' });
  field.handleTextInput('250.5');
  field.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(field.getQuantity(), { value: '2.505', unit: 'meter' });
});

test('terminal read-only quantity field allows unit navigation and rejects value mutation', () => {
  const field = unwrap(createQuantityField({
    readOnly: true,
    policies: { registry, canonicalUnit: 'meter' },
    defaultQuantity: { value: '1', unit: 'meter' },
  }));
  assert.equal(field.handleTextInput('2'), false);
  assert.equal(field.handleKeyboardInput({ key: ']' }), true);
  assert.equal(field.getDisplayUnit(), 'centimeter');
  assert.deepEqual(field.getQuantity(), { value: '1', unit: 'meter' });
});

test('terminal quantity field applies profiles and accepts calculator input with a compact unit', () => {
  const standard = unwrap(createStandardUnitRegistry());
  const imperial = unwrap(createImperialUnitSystem(standard));
  const field = unwrap(createQuantityField({
    policies: {
      registry: standard,
      canonicalUnit: 'metre',
      unitSystem: imperial,
      evaluator: unwrap(createCalculatorExpression()),
    },
    defaultQuantity: { value: '1', unit: 'metre' },
  }));
  assert.equal(field.getDisplayUnit(), 'foot');
  assert.equal(field.handleKeyboardInput({ key: ']' }), true);
  assert.equal(field.getDisplayUnit(), 'yard');
  replaceTerminalText(field, '100-20%cm');
  assert.equal(field.handleKeyboardInput({ key: 'enter' }), true);
  assert.deepEqual(field.getQuantity(), { value: '0.8', unit: 'metre' });
  assert.equal(field.getDisplayUnit(), 'centimetre');
  assert.equal(field.getText(), '80');
  assert.equal(field.handleKeyboardInput({ key: ']' }), true);
  assert.equal(field.getDisplayUnit(), 'inch');
});

function replaceTerminalText(field, text) {
  field.handleKeyboardInput({ key: 'home' });
  field.handleKeyboardInput({ key: 'end', shiftKey: true });
  field.handleKeyboardInput({ key: text, text });
}
