import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalendar } from '@sectile/dom/calendar';
import { createCombobox } from '@sectile/dom/combobox';
import { createListbox } from '@sectile/dom/listbox';
import { createSlider } from '@sectile/dom/slider';
import { createText } from '@sectile/dom/text';
import { createTreeGrid } from '@sectile/dom/tree-grid';
import { createTreeView } from '@sectile/dom/tree-view';
import { unwrap } from '@sectile/core/result';

test('DOM playground composes every facade through public package subpaths', () => {
  const listbox = unwrap(createListbox({
    items: ['a', 'b'], root: new FakeElement(), defaultHighlightedValue: 'a',
  }));
  assert.equal(listbox.handleKeyboardEvent(keyboardEvent('ArrowDown')), true);
  assert.equal(listbox.getSnapshot().state.cursor.current, 'b');

  const slider = unwrap(createSlider({
    min: '0', max: '100', step: '5', defaultValue: 8, root: new FakeElement(),
  }));
  assert.equal(slider.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(slider.getValue(), '45');

  const calendar = unwrap(createCalendar({
    rows: [['a', 'b'], ['c', 'd']], root: new FakeElement(), defaultHighlightedValue: 'a',
  }));
  assert.equal(calendar.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(calendar.getSnapshot().state.cursor.current, 'b');

  const treeView = unwrap(createTreeView({
    nodes: [{ id: 'root', parentID: null }, { id: 'child', parentID: 'root' }],
    root: new FakeElement(),
    defaultHighlightedValue: 'root',
  }));
  assert.equal(treeView.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.deepEqual(treeView.getSnapshot().state.expansion.ids, ['root']);

  const text = unwrap(createText({ element: new FakeTextElement() }));
  assert.equal(text.handleBeforeInput(inputEvent('insertText', '한')), true);
  assert.equal(text.getValue(), '한');

  const combobox = unwrap(createCombobox({
    items: [{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }],
    input: new FakeTextElement(),
    popup: new FakeElement(),
    policies: { matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()) },
  }));
  assert.equal(combobox.handleBeforeInput(inputEvent('insertText', 'a')), true);
  assert.equal(combobox.getSnapshot().state.cursor.current, 'alpha');

  const treeGrid = unwrap(createTreeGrid({
    rows: [
      { id: 'root', parentID: null, cells: ['root-name', 'root-status'] },
      { id: 'child', parentID: 'root', cells: ['child-name', 'child-status'] },
    ],
    root: new FakeElement(),
    defaultHighlightedValue: 'root-name',
    getCellValue: () => '',
    setCellValue: () => {},
  }));
  assert.equal(treeGrid.handleKeyboardEvent(keyboardEvent('ArrowRight', { altKey: true })), true);
  assert.equal(treeGrid.handleKeyboardEvent(keyboardEvent('ArrowDown')), true);
  assert.equal(treeGrid.getSnapshot().state.cursor.current, 'child-name');

  listbox.disconnect();
  slider.disconnect();
  calendar.disconnect();
  treeView.disconnect();
  text.disconnect();
  combobox.disconnect();
  treeGrid.disconnect();
});

function keyboardEvent(key, overrides = {}) {
  return {
    key, altKey: false, ctrlKey: false, metaKey: false, isComposing: false,
    preventDefault() {}, ...overrides,
  };
}

function inputEvent(inputType, data = null) {
  return { inputType, data, isComposing: false, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  id = '';
  hidden = false;
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

class FakeTextElement extends FakeElement {
  value = '';
  selectionStart = 0;
  selectionEnd = 0;
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
}
