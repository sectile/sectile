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
  { id: 'second', symbol: 's', dimension: { time: 1 }, scale: '1' },
]));

test('DOM quantity field owns compatible unit options, text editing, and canonical commit', () => {
  const input = new FakeInput();
  const unitSelect = new FakeSelect();
  const field = createQuantityField({
    input,
    unitSelect,
    policies: { registry, canonicalUnit: 'meter' },
    defaultQuantity: { value: '1', unit: 'meter' },
    defaultDisplayUnit: 'centimeter',
  });
  assert.deepEqual(unitSelect.children.map(({ value }) => value), ['meter', 'centimeter', 'inch']);
  assert.equal(input.value, '100');
  input.setSelectionRange(0, 3);
  input.emit('beforeinput', beforeInput('250.5'));
  input.emit('keydown', keyboard('Enter'));
  assert.deepEqual(field.getQuantity(), { value: '2.505', unit: 'meter' });
  unitSelect.value = 'meter';
  unitSelect.emit('change', {});
  assert.equal(field.getText(), '2.505');
});

test('DOM read-only quantity field rejects text mutation but allows display conversion', () => {
  const input = new FakeInput();
  const unitSelect = new FakeSelect();
  const field = createQuantityField({
    input,
    unitSelect,
    readOnly: true,
    policies: { registry, canonicalUnit: 'meter' },
    defaultQuantity: { value: '1', unit: 'meter' },
  });
  assert.equal(field.handleEvent({ type: 'text', event: replaceAll('1', '2') }), false);
  unitSelect.value = 'centimeter';
  unitSelect.emit('change', {});
  assert.equal(field.getDisplayUnit(), 'centimeter');
  assert.equal(field.getText(), '100');
});

test('DOM quantity field applies unit-system defaults and commits inline unit expressions', () => {
  const standard = unwrap(createStandardUnitRegistry());
  const imperial = unwrap(createImperialUnitSystem(standard));
  const input = new FakeInput();
  const unitSelect = new FakeSelect();
  const field = createQuantityField({
    input,
    unitSelect,
    policies: {
      registry: standard,
      canonicalUnit: 'metre',
      unitSystem: imperial,
      evaluator: unwrap(createCalculatorExpression()),
    },
    defaultQuantity: { value: '1', unit: 'metre' },
  });
  assert.equal(field.getDisplayUnit(), 'foot');
  assert.deepEqual(unitSelect.children.map(({ value }) => value), ['inch', 'foot', 'yard', 'mile']);
  input.setSelectionRange(0, input.value.length);
  input.emit('beforeinput', beforeInput('100-20% cm'));
  input.emit('keydown', keyboard('Enter'));
  assert.deepEqual(field.getQuantity(), { value: '0.8', unit: 'metre' });
  assert.equal(field.getDisplayUnit(), 'centimetre');
  assert.equal(input.value, '80');
  assert.deepEqual(unitSelect.children.map(({ value }) => value), ['inch', 'foot', 'yard', 'mile', 'centimetre']);
});

function replaceAll(previous, text) {
  return { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: previous.length, text, selection: { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length } };
}
function keyboard(key) { return { key, isComposing: false, preventDefault() {} }; }
function beforeInput(data) { return { inputType: 'insertText', data, cancelable: true, isComposing: false, preventDefault() {} }; }
class FakeElement {
  attributes = new Map(); listeners = new Map(); disabled = false;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
}
class FakeInput extends FakeElement {
  value = ''; type = ''; inputMode = ''; readOnly = false; required = false;
  selectionStart = 0; selectionEnd = 0; selectionDirection = 'none';
  setSelectionRange(start, end, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; }
}
class FakeSelect extends FakeElement {
  value = ''; children = [];
  ownerDocument = { createElement: () => ({ value: '', textContent: '' }) };
  replaceChildren() { this.children = []; }
  append(option) { this.children.push(option); }
}
