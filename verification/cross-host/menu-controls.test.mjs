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

test('controlled menu opening proposals retain their canonical cursor until owner resolution', () => {
  for (const immediate of [false, true]) {
    const controls = [];
    for (const host of ['dom', 'terminal']) {
      let control;
      const options = {
        items, open: false,
        onOpenChange: (open) => { if (immediate) control.syncControlledValue(open); },
      };
      control = host === 'dom'
        ? createDOMMenuButton({ ...options, root: new FakeElement(), trigger: new FakeElement() })
        : createTerminalMenuButton(options);
      controls.push(control);
      for (let cycle = 0; cycle < 3; cycle += 1) {
        assert.equal(control.send('open-popup'), true);
        if (!immediate) {
          assert.equal(control.state.open, false);
          assert.equal(control.state.cursor.current, null);
          assert.equal(control.syncControlledValue(true).ok, true);
        }
        assert.equal(control.state.open, true);
        assert.equal(control.state.cursor.current, 'file');
        assert.equal(control.send('open-submenu'), true);
        assert.equal(control.state.cursor.current, 'new');
        assert.deepEqual(control.state.openPath, ['file']);
        assert.equal(control.send('close-popup'), true);
        if (!immediate) assert.equal(control.syncControlledValue(false).ok, true);
        assert.equal(control.state.open, false);
      }
    }
    assert.deepEqual(controls[0].getSnapshot(), controls[1].getSnapshot());
    for (const control of controls) control.destroy();
  }
});

test('controlled menu owner rejection discards the pending opening cursor in both hosts', () => {
  const controls = [
    createDOMMenuButton({ items, open: false, root: new FakeElement(), trigger: new FakeElement() }),
    createTerminalMenuButton({ items, open: false }),
  ];
  for (const control of controls) {
    control.send('open-popup');
    assert.equal(control.syncControlledValue(false).ok, true);
    assert.equal(control.syncControlledValue(true).ok, true);
    assert.equal(control.state.cursor.current, null);
    control.destroy();
  }
  assert.deepEqual(controls[0].getSnapshot(), controls[1].getSnapshot());
});

test('pointer opening retains its opener and Escape closes the newest branch first', () => {
  const root = new FakeElement(), trigger = new FakeElement();
  const dom = createDOMMenuButton({ items, root, trigger });
  dom.handleEvent({ type: 'open-popup', focus: false });
  assert.equal(dom.state.open, true);
  assert.equal(dom.state.cursor.current, null);
  dom.handleEvent({ type: 'focus', id: 'file' });
  dom.handleEvent({ type: 'open-submenu', focus: false });
  assert.equal(dom.state.cursor.current, 'file');
  assert.deepEqual(dom.state.openPath, ['file']);
  dom.handleEvent('escape');
  assert.equal(dom.state.open, true);
  assert.deepEqual(dom.state.openPath, []);
  assert.equal(dom.state.cursor.current, 'file');
  dom.handleEvent('escape');
  assert.equal(dom.state.open, false);
  dom.destroy();
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
