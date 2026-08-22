import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createMultiThumbSlider as createDOMMultiThumbSlider } from '@sectile/dom/multi-thumb-slider';
import { createSpinButton as createDOMSpinButton } from '@sectile/dom/spin-button';
import { createNumberField as createDOMNumberField } from '@sectile/dom/number-field';
import { createQuantityField as createDOMQuantityField } from '@sectile/dom/quantity-field';
import { createWindowSplitter as createDOMWindowSplitter } from '@sectile/dom/window-splitter';
import { createMultiThumbSlider as createTerminalMultiThumbSlider } from '@sectile/terminal/multi-thumb-slider';
import { createSpinButton as createTerminalSpinButton } from '@sectile/terminal/spin-button';
import { createNumberField as createTerminalNumberField } from '@sectile/terminal/number-field';
import { createQuantityField as createTerminalQuantityField } from '@sectile/terminal/quantity-field';
import { createCalculatorExpression } from '@sectile/core/number-field';
import { createMetricUnitSystem, createStandardUnitRegistry } from '@sectile/core/units';
import { createWindowSplitter as createTerminalWindowSplitter } from '@sectile/terminal/window-splitter';

test('DOM and terminal multi-thumb sliders preserve constrained and crossing traces', () => {
  for (const policies of [{ minGap: 2 }, { allowCross: true }]) {
    const options = { thumbs: ['low', 'high'], min: '-1', max: '4', step: '0.5', defaultValues: [2, 8], policies };
    const DOM = unwrap(createDOMMultiThumbSlider({ ...options, root: new FakeElement() }));
    const terminal = unwrap(createTerminalMultiThumbSlider(options));
    assertSemanticTrace(DOM, terminal, ['increment', 'end', 'next-thumb', 'decrement', { type: 'set-tick', id: 'low', tick: 7 }]);
    assert.deepEqual(DOM.getValues(), terminal.getValues());
  }
});

test('DOM and terminal spin buttons preserve decimal values, drafts, and controlled sync', () => {
  const options = { min: '-1', max: '2', step: '0.5', value: '0', draft: null };
  const DOM = unwrap(createDOMSpinButton({ ...options, input: new FakeInput() }));
  const terminal = unwrap(createTerminalSpinButton(options));
  assertSemanticTrace(DOM, terminal, [
    { type: 'input', text: '1.5' },
    'commit',
    { type: 'input', text: 'bad' },
    'cancel',
    'increment',
  ]);
  assert.deepEqual(DOM.syncControlledValues({ value: '1.5', draft: '0.5' }), terminal.syncControlledValues({ value: '1.5', draft: '0.5' }));
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  assert.equal(DOM.getText(), terminal.getText());
});

test('DOM and terminal number fields preserve exact expression traces', () => {
  const options = { defaultValue: '50', policies: { evaluator: unwrap(createCalculatorExpression()) } };
  const DOM = unwrap(createDOMNumberField({ ...options, input: new FakeInput() }));
  const terminal = unwrap(createTerminalNumberField(options));
  assertSemanticTrace(DOM, terminal, [
    replaceText(2, '50-20%'),
    'commit',
    replaceText(2, '2^3^2'),
    'commit',
    replaceText(3, '1/0'),
    'cancel',
  ]);
  assert.equal(DOM.getValue(), '512');
  assert.equal(DOM.getText(), terminal.getText());
});

test('DOM and terminal quantity fields preserve canonical values across display units', () => {
  const registry = unwrap(createStandardUnitRegistry());
  const unitSystem = unwrap(createMetricUnitSystem(registry));
  const options = {
    policies: { registry, unitSystem, canonicalUnit: 'metre', evaluator: unwrap(createCalculatorExpression()) },
    defaultQuantity: { value: '1', unit: 'metre' },
    defaultDisplayUnit: 'centimetre',
  };
  const DOM = unwrap(createDOMQuantityField({ ...options, input: new FakeInput() }));
  const terminal = unwrap(createTerminalQuantityField(options));
  assertSemanticTrace(DOM, terminal, [
    replaceText(3, '250.5'),
    'commit',
    { type: 'set-display-unit', unit: 'inch' },
  ]);
  assertSemanticTrace(DOM, terminal, [
    replaceText(DOM.getText().length, '100-20% cm'),
    'commit',
    { type: 'set-display-unit', unit: 'metre' },
  ]);
  assert.deepEqual(DOM.getQuantity(), { value: '0.8', unit: 'metre' });
  assert.equal(DOM.getText(), terminal.getText());
});

test('DOM and terminal window splitters preserve range traces', () => {
  const options = { min: '0', max: '100', step: '1', defaultValue: 50, page: 10, orientation: 'vertical' };
  const DOM = unwrap(createDOMWindowSplitter({ ...options, root: new FakeElement() }));
  const terminal = unwrap(createTerminalWindowSplitter(options));
  const inputs = [
    [{ key: 'ArrowDown' }, { key: 'down' }],
    [{ key: 'ArrowUp' }, { key: 'up' }],
    [{ key: 'PageDown' }, { key: 'page-down' }],
    [{ key: 'End' }, { key: 'end' }],
    [{ key: 'Home' }, { key: 'home' }],
  ];
  for (const [DOMInput, terminalInput] of inputs) {
    DOM.handleKeyboardEvent(DOMInput);
    terminal.handleKeyboardInput(terminalInput);
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
});

function assertSemanticTrace(DOM, terminal, events) {
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  for (const event of events) {
    DOM.handleEvent(event);
    terminal.handleEvent(event);
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
}

function observe(snapshot) { return JSON.parse(JSON.stringify(snapshot)); }

function replaceText(previousLength, text) {
  return {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: previousLength,
      text,
      selection: { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length },
    },
  };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, width: 100, top: 0, bottom: 100, height: 100 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  focus() {}
}

class FakeInput extends FakeElement {
  value = ''; type = ''; inputMode = ''; disabled = false; readOnly = false; required = false;
  selectionStart = 0; selectionEnd = 0; selectionDirection = 'none';
  setSelectionRange(start, end, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; }
}
