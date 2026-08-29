import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalculatorExpression } from '@sectile/core/number-field';
import { unwrap } from '@sectile/core/result';
import {
  createImperialUnitSystem,
  createStandardUnitRegistry,
  createUnitRegistry,
} from '@sectile/core/units';
import {
  createQuantityField,
  createStandardQuantityPolicies,
} from '../.verification-dist/quantity-field.js';

const registry = createUnitRegistry([
  { id: 'meter', symbol: 'm', dimension: { length: 1 }, scale: '1' },
  { id: 'centimeter', symbol: 'cm', dimension: { length: 1 }, scale: '0.01' },
  { id: 'inch', symbol: 'in', dimension: { length: 1 }, scale: '0.0254' },
  { id: 'second', symbol: 's', dimension: { time: 1 }, scale: '1' },
]);

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
  nativeInput(input, '250.5');
  input.emit('keydown', keyboard('Enter'));
  assert.deepEqual(field.getQuantity(), { value: '2.505', unit: 'meter' });
  unitSelect.value = 'meter';
  unitSelect.emit('change', {});
  assert.equal(field.getText(), '2.505');
  nativeInput(input, '2+2');
  input.emit('blur', {});
  assert.equal(field.getText(), '2.505');
  assert.equal(input.attributes.get('aria-invalid'), 'false');
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
  const standard = createStandardUnitRegistry();
  const imperial = createImperialUnitSystem(standard);
  const input = new FakeInput();
  const unitSelect = new FakeSelect();
  const field = createQuantityField({
    input,
    unitSelect,
    policies: {
      registry: standard,
      canonicalUnit: 'metre',
      unitSystem: imperial,
      evaluator: createCalculatorExpression(),
    },
    defaultQuantity: { value: '1', unit: 'metre' },
  });
  assert.equal(field.getDisplayUnit(), 'foot');
  assert.deepEqual(unitSelect.children.map(({ value }) => value), ['inch', 'foot', 'yard', 'mile']);
  nativeInput(input, '100-20% cm');
  input.emit('keydown', keyboard('Enter'));
  assert.deepEqual(field.getQuantity(), { value: '0.8', unit: 'metre' });
  assert.equal(field.getDisplayUnit(), 'centimetre');
  assert.equal(input.value, '80');
  assert.deepEqual(unitSelect.children.map(({ value }) => value), ['inch', 'foot', 'yard', 'mile', 'centimetre']);
});

test('DOM quantity field exposes standard policies without a core dependency', () => {
  const metric = createStandardQuantityPolicies('metre', 'metric');
  const all = createStandardQuantityPolicies('metre');

  assert.equal(metric.canonicalUnit, 'metre');
  assert.equal(metric.unitSystem.id, 'metric');
  assert.equal(all.canonicalUnit, 'metre');
  assert.equal(all.unitSystem, undefined);
  assert.equal(metric.registry.get('centimetre')?.symbol, 'cm');
});

test('controlled DOM quantity field rebases clean display text and preserves active drafts', () => {
  const input = new FakeInput();
  const field = createQuantityField({
    input,
    policies: { registry, canonicalUnit: 'meter' },
    quantity: { value: '1', unit: 'meter' },
    displayUnit: 'centimeter',
  });
  input.setSelectionRange(0, 3);
  assert.equal(field.syncControlledValues({
    quantity: { value: '2', unit: 'meter' },
    displayUnit: 'centimeter',
  }).ok, true);
  assert.equal(input.value, '200');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 3]);

  nativeInput(input, '2+');
  assert.equal(field.syncControlledValues({
    quantity: { value: '3', unit: 'meter' },
    displayUnit: 'meter',
  }).ok, true);
  assert.equal(input.value, '2+');
});

function replaceAll(previous, text) {
  return { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: previous.length, text, selection: { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length } };
}
function keyboard(key) { return { key, isComposing: false, preventDefault() {} }; }
function nativeInput(input, value) {
  input.value = value;
  input.setSelectionRange(value.length, value.length);
  input.emit('input', { inputType: 'insertReplacementText' });
}
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
