import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createCheckbox as createDOMCheckbox } from '@sectile/dom/checkbox';
import { createSwitch as createDOMSwitch } from '@sectile/dom/switch';
import { createToggleButton as createDOMToggleButton } from '@sectile/dom/toggle-button';
import { createCheckbox as createTerminalCheckbox } from '@sectile/terminal/checkbox';
import { createSwitch as createTerminalSwitch } from '@sectile/terminal/switch';
import { createToggleButton as createTerminalToggleButton } from '@sectile/terminal/toggle-button';

test('DOM and terminal checked controls preserve equivalent semantic traces', () => {
  assertCheckedParity(
    () => createDOMCheckbox({ element: new FakeElement(), defaultValue: 'mixed' }),
    () => createTerminalCheckbox({ defaultValue: 'mixed' }),
    ['toggle', { type: 'set', value: 'mixed' }, 'toggle'],
  );
  assertCheckedParity(
    () => createDOMSwitch({ element: new FakeElement(), defaultChecked: true }),
    () => createTerminalSwitch({ defaultChecked: true }),
    ['toggle', { type: 'set', checked: true }, 'toggle'],
  );
  assertCheckedParity(
    () => createDOMToggleButton({ element: new FakeElement(), defaultPressed: false }),
    () => createTerminalToggleButton({ defaultPressed: false }),
    ['toggle', { type: 'set', pressed: true }, 'toggle'],
  );
});

test('DOM and terminal checked controls preserve controlled reconciliation parity', () => {
  const DOM = unwrap(createDOMCheckbox({ element: new FakeElement(), value: false }));
  const terminal = unwrap(createTerminalCheckbox({ value: false }));
  DOM.handleEvent('toggle');
  terminal.handleEvent('toggle');
  assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  assert.deepEqual(DOM.syncControlledValue('mixed'), terminal.syncControlledValue('mixed'));
  assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
});

function assertCheckedParity(createDOM, createTerminal, events) {
  const DOM = unwrap(createDOM());
  const terminal = unwrap(createTerminal());
  assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  for (const event of events) {
    assert.equal(DOM.handleEvent(event), terminal.handleEvent(event));
    assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  }
}

class FakeElement {
  attributes = new Map();
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
}
