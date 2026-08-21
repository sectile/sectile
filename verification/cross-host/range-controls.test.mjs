import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createMultiThumbSlider as createDOMMultiThumbSlider } from '@sectile/dom/multi-thumb-slider';
import { createSpinButton as createDOMSpinButton } from '@sectile/dom/spin-button';
import { createWindowSplitter as createDOMWindowSplitter } from '@sectile/dom/window-splitter';
import { createMultiThumbSlider as createTerminalMultiThumbSlider } from '@sectile/terminal/multi-thumb-slider';
import { createSpinButton as createTerminalSpinButton } from '@sectile/terminal/spin-button';
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

test('DOM and terminal spin buttons preserve draft, commit, cancel, and controlled sync', () => {
  const options = { min: '-1', max: '2', step: '0.5', value: 2, draft: null };
  const DOM = unwrap(createDOMSpinButton({ ...options, input: new FakeInput() }));
  const terminal = unwrap(createTerminalSpinButton(options));
  assertSemanticTrace(DOM, terminal, [
    { type: 'input', text: '1.5' },
    'commit',
    { type: 'input', text: 'bad' },
    'cancel',
    'increment',
  ]);
  assert.deepEqual(DOM.syncControlledValues({ value: 5, draft: '0.5' }), terminal.syncControlledValues({ value: 5, draft: '0.5' }));
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
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

class FakeInput extends FakeElement { value = ''; }
