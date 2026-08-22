import assert from 'node:assert/strict';
import test from 'node:test';
import { createMenu as createDOMMenu } from '@sectile/dom/menu';
import { createMenuButton as createDOMMenuButton } from '@sectile/dom/menu-button';
import { createMenubar as createDOMMenubar } from '@sectile/dom/menubar';
import { createMenu as createTerminalMenu } from '@sectile/terminal/menu';
import { createMenuButton as createTerminalMenuButton } from '@sectile/terminal/menu-button';
import { createMenubar as createTerminalMenubar } from '@sectile/terminal/menubar';

const items = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'disabled', parentID: 'file' },
  { id: 'edit', parentID: null },
  { id: 'copy', parentID: 'edit' },
  { id: 'help', parentID: null },
];

test('DOM and terminal menus and menubars preserve tree navigation parity', () => {
  for (const [createDOM, createTerminal] of [[createDOMMenu, createTerminalMenu], [createDOMMenubar, createTerminalMenubar]]) {
    const root = new FakeElement();
    const options = { items, disabledItems: ['disabled'], defaultHighlightedValue: 'file', typeahead: { textValue: (id) => id } };
    const DOM = createDOM({ ...options, root });
    const terminal = createTerminal(options);
    assertTrace(DOM, terminal, ['last', 'first', 'open-submenu', 'last', 'invoke', 'close-submenu']);
    root.emit('keydown', keyboard('h'));
    terminal.handleKeyboardInput({ key: 'h' });
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
});

test('DOM and terminal menu buttons preserve controlled popup parity', () => {
  const root = new FakeElement(); const trigger = new FakeElement();
  const options = { items, open: false, disabledItems: ['disabled'] };
  const DOM = createDOMMenuButton({ ...options, root, trigger });
  const terminal = createTerminalMenuButton(options);
  assertTrace(DOM, terminal, ['open-popup']);
  assert.deepEqual(DOM.syncControlledValue(true), terminal.syncControlledValue(true));
  assertTrace(DOM, terminal, ['last', 'first', 'open-submenu', 'last', 'invoke']);
  assert.deepEqual(DOM.syncControlledValue(false), terminal.syncControlledValue(false));
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
});

function assertTrace(DOM, terminal, events) {
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  for (const event of events) { DOM.handleEvent(event); terminal.handleEvent(event); assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot())); }
}
function observe(snapshot) { return JSON.parse(JSON.stringify(snapshot)); }
function keyboard(key) { return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} }; }
class FakeElement {
  attributes = new Map(); listeners = new Map(); hidden = false; tabIndex = -1;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() {}
}
