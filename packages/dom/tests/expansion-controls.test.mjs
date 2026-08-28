import assert from 'node:assert/strict';
import test from 'node:test';
import { createDisclosure, createDisclosureController, getDisclosureContentAttributes, getDisclosureTriggerAttributes } from '../.verification-dist/disclosure.js';
import { unwrap } from '@sectile/core/result';
import { createAccordion } from '../.verification-dist/accordion.js';

test('DOM disclosure owns click projection and panel visibility', () => {
  const trigger = new FakeElement(); const panel = new FakeElement();
  const disclosure = createDisclosure({ trigger, panel, defaultOpen: false });
  trigger.emit('click');
  assert.equal(disclosure.getSnapshot().state.open, true);
  assert.equal(trigger.attributes.get('aria-expanded'), 'true'); assert.equal(panel.hidden, false);
});

test('DOM disclosure exposes declarative trigger and content projections', () => {
  const controller = unwrap(createDisclosureController({ defaultOpen: true, readOnly: true }));
  const state = controller.getSnapshot().state;
  assert.deepEqual(getDisclosureTriggerAttributes(state, {
    panelID: 'details',
    readOnly: true,
    native: true,
  }), {
    'aria-expanded': 'true',
    'aria-controls': 'details',
    'aria-disabled': undefined,
    'data-state': 'open',
    'data-disabled': undefined,
    'data-readonly': '',
    disabled: false,
    'data-scope': 'disclosure',
    'data-part': 'trigger',
  });
  assert.deepEqual(getDisclosureContentAttributes(state, { id: 'details' }), {
    id: 'details',
    hidden: false,
    'data-state': 'open',
    'data-scope': 'disclosure',
    'data-part': 'content',
  });
  assert.equal(controller.handleEvent('toggle'), false);
});

test('DOM accordion owns header click, keyboard movement, and ARIA projection', () => {
  const root = new FakeElement(); const accordion = createAccordion({
    root, items: ['a', 'b'], defaultHighlightedValue: 'a', defaultOpenIDs: ['a'],
  });
  const b = new FakeElement(); accordion.setHeaderAttributes(b, 'b', 'panel-b');
  root.emit('keydown', { key: 'ArrowDown', altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(accordion.getSnapshot().state.cursor.current, 'b');
  root.emit('click', { target: b }); assert.deepEqual(accordion.getSnapshot().state.openIDs, ['b']);
});

test('DOM accordion derives disabled header semantics and skips it', () => {
  const root = new FakeElement(); const accordion = createAccordion({
    root, items: ['a', 'b', 'c'], disabledItems: ['b'], defaultHighlightedValue: 'a',
  });
  const b = new FakeElement(); accordion.setHeaderAttributes(b, 'b');
  assert.equal(b.attributes.get('aria-disabled'), 'true');
  root.emit('keydown', { key: 'ArrowDown', altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(accordion.getSnapshot().state.cursor.current, 'c');
});

class FakeElement {
  attributes = new Map(); dataset = {}; listeners = new Map(); tabIndex = -1; hidden = false;
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  focus() {}
}
