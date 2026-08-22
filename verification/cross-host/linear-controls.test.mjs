import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabs as createDOMTabs } from '@sectile/dom/tabs';
import { createRadioGroup as createDOMRadioGroup } from '@sectile/dom/radio-group';
import { createToolbar as createDOMToolbar } from '@sectile/dom/toolbar';
import { createTabs as createTerminalTabs } from '@sectile/terminal/tabs';
import { createRadioGroup as createTerminalRadioGroup } from '@sectile/terminal/radio-group';
import { createToolbar as createTerminalToolbar } from '@sectile/terminal/toolbar';

test('DOM and terminal tabs preserve the same selection and cursor trace', () => {
  const options = {
    items: ['one', 'disabled', 'three'],
    disabledItems: ['disabled'],
    defaultValue: 'one',
    defaultHighlightedValue: 'one',
  };
  const DOM = createDOMTabs({ ...options, root: new FakeElement() });
  const terminal = createTerminalTabs(options);
  assertSemanticTrace(DOM, terminal, ['next', 'activate', 'first', 'last', 'previous']);
});

test('DOM and terminal radio groups preserve the same checked trace', () => {
  const options = {
    items: ['alpha', 'disabled', 'gamma'],
    disabledItems: ['disabled'],
    defaultValue: 'alpha',
    defaultHighlightedValue: 'alpha',
  };
  const DOM = createDOMRadioGroup({ ...options, root: new FakeElement() });
  const terminal = createTerminalRadioGroup(options);
  assertSemanticTrace(DOM, terminal, ['next', 'last', 'previous', { type: 'check', id: 'gamma' }]);
});

test('DOM and terminal toolbars preserve cursor and invocation parity', () => {
  const DOMInvoked = [];
  const terminalInvoked = [];
  const options = {
    items: ['bold', 'disabled', 'italic'],
    disabledItems: ['disabled'],
    defaultHighlightedValue: 'bold',
  };
  const DOM = createDOMToolbar({
    ...options,
    root: new FakeElement(),
    onInvoke: (id) => DOMInvoked.push(id),
  });
  const terminal = createTerminalToolbar({
    ...options,
    onInvoke: (id) => terminalInvoked.push(id),
  });
  assertSemanticTrace(DOM, terminal, ['next', 'invoke', 'first', { type: 'invoke', id: 'italic' }]);
  assert.deepEqual(DOMInvoked, terminalInvoked);
});

function assertSemanticTrace(DOM, terminal, events) {
  assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  for (const event of events) {
    assert.equal(DOM.handleEvent(event), terminal.handleEvent(event));
    assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  }
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  focus() {}
}
