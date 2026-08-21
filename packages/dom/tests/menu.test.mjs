import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createMenuButton } from '../dist/menu-button.js';
import { createMenubar } from '../dist/menubar.js';

test('DOM menu button owns trigger, nested popup path, and invocation', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const open = new FakeElement();
  let invoked = null;
  const menu = unwrap(createMenuButton({
    root,
    trigger,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
    onInvoke: (id) => { invoked = id; },
  }));

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(open, 'open');
  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  menu.handleEvent('invoke');

  assert.equal(invoked, 'open');
  assert.equal(trigger.attributes.get('aria-expanded'), 'false');
});

test('DOM menu button owns disabled, edge, typeahead, and controlled open state', () => {
  let now = 0;
  let external = false;
  let menu;
  const root = new FakeElement();
  const trigger = new FakeElement();
  const disabled = new FakeElement();
  menu = unwrap(createMenuButton({
    root,
    trigger,
    items: [{ id: 'alpha', parentID: null }, { id: 'beta', parentID: null }, { id: 'build', parentID: null }],
    disabledItems: ['beta'],
    open: external,
    typeahead: { textValue: (id) => id, now: () => now },
    onOpenChange: (open) => { external = open; queueMicrotask(() => menu.syncControlledValue(external)); },
  }));

  menu.setItemAttributes(disabled, 'beta');
  assert.equal(disabled.attributes.get('aria-disabled'), 'true');
  menu.handleEvent('open-popup');
  menu.syncControlledValue(true);
  menu.handleEvent('last');
  assert.equal(menu.getSnapshot().state.cursor.current, 'build');
  root.emit('keydown', { key: 'a', altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(menu.getSnapshot().state.cursor.current, 'alpha');
  now = 600;
  root.emit('keydown', { key: 'b', altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(menu.getSnapshot().state.cursor.current, 'beta');
  menu.handleEvent('invoke');
  assert.equal(menu.getSnapshot().state.open, true);
});

test('DOM menu owns hidden submenu surfaces and collision-safe placement', () => {
  const view = new FakeView(500, 300);
  const root = new FakeElement(undefined, view);
  const trigger = new FakeElement();
  const file = new FakeElement({ left: 400, right: 480, top: 120, bottom: 160, width: 80, height: 40 });
  const child = new FakeElement();
  const submenu = new FakeElement({ left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 });
  const menu = unwrap(createMenuButton({
    root,
    trigger,
    items: [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }],
  }));

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'new');
  menu.setSubmenuAttributes(submenu, 'file');
  assert.equal(submenu.hidden, true);
  assert.equal(submenu.attributes.get('role'), 'menu');
  assert.equal(file.attributes.get('aria-controls'), submenu.id);

  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  assert.equal(submenu.hidden, false);
  assert.equal(submenu.dataset.placement, 'left-start');
  assert.equal(submenu.style.left, '256px');
  assert.equal(submenu.style.top, '120px');

  view.innerWidth = 800;
  view.emit('resize');
  assert.equal(submenu.dataset.placement, 'right-start');
  assert.equal(submenu.style.left, '484px');
});

test('DOM menu button positions its popup without occupying trigger layout', () => {
  const view = new FakeView(500, 300);
  const root = new FakeElement({ left: 0, right: 180, top: 0, bottom: 120, width: 180, height: 120 }, view);
  const trigger = new FakeElement({ left: 100, right: 180, top: 60, bottom: 100, width: 80, height: 40 });
  const menu = unwrap(createMenuButton({
    root,
    trigger,
    items: [{ id: 'new', parentID: null }],
  }));

  assert.equal(root.hidden, true);
  menu.handleEvent('open-popup');

  assert.equal(root.hidden, false);
  assert.equal(root.dataset.placement, 'bottom-center');
  assert.equal(root.style.position, 'fixed');
  assert.equal(root.style.left, '50px');
  assert.equal(root.style.top, '104px');
});

test('DOM menubar opens its top-level submenu below the horizontal item', () => {
  const view = new FakeView(500, 300);
  const root = new FakeElement(undefined, view);
  const file = new FakeElement({ left: 100, right: 180, top: 60, bottom: 100, width: 80, height: 40 });
  const child = new FakeElement();
  const submenu = new FakeElement({ left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 });
  const menubar = unwrap(createMenubar({
    root,
    items: [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }],
    defaultHighlightedValue: 'file',
  }));

  menubar.setItemAttributes(file, 'file');
  menubar.setItemAttributes(child, 'new');
  menubar.setSubmenuAttributes(submenu, 'file');
  menubar.handleEvent('open-submenu');

  assert.equal(submenu.hidden, false);
  assert.equal(submenu.dataset.placement, 'bottom-start');
  assert.equal(submenu.style.left, '100px');
  assert.equal(submenu.style.top, '104px');
});

class FakeView {
  listeners = new Map();
  constructor(innerWidth, innerHeight) { this.innerWidth = innerWidth; this.innerHeight = innerHeight; }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { for (const listener of this.listeners.get(type) ?? []) listener(); }
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  hidden = false;
  id = '';
  listeners = new Map();
  style = {};
  tabIndex = -1;
  constructor(rect = undefined, view = null) {
    this.rect = rect ?? { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    this.ownerDocument = view === null ? undefined : { defaultView: view };
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  contains(target) { return target === this; }
  focus() {}
  getBoundingClientRect() { return this.rect; }
}
