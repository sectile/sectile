import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/core/sequence';
import { applyCheckboxGroupEvent, createCheckboxGroupState } from '@sectile/core/checkbox-group';
import { applyRatingEvent, createRatingState } from '@sectile/core/rating';
import { applyStepperEvent, createStepperState } from '@sectile/core/stepper';
import { unwrap } from '@sectile/core/result';
import { createCheckboxGroup as createDOMCheckboxGroup } from '@sectile/dom/checkbox-group';
import { createRating as createDOMRating } from '@sectile/dom/rating';
import { createStepper as createDOMStepper } from '@sectile/dom/stepper';
import { createCheckboxGroup as createTerminalCheckboxGroup } from '@sectile/terminal/checkbox-group';
import { createRating as createTerminalRating } from '@sectile/terminal/rating';
import { createStepper as createTerminalStepper } from '@sectile/terminal/stepper';

test('checkbox-group hosts follow the canonical toggle trace including disabled items', () => {
  const items = ['one', 'disabled', 'three'];
  const domain = createSequence(items);
  const policies = { eligible: (id) => id !== 'disabled' };
  let canonical = createCheckboxGroupState(domain, { current: 'one', selected: ['one'] });
  let revision = 0;
  const options = {
    items,
    disabledItems: ['disabled'],
    defaultValue: ['one'],
    defaultHighlightedValue: 'one',
  };
  const DOM = createDOMCheckboxGroup({ ...options, root: new FakeElement() });
  const terminal = createTerminalCheckboxGroup(options);
  for (const event of ['next', 'toggle', 'previous', 'toggle']) {
    const update = unwrap(applyCheckboxGroupEvent(domain, canonical, event, policies));
    canonical = update.state;
    revision += 1;
    assert.equal(DOM.handleEvent(event), true);
    assert.equal(terminal.handleEvent(event), true);
    assertCanonicalSnapshot(DOM, canonical, revision);
    assertCanonicalSnapshot(terminal, canonical, revision);
  }
  DOM.disconnect();
});

test('stepper hosts preserve canonical activation state, commands, and revision', () => {
  const items = ['one', 'disabled', 'three'];
  const domain = createSequence(items);
  const policies = { eligible: (id) => id !== 'disabled' };
  let canonical = createStepperState(domain, 'one', 'one');
  let revision = 0;
  const DOMActivations = [];
  const terminalActivations = [];
  const options = {
    items,
    disabledItems: ['disabled'],
    defaultValue: 'one',
    defaultHighlightedValue: 'one',
  };
  const DOM = createDOMStepper({ ...options, root: new FakeElement(), onActivate: (id) => DOMActivations.push(id) });
  const terminal = createTerminalStepper({ ...options, onActivate: (id) => terminalActivations.push(id) });
  for (const event of ['next-step', 'activate-step', 'first-step', { type: 'activate-step', id: 'three' }]) {
    const update = unwrap(applyStepperEvent(domain, canonical, event, policies));
    canonical = update.state;
    revision += 1;
    assert.equal(DOM.handleEvent(event), true);
    assert.equal(terminal.handleEvent(event), true);
    assertCanonicalSnapshot(DOM, canonical, revision);
    assertCanonicalSnapshot(terminal, canonical, revision);
  }
  assert.deepEqual(DOMActivations, terminalActivations);
  DOM.disconnect();
});

test('rating hosts preserve canonical clear and direct-set traces', () => {
  const items = ['one', 'two', 'three'];
  const domain = createSequence(items);
  let canonical = createRatingState(domain, 'one');
  let revision = 0;
  const DOMValues = [];
  const terminalValues = [];
  const options = { items, defaultValue: 'one', clearable: true };
  const DOM = createDOMRating({ ...options, root: new FakeElement(), onValueChange: (value) => DOMValues.push(value) });
  const terminal = createTerminalRating({ ...options, onValueChange: (value) => terminalValues.push(value) });
  for (const event of ['increase', { type: 'set', id: 'three' }, 'clear']) {
    const update = unwrap(applyRatingEvent(domain, canonical, event));
    canonical = update.state;
    revision += 1;
    assert.equal(DOM.handleEvent(event), true);
    assert.equal(terminal.handleEvent(event), true);
    assertCanonicalSnapshot(DOM, canonical, revision);
    assertCanonicalSnapshot(terminal, canonical, revision);
  }
  assert.deepEqual(DOMValues, terminalValues);
  DOM.disconnect();
});

function assertCanonicalSnapshot(connection, state, revision) {
  const snapshot = connection.getSnapshot();
  assert.deepEqual(snapshot.state, state);
  assert.equal(snapshot.revision, revision);
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
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  focus() {}
}
