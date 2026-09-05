import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createMenu } from '../.verification-dist/menu.js';
import { createMenuButton } from '../.verification-dist/menu-button.js';
import { createMenubar } from '../.verification-dist/menubar.js';
import { createNavigationMenu } from '../.verification-dist/navigation-menu.js';

test('DOM menu button owns trigger, nested popup path, and invocation', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const open = new FakeElement();
  let invoked = null;
  const menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
    onInvoke: (id) => { invoked = id; },
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(open, 'open');
  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  menu.handleEvent('invoke');

  assert.equal(invoked, 'open');
  assert.equal(trigger.attributes.get('aria-expanded'), 'false');
});

test('DOM menu item registration performs constant projection work per flat item', () => {
  for (const size of [64, 512, 2_048]) {
    const root = new FakeElement();
    const items = Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, parentID: null }));
    const elements = items.map(() => new CountingElement());
    const menu = createMenu({ root, items });

    for (let index = 0; index < size; index += 1) menu.setItemAttributes(elements[index], items[index].id);

    const projectionWrites = elements.reduce((total, element) => total + element.projectionWrites, 0);
    assert.equal(projectionWrites, size * 2, `size ${size}`);
    menu.disconnect();
  }
});

test('DOM menu item replacement preserves one host owner and unregisters the previous host', () => {
  const root = new FakeElement();
  const shared = new FakeElement();
  const replacement = new FakeElement();
  const menu = createMenu({
    root,
    items: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }],
    disabledItems: ['b'],
  });

  menu.setItemAttributes(shared, 'a');
  menu.setItemAttributes(shared, 'b');
  root.emit('click', { target: shared });
  assert.equal(menu.getSnapshot().state.cursor.current, 'b');

  menu.handleEvent('first');
  menu.setItemAttributes(replacement, 'b');
  root.emit('click', { target: shared });
  assert.equal(menu.getSnapshot().state.cursor.current, 'a');
  root.emit('click', { target: replacement });
  assert.equal(menu.getSnapshot().state.cursor.current, 'b');

  menu.setItemAttributes(undefined, 'b');
  menu.handleEvent('first');
  root.emit('click', { target: replacement });
  assert.equal(menu.getSnapshot().state.cursor.current, 'a');
  menu.disconnect();
});

test('DOM menu button owns disabled, edge, typeahead, and controlled open state', () => {
  let now = 0;
  let external = false;
  let menu;
  const root = new FakeElement();
  const trigger = new FakeElement();
  const disabled = new FakeElement();
  menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'alpha', parentID: null }, { id: 'beta', parentID: null }, { id: 'build', parentID: null }],
    disabledItems: ['beta'],
    open: external,
    typeahead: { textValue: (id) => id, now: () => now },
    onOpenChange: (open) => { external = open; queueMicrotask(() => menu.syncControlledValue(external)); },
  });

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

test('DOM menu owns hidden submenu surfaces and collision-safe placement', async () => {
  const { window, root, trigger, file, child, submenu } = menuDOM(500, 300, {
    file: { left: 400, right: 480, top: 120, bottom: 160, width: 80, height: 40 },
    submenu: { left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 },
  });
  const menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }],
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'new');
  menu.setSubmenuAttributes(submenu, 'file');
  assert.equal(submenu.hidden, true);
  assert.equal(submenu.getAttribute('role'), 'menu');
  assert.equal(file.getAttribute('aria-controls'), submenu.id);

  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  await settlePosition(window);
  assert.equal(submenu.hidden, false);
  assert.equal(submenu.dataset.side, 'left');
  assert.equal(submenu.dataset.align, 'start');
  assert.equal(submenu.style.left, '252px');
  assert.equal(submenu.style.top, '120px');

  window.innerWidth = 800;
  window.dispatchEvent(new window.Event('resize'));
  await settlePosition(window);
  assert.equal(submenu.dataset.side, 'right');
  assert.equal(submenu.dataset.align, 'start');
  assert.equal(submenu.style.left, '488px');
});

test('DOM menu button positions its popup without occupying trigger layout', async () => {
  const { window, root, trigger } = menuDOM(500, 300, {
    root: { left: 0, right: 180, top: 0, bottom: 120, width: 180, height: 120 },
    trigger: { left: 100, right: 180, top: 60, bottom: 100, width: 80, height: 40 },
  });
  const menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'new', parentID: null }],
  });

  assert.equal(root.hidden, true);
  menu.handleEvent('open-popup');
  await settlePosition(window);

  assert.equal(root.hidden, false);
  assert.equal(root.dataset.side, 'bottom');
  assert.equal(root.dataset.align, 'center');
  assert.equal(root.style.position, 'absolute');
  assert.equal(root.style.left, '50px');
  assert.equal(root.style.top, '108px');
});

test('DOM menubar opens its top-level submenu below the horizontal item', async () => {
  const { window, root, file, child, submenu } = menuDOM(500, 300, {
    file: { left: 100, right: 180, top: 60, bottom: 100, width: 80, height: 40 },
    submenu: { left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 },
  });
  const menubar = createMenubar({
    root,
    items: [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }],
    defaultHighlightedValue: 'file',
  });

  menubar.setItemAttributes(file, 'file');
  menubar.setItemAttributes(child, 'new');
  menubar.setSubmenuAttributes(submenu, 'file');
  assert.equal(file.dataset.level, '0');
  assert.equal(child.dataset.level, '1');
  assert.equal(submenu.dataset.level, '1');
  menubar.handleEvent('open-submenu');
  await settlePosition(window);

  assert.equal(submenu.hidden, false);
  assert.equal(submenu.dataset.side, 'bottom');
  assert.equal(submenu.dataset.align, 'start');
  assert.equal(submenu.style.left, '100px');
  assert.equal(submenu.style.top, '108px');
});

test('DOM menus reverse horizontal navigation and submenu placement in RTL', async () => {
  const { window, root, file, child, submenu } = menuDOM(800, 300, {
    file: { left: 400, right: 480, top: 60, bottom: 100, width: 80, height: 40 },
    submenu: { left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 },
  });
  const menu = createMenubar({
    root,
    direction: 'rtl',
    items: [{ id: 'file', parentID: null }, { id: 'edit', parentID: null }, { id: 'new', parentID: 'file' }],
    defaultHighlightedValue: 'edit',
  });
  file.style.direction = 'rtl';

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'new');
  menu.setSubmenuAttributes(submenu, 'file');
  root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(menu.getSnapshot().state.cursor.current, 'file');
  menu.handleEvent('open-submenu');
  await settlePosition(window);
  assert.equal(submenu.dataset.align, 'end');
  assert.equal(submenu.style.left, '340px');
  assert.equal(root.getAttribute('dir'), 'rtl');
});

test('DOM navigation menu preserves native navigation roles and toggles panels', () => {
  const root = new FakeElement();
  const products = new FakeElement();
  const overview = new FakeElement();
  const panel = new FakeElement();
  const navigation = createNavigationMenu({
    root,
    items: [{ id: 'products', parentID: null }, { id: 'overview', parentID: 'products' }],
    defaultHighlightedValue: 'products',
    label: 'Primary',
  });

  navigation.setItemAttributes(products, 'products');
  navigation.setItemAttributes(overview, 'overview');
  navigation.setSubmenuAttributes(panel, 'products');
  assert.equal(root.attributes.get('role'), 'navigation');
  assert.equal(products.attributes.has('role'), false);
  assert.equal(panel.hidden, true);

  navigation.handleEvent('open-submenu');
  assert.equal(panel.hidden, false);
  assert.equal(panel.attributes.has('role'), false);
  navigation.handleEvent('escape');
  assert.equal(panel.hidden, true);
});

test('standalone menu roots preserve consumer-authored hidden state', () => {
  const root = new FakeElement();
  root.setAttribute('hidden', 'until-found');
  root.hidden = true;
  const menu = createMenu({ root, items: [{ id: 'file', parentID: null }] });

  assert.equal(root.getAttribute('hidden'), 'until-found');
  assert.equal(root.hidden, true);
  menu.disconnect();
  assert.equal(root.getAttribute('hidden'), 'until-found');
});

test('menu button restores its exact hidden baseline without overwriting a later consumer change', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  root.setAttribute('hidden', 'until-found');
  root.hidden = true;
  const menu = createMenuButton({ root, trigger, items: [{ id: 'file', parentID: null }] });

  assert.equal(root.getAttribute('hidden'), '');
  menu.handleEvent('open-popup');
  assert.equal(root.getAttribute('hidden'), null);
  menu.disconnect();
  assert.equal(root.getAttribute('hidden'), 'until-found');

  const consumerRoot = new FakeElement();
  const consumerMenu = createMenuButton({ root: consumerRoot, trigger: new FakeElement(), items: [{ id: 'file', parentID: null }] });
  assert.equal(consumerRoot.getAttribute('hidden'), '');
  consumerRoot.setAttribute('hidden', 'until-found');
  consumerRoot.hidden = true;
  consumerMenu.disconnect();
  assert.equal(consumerRoot.getAttribute('hidden'), 'until-found');
});

test('menu visibility management can be delegated to the renderer', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const child = new FakeElement();
  const submenu = new FakeElement();
  root.setAttribute('hidden', 'until-found'); root.hidden = true;
  submenu.setAttribute('hidden', 'until-found'); submenu.hidden = true;
  const menu = createMenuButton({
    root, trigger, manageVisibility: false,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setSubmenuAttributes(submenu, 'file');
  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  assert.equal(root.getAttribute('hidden'), 'until-found');
  assert.equal(submenu.getAttribute('hidden'), 'until-found');
  menu.handleEvent('close-popup');
  menu.refresh();
  assert.equal(root.getAttribute('hidden'), 'until-found');
  assert.equal(submenu.getAttribute('hidden'), 'until-found');
  menu.disconnect();
});

test('renderer-owned menu visibility defers focus until the surface is visible', () => {
  const { root, trigger, file, child, submenu } = menuDOM(500, 300);
  root.hidden = true;
  submenu.hidden = true;
  const menu = createMenuButton({
    root, trigger, manageVisibility: false, position: false,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
  });
  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setSubmenuAttributes(submenu, 'file');
  trigger.focus();

  menu.handleEvent('open-popup');
  assert.equal(document.activeElement, trigger);
  root.hidden = false;
  menu.refresh();
  assert.equal(document.activeElement, file);

  menu.handleEvent('open-submenu');
  assert.equal(document.activeElement, file);
  submenu.hidden = false;
  menu.refresh();
  assert.equal(document.activeElement, child);
  menu.disconnect();
});

test('menu unregister restores submenu visibility and generated ID ownership', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const child = new FakeElement();
  const submenu = new FakeElement();
  submenu.setAttribute('hidden', 'until-found');
  submenu.hidden = true;
  const menu = createMenuButton({
    root, trigger,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setSubmenuAttributes(submenu, 'file');
  const generated = submenu.id;
  assert.notEqual(generated, '');
  assert.equal(file.getAttribute('aria-controls'), generated);
  assert.equal(submenu.getAttribute('hidden'), '');

  menu.setSubmenuAttributes(undefined, 'file');
  assert.equal(file.getAttribute('aria-controls'), null);
  assert.equal(submenu.getAttribute('hidden'), 'until-found');
  assert.equal(submenu.id, '');
  menu.setItemAttributes(undefined, 'file');
  menu.disconnect();
});

class FakeView {
  listeners = new Map();
  constructor(innerWidth, innerHeight) { this.innerWidth = innerWidth; this.innerHeight = innerHeight; }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { for (const listener of this.listeners.get(type) ?? []) listener(); }
}

function menuDOM(width, height, rects = {}) {
  const window = new Window({ url: 'https://sectile.dev/' });
  window.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  window.cancelAnimationFrame = (handle) => clearTimeout(handle);
  window.innerWidth = width;
  window.innerHeight = height;
  Object.defineProperties(window.document.documentElement, {
    clientWidth: { configurable: true, get: () => window.innerWidth },
    clientHeight: { configurable: true, get: () => window.innerHeight },
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    ResizeObserver: window.ResizeObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
  });
  const make = (name) => {
    const element = window.document.createElement(name === 'trigger' || name === 'file' || name === 'child' ? 'button' : 'div');
    const rect = rects[name] ?? { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    element.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, toJSON() {} });
    Object.defineProperties(element, {
      offsetWidth: { configurable: true, value: rect.width },
      offsetHeight: { configurable: true, value: rect.height },
    });
    return element;
  };
  const root = make('root'); const trigger = make('trigger'); const file = make('file'); const child = make('child'); const submenu = make('submenu');
  file.append(child, submenu);
  root.append(file);
  window.document.body.append(trigger, root);
  return { window, root, trigger, file, child, submenu };
}

async function settlePosition(window) {
  await new Promise((resolve) => setTimeout(resolve, 10));
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
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  contains(target) { return target === this; }
  focus() {}
  getBoundingClientRect() { return this.rect; }
}

class CountingElement extends FakeElement {
  projectionWrites = 0;
  setAttribute(name, value) { this.projectionWrites += 1; super.setAttribute(name, value); }
  removeAttribute(name) { this.projectionWrites += 1; super.removeAttribute(name); }
}
