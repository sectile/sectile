import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccordion as createDOMAccordion } from '@sectile/dom/accordion';
import { createDisclosure as createDOMDisclosure } from '@sectile/dom/disclosure';
import { createAccordion as createTerminalAccordion } from '@sectile/terminal/accordion';
import { createDisclosure as createTerminalDisclosure } from '@sectile/terminal/disclosure';

test('DOM and terminal accordions preserve cursor and expansion parity', () => {
  const options = {
    items: ['one', 'disabled', 'three'],
    disabledItems: ['disabled'],
    defaultHighlightedValue: 'one',
    defaultOpenIDs: ['one'],
    policies: { multiple: true },
  };
  const DOM = createDOMAccordion({ ...options, root: new FakeElement() });
  const terminal = createTerminalAccordion(options);
  assertSemanticTrace(DOM, terminal, [
    'next',
    'toggle',
    'first',
    { type: 'open', id: 'three' },
    { type: 'close', id: 'one' },
    'last',
  ]);
});

test('DOM and terminal disclosures preserve uncontrolled and controlled parity', () => {
  const DOM = createDOMDisclosure({ trigger: new FakeElement(), defaultOpen: false });
  const terminal = createTerminalDisclosure({ defaultOpen: false });
  assertSemanticTrace(DOM, terminal, ['toggle', 'open', 'close', 'toggle']);

  const controlledDOM = createDOMDisclosure({ trigger: new FakeElement(), open: false });
  const controlledTerminal = createTerminalDisclosure({ open: false });
  assertSemanticTrace(controlledDOM, controlledTerminal, ['toggle']);
  assert.deepEqual(
    controlledDOM.syncControlledValue(true),
    controlledTerminal.syncControlledValue(true),
  );
  assert.deepEqual(observe(controlledDOM.getSnapshot()), observe(controlledTerminal.getSnapshot()));
});

function assertSemanticTrace(DOM, terminal, events) {
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  for (const event of events) {
    assert.equal(DOM.handleEvent(event), terminal.handleEvent(event));
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
}

function observe(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  hidden = false;
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
