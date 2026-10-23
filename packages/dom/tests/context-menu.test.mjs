import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createMenuModel } from '@sectile/core/menu';
import { createContextMenu, tryCreateContextMenu } from '../.verification-dist/context-menu.js';

test('context pointer geometry opens the canonical first item and Escape returns focus', t => {
  const f = fixture(t), menu = f.connect();
  f.trigger.focus();
  assert.equal(f.context(120, 140).defaultPrevented, true);
  f.flush();
  assert.equal(f.root.style.left, '120px'); assert.equal(f.root.style.top, '140px');
  assert.equal(menu.getSnapshot().state.cursor.current, 'first');
  assert.ok(f.window.document.activeElement === f.first);
  assert.equal(f.root.hidden, false); assert.equal(menu.getSnapshot().state.open, true);
  assert.equal(f.key(f.first, 'Escape').defaultPrevented, true);
  assert.equal(menu.getSnapshot().state.open, false); assert.equal(f.root.hidden, true);
  assert.ok(f.window.document.activeElement === f.trigger);
  menu.destroy(); f.assertClean();
});

test('keyboard invocation clears pointer geometry and uses logical element alignment', t => {
  for (const direction of ['ltr', 'rtl']) {
    const f = fixture(t), menu = f.connect({ direction });
    f.context(200, 150); f.flush();
    const before = menu.getSnapshot();
    f.trigger.focus();
    assert.equal(f.key(f.trigger, 'F10', { shiftKey: true }).defaultPrevented, true);
    f.flush();
    assert.equal(f.root.style.left, direction === 'rtl' ? '110px' : '50px');
    assert.equal(f.root.style.top, '70px');
    assert.ok(f.window.document.activeElement === f.first);
    assert.equal(menu.getSnapshot().state.cursor.current, before.state.cursor.current);
    assert.deepEqual(menu.getSnapshot().state.openPath, before.state.openPath);
    menu.handleEvent('close-popup');
    assert.equal(f.key(f.trigger, 'ContextMenu').defaultPrevented, true); f.flush();
    assert.ok(f.window.document.activeElement === f.first);
    menu.handleEvent('close-popup');
    f.context(0, 0, { button: 0 }); f.flush();
    assert.equal(f.root.style.top, '70px', 'keyboard-generated context event uses the element');
    menu.handleEvent('close-popup');
    f.context(0, 0); f.flush();
    assert.equal(f.root.style.left, '0px'); assert.equal(f.root.style.top, '0px');
    menu.destroy(); f.assertClean();
  }
});

test('context triggers respect event cancellation, disabled state and native unrelated inputs', t => {
  for (const disabled of [false, true]) {
    const f = fixture(t), proposed = [], menu = f.connect({ disabled, onOpenChange: value => proposed.push(value) });
    const cancelled = new f.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 120, clientY: 140 });
    cancelled.preventDefault(); f.trigger.dispatchEvent(cancelled);
    f.trigger.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    for (const [name, init] of [['ArrowDown', {}], ['ArrowUp', {}], ['Enter', {}], ['F10', {}], ['F10', { shiftKey: true, ctrlKey: true }], ['ContextMenu', { altKey: true }]]) {
      assert.equal(f.key(f.trigger, name, init).defaultPrevented, false);
    }
    assert.equal(f.key(f.trigger, 'ContextMenu', { repeat: true }).defaultPrevented, !disabled);
    if (disabled) {
      assert.equal(f.context(120, 140).defaultPrevented, false);
      assert.equal(f.key(f.trigger, 'F10', { shiftKey: true }).defaultPrevented, false);
    }
    assert.deepEqual(proposed, []); assert.equal(menu.getSnapshot().state.open, false);
    assert.equal(f.frames.size, 0);
    menu.destroy(); f.assertClean();
  }
});

test('context feature borrows primary target attributes without changing its action or native disabled state', t => {
  for (const disabled of [false, true]) {
    const f = fixture(t), nativeDisabled = !disabled; let clicks = 0;
    f.trigger.id = 'primary-action'; f.trigger.type = 'submit'; f.trigger.disabled = nativeDisabled;
    f.trigger.setAttribute('aria-label', 'Primary action'); f.trigger.setAttribute('aria-haspopup', 'dialog');
    f.trigger.setAttribute('aria-expanded', 'false'); f.trigger.setAttribute('aria-controls', 'primary-dialog');
    const primary = () => { clicks++; }; f.trigger.addEventListener('click', primary);
    const attributes = () => f.trigger.getAttributeNames().map(name => [name, f.trigger.getAttribute(name)]);
    const before = attributes(), menu = f.connect({ disabled });
    assert.deepEqual(attributes(), before);
    f.context(120, 140); f.flush(); assert.deepEqual(attributes(), before);
    f.trigger.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true })); assert.equal(clicks, nativeDisabled ? 0 : 1);
    menu.handleEvent('close-popup'); assert.deepEqual(attributes(), before);
    menu.suspend(); menu.resume(); assert.deepEqual(attributes(), before);
    menu.destroy(); assert.deepEqual(attributes(), before); f.trigger.removeEventListener('click', primary); f.assertClean();
  }
});

test('controlled refusal preserves closed focus and deferred acceptance uses the admitted point', t => {
  const f = fixture(t), proposed = [], menu = f.connect({ open: false, onOpenChange: open => proposed.push(open) });
  f.trigger.focus(); const before = menu.getSnapshot();
  f.context(120, 140); f.flush();
  assert.deepEqual(proposed, [true]); assert.equal(menu.getSnapshot().state.open, false);
  assert.equal(menu.getSnapshot().state.cursor.current, null);
  assert.ok(f.window.document.activeElement === f.trigger);
  assert.equal(menu.getSnapshot().state.cursor.current, before.state.cursor.current); assert.equal(f.frames.size, 0);
  assert.equal(menu.syncControlledValue(true).ok, true); f.flush();
  assert.equal(menu.getSnapshot().state.open, true); assert.equal(f.root.style.left, '120px');
  assert.ok(f.window.document.activeElement === f.first);
  menu.destroy(); f.assertClean();
});

test('context profile retains canonical disabled focus and submenu invocation semantics', t => {
  const f = fixture(t), invoked = [], menu = f.connect({ disabledItems: ['first'], onInvoke: id => invoked.push(id) });
  f.context(120, 140); f.flush();
  assert.ok(f.window.document.activeElement === f.first);
  assert.equal(f.first.getAttribute('aria-disabled'), 'true');
  f.key(f.first, 'Enter'); assert.deepEqual(invoked, []); assert.equal(menu.getSnapshot().state.open, true);
  f.key(f.first, 'ArrowDown'); f.flush(); assert.ok(f.window.document.activeElement === f.second);
  f.key(f.second, 'Enter'); assert.deepEqual(invoked, ['second']); assert.equal(menu.getSnapshot().state.open, false);
  menu.destroy(); f.assertClean();

  const nested = fixture(t), model = createMenuModel([{ id: 'first', parentID: null }, { id: 'second', parentID: 'first' }]);
  const branch = nested.connect({ model }), submenu = nested.window.document.createElement('div');
  submenu.append(nested.second); nested.root.append(submenu); nested.setRect(submenu, 0, 0, 40, 20);
  branch.setSubmenuAttributes(submenu, 'first');
  nested.context(120, 140); nested.flush();
  nested.key(nested.first, 'ArrowRight'); nested.flush();
  assert.deepEqual(branch.getSnapshot().state.openPath, ['first']); assert.ok(nested.window.document.activeElement === nested.second);
  const state = branch.getSnapshot(); nested.context(180, 190); nested.flush();
  const order = branch.getLayerOrder(); assert.notEqual(order, null);
  assert.equal(branch.getSnapshot().state.cursor.current, state.state.cursor.current);
  assert.deepEqual(branch.getSnapshot().state.openPath, state.state.openPath); assert.equal(nested.root.style.left, '180px');
  nested.key(nested.second, 'Escape'); nested.flush();
  assert.equal(branch.getSnapshot().state.open, true); assert.deepEqual(branch.getSnapshot().state.openPath, []);
  assert.equal(branch.getLayerOrder(), order, 'closing one submenu preserves the popup layer');
  assert.ok(nested.window.document.activeElement === nested.first);
  nested.key(nested.first, 'Escape'); assert.equal(branch.getSnapshot().state.open, false);
  assert.ok(nested.window.document.activeElement === nested.trigger);
  branch.destroy(); nested.assertClean();
});

test('context churn suspends, resumes and releases native listeners, observers and stale callbacks', t => {
  const f = fixture(t), changes = [], menu = f.connect({ onOpenChange: open => changes.push(open) });
  for (let index = 0; index < 24; index++) {
    f.context(120 + index, 140 + index);
    assert.ok(f.frames.size <= 1); f.flush();
    assert.equal(f.root.style.left, `${120 + index}px`);
    menu.suspend(); f.assertClean();
    assert.equal(f.context(250, 250).defaultPrevented, false);
    menu.resume(); f.flush();
    assert.equal(f.root.style.left, `${120 + index}px`);
  }
  f.context(170, 180); assert.ok(f.frames.size <= 1);
  menu.destroy(); f.assertClean();
  const accepted = changes.length;
  for (const observer of f.observers) observer.callback();
  assert.equal(f.context(250, 250).defaultPrevented, false);
  assert.equal(f.key(f.trigger, 'ContextMenu').defaultPrevented, false);
  f.flush(); assert.equal(changes.length, accepted); f.assertClean();
});

test('context construction rejects competing models before binding native resources', t => {
  const f = fixture(t), items = [{ id: 'first', parentID: null }], model = createMenuModel(items);
  const result = tryCreateContextMenu({ root: f.root, trigger: f.trigger, items, model });
  assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.menu-definition-ambiguous');
  assert.equal(f.root.getAttribute('role'), null); f.assertClean();
  const sameTarget = tryCreateContextMenu({ root: f.trigger, trigger: f.trigger, items });
  assert.equal(sameTarget.ok, false); assert.equal(sameTarget.error.code, 'dom.context-menu-trigger');
  assert.equal(f.trigger.hidden, false); f.assertClean();
  assert.throws(() => tryCreateContextMenu({ root: f.root, trigger: f.trigger, items,
    anchorRect: { x: NaN, y: 0, width: 0, height: 0 } }), /anchorRect/);
  assert.equal(f.root.getAttribute('role'), null); f.assertClean();
});

test('native context snapshots can seed reconnects and capture manual-position invocation without retaining caller mutation', t => {
  const f = fixture(t), seed = { x: 70, y: 80, width: 20, height: 30 };
  const menu = f.connect({ anchorRect: seed, position: false }); seed.x = 999;
  const admitted = menu.getAnchorRect();
  assert.equal(admitted.x, 70); assert.equal(admitted.height, 30); assert.ok(Object.isFrozen(admitted));
  assert.ok(menu.getAnchorRect() === admitted, 'reading an owned snapshot does not allocate');
  f.context(120, 140); assert.equal(f.frames.size, 0);
  const point = menu.getAnchorRect();
  assert.deepEqual(point, { x: 120, y: 140, width: 0, height: 0 });
  f.key(f.trigger, 'ContextMenu'); assert.equal(menu.getAnchorRect(), undefined);
  menu.destroy(); f.assertClean();
  const next = fixture(t), restored = next.connect({ anchorRect: point, defaultOpen: true }); next.flush();
  assert.equal(next.root.style.left, '120px'); assert.equal(next.root.style.top, '140px');
  restored.destroy(); next.assertClean();
});

function fixture(t) {
  const window = new Window({ url: 'https://sectile.dev/' }), doc = window.document;
  const root = doc.createElement('div'), trigger = doc.createElement('button'), boundary = doc.createElement('div');
  const first = doc.createElement('button'), second = doc.createElement('button'); root.append(first, second); doc.body.append(boundary, trigger, root);
  const setRect = (element, x, y, width, height) => { element.getBoundingClientRect = () => ({ x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() { return this; } }); };
  setRect(trigger, 50, 40, 100, 30); setRect(root, 0, 0, 40, 20); setRect(first, 120, 140, 40, 20); setRect(second, 120, 160, 40, 20); setRect(boundary, 0, 0, 800, 600);
  let sequence = 0, menu; const frames = new Map(), observers = [], listeners = [];
  window.requestAnimationFrame = callback => { const id = ++sequence; frames.set(id, callback); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = window.IntersectionObserver = class {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
  };
  for (const target of [window, doc, root, trigger]) {
    const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target), owned = new Map(); listeners.push(owned);
    const token = (type, options) => `${type}:${typeof options === 'boolean' ? options : options?.capture === true}`;
    target.addEventListener = (type, listener, options) => { const key = token(type, options); if (!owned.has(key)) owned.set(key, new Set()); owned.get(key).add(listener); add(type, listener, options); };
    target.removeEventListener = (type, listener, options) => { owned.get(token(type, options))?.delete(listener); remove(type, listener, options); };
  }
  const flush = () => { const queued = [...frames.values()]; frames.clear(); for (const callback of queued) callback(0); };
  const connect = (overrides = {}) => {
    const options = { root, trigger, items: [{ id: 'first', parentID: null }, { id: 'second', parentID: null }], collisionBoundary: boundary, collisionPadding: 0, ...overrides };
    if (overrides.model !== undefined) delete options.items;
    menu = createContextMenu(options); menu.setItemAttributes(first, 'first'); menu.setItemAttributes(second, 'second'); return menu;
  };
  const context = (clientX, clientY, init = {}) => { const event = new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY, button: 2, ...init }); trigger.dispatchEvent(event); return event; };
  const key = (target, key, init = {}) => { const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }); target.dispatchEvent(event); return event; };
  const assertClean = () => {
    assert.equal(frames.size, 0);
    assert.ok(observers.every(observer => observer.targets.size === 0));
    let count = 0;
    for (const byType of listeners) for (const entries of byType.values()) count += entries.size;
    assert.equal(count, 0);
  };
  t.after(() => { try { menu?.destroy(); } finally { window.close(); } });
  return { window, root, trigger, first, second, frames, observers, context, key, connect, setRect, flush, assertClean };
}
