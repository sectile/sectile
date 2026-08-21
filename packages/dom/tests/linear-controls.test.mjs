import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createTabs, toTabsEvent } from '../dist/tabs.js';
import { createRadioGroup, toRadioGroupEvent } from '../dist/radio-group.js';
import { createToolbar, toToolbarEvent } from '../dist/toolbar.js';

test('DOM tabs keep manual focus separate and activate direct clicks', () => {
  const root = new FakeElement();
  const activations = [];
  const tabs = unwrap(createTabs({
    root, items: ['one', 'two'], defaultValue: 'one', defaultHighlightedValue: 'one',
    onActivate: (id) => activations.push(id),
  }));
  const second = new FakeElement();
  tabs.setItemAttributes(second, { id: 'two', panelID: 'panel-two' });
  root.emit('keydown', keyboardEvent('ArrowRight'));
  assert.equal(tabs.getSnapshot().state.cursor.current, 'two');
  assert.deepEqual(tabs.getSnapshot().state.selection.selected, ['one']);
  root.emit('click', { target: second });
  assert.deepEqual(tabs.getSnapshot().state.selection.selected, ['two']);
  assert.deepEqual(activations, ['two']);
  assert.equal(second.attributes.get('role'), 'tab');
  tabs.disconnect();
});

test('DOM radio movement checks while toolbar movement stays cursor-only', () => {
  const radioRoot = new FakeElement();
  const radio = unwrap(createRadioGroup({
    root: radioRoot, items: ['a', 'b'], defaultValue: 'a', defaultHighlightedValue: 'a',
  }));
  radioRoot.emit('keydown', keyboardEvent('ArrowDown'));
  assert.deepEqual(radio.getSnapshot().state.selection.selected, ['b']);

  const toolbarRoot = new FakeElement();
  const invoked = [];
  const toolbar = unwrap(createToolbar({
    root: toolbarRoot, items: ['bold', 'italic'], defaultHighlightedValue: 'bold',
    onInvoke: (id) => invoked.push(id),
  }));
  const italic = new FakeElement();
  toolbar.setItemAttributes(italic, 'italic');
  toolbarRoot.emit('click', { target: italic });
  assert.equal(toolbar.getSnapshot().state.cursor.current, 'italic');
  assert.deepEqual(invoked, ['italic']);
});

test('DOM linear controls expose orientation-aware semantic key maps', () => {
  assert.equal(toTabsEvent({ key: 'ArrowRight' }), 'next');
  assert.equal(toTabsEvent({ key: 'ArrowDown' }, 'vertical'), 'next');
  assert.equal(toRadioGroupEvent({ key: ' ' }), 'check');
  assert.equal(toToolbarEvent({ key: 'Enter' }), 'invoke');
  assert.equal(toToolbarEvent({ key: 'ArrowDown' }), null);
});

function keyboardEvent(key) {
  return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;
  hidden = false;

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  focus() {}
}
