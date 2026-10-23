import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlertDialog } from '../.verification-dist/alert-dialog.js';
import { createDialog } from '../.verification-dist/dialog.js';
import { createDrawer } from '../.verification-dist/drawer.js';
import { createPopover } from '../.verification-dist/popover.js';
import { createSelect } from '../.verification-dist/select.js';
import { createTooltip } from '../.verification-dist/tooltip.js';
import { connectLayerHost, reserveLayerPresentation } from '../.verification-dist/layer-host.js';
import { getDOMLayerManager } from '../.verification-dist/overlay/layer/manager.js';
import { createDOMLayerBinding } from '../.verification-dist/overlay/layer/binding.js';
import { applyLayerPresentationEvent, createLayerPresentationState } from '@sectile/core/layer-stack';

test('Select delivers only the latest focus intent when its option mounts and cancels retired requests', () => {
  const document = new Fake(), root = new Fake(document), trigger = new Fake(document), popup = new Fake(document);
  const a = new Fake(document), b = new Fake(document);
  let mounted = [a], scans = 0;
  popup.querySelectorAll = () => { scans++; return mounted; };
  const queued = [], original = globalThis.queueMicrotask;
  globalThis.queueMicrotask = callback => queued.push(callback);
  const drain = () => { for (const callback of queued.splice(0)) callback(); };
  const select = createSelect({ root, trigger, popup, items: ['a', 'b'], defaultValue: 'a', defaultOpen: true, position: false });
  try {
    select.setItemAttributes(a, 'a');
    select.handleEvent('next'); drain();
    assert.equal(select.getSnapshot().state.choice.cursor.current, 'b');
    assert.deepEqual(select.getSnapshot().state.choice.selection.selected, ['a']);
    assert.equal(b.focused, false);
    mounted = [b]; select.setItemAttributes(b, 'b'); drain(); assert.equal(b.focused, true);
    a.focused = false; b.focused = false; mounted = [a, b]; scans = 0;
    select.handleEvent('first'); select.handleEvent('next');
    assert.equal(queued.length, 1); drain(); assert.equal(scans, 1);
    assert.equal(a.focused, false); assert.equal(b.focused, true);
    mounted = []; select.handleEvent('first'); drain(); select.handleEvent('close');
    mounted = [a]; select.setItemAttributes(a, 'a'); drain(); assert.equal(a.focused, false);
    select.handleEvent('open'); drain(); a.focused = false;
    mounted = []; select.handleEvent('next'); drain();
    select.suspend(); select.resume(); mounted = [b]; b.focused = false;
    select.setItemAttributes(b, 'b'); drain(); assert.equal(b.focused, false);
    mounted = []; select.handleEvent('first'); drain();
    select.disconnect(); mounted = [a];
    select.setItemAttributes(a, 'a'); drain(); assert.equal(a.focused, false);
  } finally { select.destroy(); globalThis.queueMicrotask = original; }
});

test('Select refuses delayed native focus when its controlled cursor refuses the proposal', async () => {
  const document = new Fake(), root = new Fake(document), trigger = new Fake(document), popup = new Fake(document), b = new Fake(document);
  const select = createSelect({ root, trigger, popup, items: ['a', 'b'], defaultValue: 'a', highlightedValue: 'a', defaultOpen: true, position: false });
  popup.querySelectorAll = () => [b];
  try {
    select.setItemAttributes(b, 'b'); select.handleEvent('next'); await Promise.resolve();
    assert.equal(select.getSnapshot().state.choice.cursor.current, 'a'); assert.equal(b.focused, false);
    select.setItemAttributes(b, 'b'); await Promise.resolve(); assert.equal(b.focused, false);
  } finally { select.destroy(); }
});

test('native Select suspension releases typeahead and listeners and invalidates stale focus across resumption', () => {
  const document = new Fake(), parentRoot = new Fake(document), root = new Fake(document), trigger = new Fake(document), popup = new Fake(document);
  parentRoot.children.add(trigger);
  const a = new Fake(document), b = new Fake(document); popup.querySelectorAll = () => [a, b];
  const original = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, queueMicrotask: globalThis.queueMicrotask };
  const timers = new Set(), queued = [], requests = []; let failUpdate = false; const failure = new Error('Select subscriber failed');
  globalThis.setTimeout = (...args) => { const timer = original.setTimeout(...args); timers.add(timer); return timer; };
  globalThis.clearTimeout = timer => { timers.delete(timer); original.clearTimeout(timer); };
  globalThis.queueMicrotask = callback => { queued.push(callback); };
  const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false, autoFocus: false });
  const select = createSelect({ root, trigger, popup, items: ['a', 'b'], defaultValue: 'a', open: true, position: false,
    textValue: value => value, onOpenChange: value => requests.push(value), onUpdate() { if (failUpdate) throw failure; } });
  select.setItemAttributes(a, 'a'); select.setItemAttributes(b, 'b');
  const listeners = () => [document, root, trigger, popup].reduce((sum, element) => sum + [...element.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
  const type = () => trigger.emit('keydown', { target: trigger, key: 'b', preventDefault() {} });
  try {
    for (let turn = 0; turn < 3; turn++) {
      select.handleEvent({ type: 'focus', id: 'a' }); type(); assert.equal(timers.size, 1);
      const snapshot = select.getSnapshot(); const stale = queued.splice(0); assert.ok(stale.length > 0);
      parent.suspend(); assert.equal(select.getActive(), false); assert.equal(select.getSnapshot(), snapshot);
      assert.equal(timers.size, 0); assert.equal(listeners(), 0); assert.equal(popup.hidden, true);
      assert.equal(select.syncControlledValues({ open: true }).ok, true); select.refresh();
      assert.equal(timers.size, 0); assert.equal(listeners(), 0);
      parent.resume(); select.resume(); assert.equal(select.getActive(), true); assert.equal(select.getLayerOrder(), 1);
      a.focused = false; b.focused = false; for (const callback of stale) callback(); assert.equal(a.focused, false); assert.equal(b.focused, false);
      select.handleEvent({ type: 'focus', id: 'a' }); type(); for (const callback of queued.splice(0)) callback(); assert.equal(b.focused, true);
    }
    document.emit('keydown', { key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
    assert.deepEqual(requests, [false]); assert.equal(select.getSnapshot().state.open, true); assert.equal(select.getLayerOrder(), 1);
    assert.equal(trigger.focused, false, 'refused controlled dismissal does not restore native focus');
    parent.handleEvent('close'); assert.deepEqual(requests, [false, false]); assert.equal(select.getSnapshot().state.open, true);
    assert.equal(select.getActive(), false); assert.equal(popup.hidden, true); assert.equal(timers.size, 0);
    parent.handleEvent('open'); select.resume(); assert.equal(select.getLayerOrder(), 1);
    failUpdate = true; assert.throws(() => parent.suspend(), error => error === failure); failUpdate = false;
    assert.equal(select.getActive(), false); assert.equal(listeners(), 0); assert.equal(timers.size, 0);
    select.disconnect(); select.resume(); select.refresh(); assert.equal(select.getActive(), false); assert.equal(listeners(), 0);
  } finally {
    failUpdate = false;
    try { select.destroy(); parent.destroy(); }
    finally { for (const timer of timers) original.clearTimeout(timer); Object.assign(globalThis, original); }
  }
});

test('Select publishes canonical generations and terminal disposal does not request accepted model closure', () => {
  const document = new Fake(), root = new Fake(document), trigger = new Fake(document), popup = new Fake(document), requests = [];
  const select = createSelect({ root, trigger, popup, items: ['a'], defaultValue: 'a', defaultOpen: true, position: false,
    onOpenChange: value => requests.push(value) });
  let paint, notifications = 0;
  try {
    assert.equal(select.subscribeLayerPresentation(next => { paint = next; notifications++; }).ok, true);
    const first = paint.generation, snapshot = select.getSnapshot();
    assert.equal(paint.phase, 'active'); select.suspend(); assert.equal(paint.phase, 'closed');
    select.resume(); assert.equal(select.subscribeLayerPresentation(next => { paint = next; notifications++; }).ok, true);
    assert.ok(paint.generation > first); assert.equal(paint.phase, 'active');
    const beforeDispose = notifications; select.disconnect();
    assert.equal(notifications, beforeDispose, 'terminal disposal releases its own subscriber before publication');
    assert.equal(select.getSnapshot(), snapshot); assert.deepEqual(requests, []);
    assert.equal(select.subscribeLayerPresentation(() => {}).ok, false);
  } finally { select.destroy(); }
});

test('layer bindings retire capable branches and restore current models through their resource owner', () => {
  const document = new Fake(), parentRoot = new Fake(document), owner = new Fake(document), surface = new Fake(document);
  parentRoot.children.add(owner);
  const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false, autoFocus: false });
  let open = true, requests = 0, rejectResume = false; const listener = () => {}, failure = new Error('Owner projection failed');
  const binding = createDOMLayerBinding({ surface, owner, readOpen: () => open, close() { requests++; open = false; },
    presentation: {
      suspend() { surface.removeEventListener('click', listener); surface.hidden = true; },
      resume() { surface.addEventListener('click', listener); surface.hidden = !open; if (rejectResume) throw failure; },
    },
  });
  const ownListeners = () => surface.listeners.get('click')?.size ?? 0;
  const documentListeners = () => [...document.listeners.values()].reduce((count, set) => count + set.size, 0);
  surface.addEventListener('click', listener); binding.sync();
  try {
    for (let turn = 0; turn < 3; turn++) {
      parent.suspend(); assert.equal(binding.getActive(), false); assert.equal(open, true); assert.equal(requests, 0);
      assert.equal(documentListeners(), 0); assert.equal(ownListeners(), 0); assert.equal(surface.hidden, true);
      open = false; binding.sync(); open = true; binding.sync(); assert.equal(documentListeners(), 0); assert.equal(ownListeners(), 0);
      parent.resume(); rejectResume = true; assert.throws(() => binding.resume(), error => error === failure);
      assert.equal(binding.getActive(), false); assert.equal(ownListeners(), 0); assert.equal(surface.hidden, true);
      const witness = createPopover({ root: new Fake(document), defaultOpen: true, position: false, autoFocus: false });
      try { assert.equal(witness.getLayerOrder(), 1, 'failed resource resumption returns the admitted child slot'); } finally { witness.disconnect(); }
      rejectResume = false; binding.resume(); binding.resume(); assert.equal(binding.getActive(), true); assert.equal(ownListeners(), 1);
      assert.equal(surface.hidden, false); assert.equal(open, true); assert.equal(requests, 0);
    }
    parent.suspend(); binding.disconnect(); binding.resume(); binding.sync();
    assert.equal(binding.getActive(), false); assert.equal(documentListeners(), 0); assert.equal(ownListeners(), 0);
  } finally { binding.disconnect(); parent.disconnect(); }
  assert.equal(documentListeners(), 0); assert.equal(ownListeners(), 0);
});

test('popup native suspension preserves models and releases listeners until a fresh presentation is admitted', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document), trigger = new Fake(document);
    root.style.removeProperty = name => { delete root.style[name]; };
    root.style.setProperty = (name, value) => { root.style[name] = value; };
    const changes = [], popup = create({ root, trigger, defaultOpen: true, retainExit: true, position: false, autoFocus: false,
      onOpenChange: value => changes.push(value) });
    const listeners = () => [document, root, trigger].reduce((sum, element) => sum + [...element.listeners.values()].reduce((total, set) => total + set.size, 0), 0);
    let paint; popup.subscribeLayerPresentation(value => { paint = value; });
    const initial = popup.getSnapshot(), generation = paint.generation, connectedListeners = listeners();
    assert.ok(connectedListeners > 0);
    for (let turn = 0; turn < 3; turn++) {
      popup.suspend(); popup.suspend();
      assert.equal(popup.getSnapshot(), initial); assert.equal(popup.getLayerOrder(), null); assert.equal(root.hidden, true);
      assert.equal(listeners(), 0); assert.deepEqual(changes, []);
      popup.refresh(); popup.syncDismissal({ closeOnEscape: true, closeOnInteractOutside: true });
      assert.equal(listeners(), 0, 'inactive configuration cannot rebind native work');
      popup.resume(); popup.resume();
      assert.equal(popup.getSnapshot(), initial); assert.equal(popup.getLayerOrder(), 0); assert.equal(root.hidden, false);
      assert.ok(listeners() > 0);
      popup.subscribeLayerPresentation(value => { paint = value; });
      assert.ok(paint.generation > generation);
    }
    popup.suspend(); popup.disconnect(); popup.resume(); popup.refresh();
    assert.equal(popup.getLayerOrder(), null); assert.equal(listeners(), 0); assert.deepEqual(changes, []);
  }
});

test('suspended model synchronization does not require free presentation capacity', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document);
    root.style.removeProperty = name => { delete root.style[name]; };
    root.style.setProperty = (name, value) => { root.style[name] = value; };
    const host = connectLayerHost({ element: root, policy: { key: 'inactive-model', capacity: 1 } }).value;
    const popup = create({ root, open: false, layerHost: host, position: false, autoFocus: false });
    popup.suspend();
    const occupied = createDialog({ root: new Fake(document), defaultOpen: true, layerHost: host, autoFocus: false });
    try {
      assert.equal(popup.syncControlledValue(true).ok, true, 'a model-only update does not reserve native capacity');
      assert.equal(popup.getSnapshot().state.open, true); assert.equal(popup.getActive(), false);
      assert.equal(popup.getLayerOrder(), null); assert.equal(root.hidden, true);
      occupied.disconnect(); popup.resume(); assert.equal(popup.getLayerOrder(), 0); assert.equal(root.hidden, false);
    } finally { occupied.disconnect(); popup.disconnect(); host.disconnect(); }
  }
});

test('native branch suspension preserves controlled descendant state and rejects unsupported branches before publication', () => {
  const document = new Fake(), parentRoot = new Fake(document), childRoot = new Fake(document), trigger = new Fake(document);
  parentRoot.children.add(trigger);
  const requests = [], parent = createDialog({ root: parentRoot, defaultOpen: true, autoFocus: false });
  const child = createDialog({ root: childRoot, trigger, open: true, autoFocus: false, onOpenChange: value => requests.push(value) });
  const manager = getDOMLayerManager(parentRoot), foreign = new Fake(document);
  manager.register({ id: 'unsupported', surface: foreign, owner: childRoot, layer: { id: 'unsupported', parentID: null }, close() {} });
  manager.reparent('unsupported', childRoot);
  assert.throws(() => parent.suspend(), error => error.code === 'dom.layer-suspension-unavailable' || error.error?.code === 'dom.layer-suspension-unavailable');
  assert.equal(parent.getLayerOrder(), 0); assert.equal(child.getLayerOrder(), 1); assert.equal(parentRoot.hidden, false);
  manager.close('unsupported');
  parent.suspend();
  assert.equal(parent.getSnapshot().state.open, true); assert.equal(child.getSnapshot().state.open, true);
  assert.equal(parent.getLayerOrder(), null); assert.equal(child.getLayerOrder(), null);
  assert.equal(parentRoot.hidden, true); assert.equal(childRoot.hidden, true); assert.deepEqual(requests, []);
  parent.resume(); child.resume(); assert.equal(parent.getLayerOrder(), 0); assert.equal(child.getLayerOrder(), 1);
  parent.suspend(); parent.disconnect(); child.disconnect();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('suspension during initial native callbacks cannot bind a retired child after construction', () => {
  for (const create of [createDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), parentRoot = new Fake(document), childRoot = new Fake(document), trigger = new Fake(document);
    parentRoot.children.add(trigger);
    childRoot.style.removeProperty = name => { delete childRoot.style[name]; };
    childRoot.style.setProperty = (name, value) => { childRoot.style[name] = value; };
    const parent = createDialog({ root: parentRoot, defaultOpen: true, autoFocus: false });
    const setAttribute = childRoot.setAttribute.bind(childRoot); let suspended = false;
    childRoot.setAttribute = (name, value) => {
      setAttribute(name, value);
      if (!suspended && name === 'role') { suspended = true; parent.suspend(); }
    };
    const child = create({ root: childRoot, trigger, defaultOpen: true, position: false, autoFocus: false });
    assert.equal(child.getActive(), false); assert.equal(child.getSnapshot().state.open, true);
    assert.equal(child.getLayerOrder(), null); assert.equal(childRoot.hidden, true);
    assert.equal([...childRoot.listeners.values(), ...trigger.listeners.values(), ...document.listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
    parent.resume(); child.resume(); assert.equal(child.getActive(), true); assert.equal(child.getLayerOrder(), 1);
    parent.suspend(); parent.disconnect(); child.disconnect();
  }
});

test('resume admission failure keeps the model and native suspension intact until capacity is available', () => {
  const document = new Fake(), root = new Fake(document);
  let rejectProjection = false; const failure = new Error('Resume projection rejected');
  const host = connectLayerHost({ element: root, policy: { key: 'suspension-capacity', capacity: 1 } }).value;
  const popup = createDialog({ root, defaultOpen: true, layerHost: host, autoFocus: false, onUpdate() { if (rejectProjection) throw failure; } });
  popup.suspend();
  const occupied = createDialog({ root: new Fake(document), defaultOpen: true, layerHost: host, autoFocus: false });
  assert.throws(() => popup.resume(), error => error.code === 'item-ceiling-exceeded');
  assert.equal(popup.getActive(), false); assert.equal(popup.getSnapshot().state.open, true); assert.equal(root.hidden, true);
  occupied.disconnect(); rejectProjection = true;
  assert.throws(() => popup.resume(), error => error === failure);
  assert.equal(popup.getActive(), false); assert.equal(popup.getLayerOrder(), null); assert.equal(root.hidden, true);
  assert.equal([...document.listeners.values(), ...root.listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
  rejectProjection = false; popup.resume(); assert.equal(popup.getActive(), true); assert.equal(popup.getLayerOrder(), 0);
  popup.disconnect(); host.disconnect();
});

test('five popup families replace disabled interaction while preserving active and exiting paint', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document), trigger = new Fake(document); trigger.disabled = false;
    root.style.removeProperty = name => { delete root.style[name]; };
    const popup = create({ root, trigger, position: false, autoFocus: false, defaultOpen: true, retainExit: true });
    let paint; popup.subscribeLayerPresentation(value => { paint = value; });
    const active = paint, semantic = popup.getSnapshot();
    assert.equal(popup.syncDisabled(true).ok, true);
    assert.equal(paint, active); assert.equal(popup.getSnapshot(), semantic);
    assert.equal(root.attributes.get('aria-disabled'), 'true'); assert.equal(trigger.disabled, true);
    assert.equal(popup.handleEvent('close'), false);
    assert.equal(popup.syncDisabled('invalid').error.code, 'invalid-disabled-state');
    assert.equal(popup.handleEvent('close'), false); assert.equal(paint, active);
    assert.equal(popup.syncDisabled(false).ok, true); assert.equal(trigger.disabled, false);
    assert.equal(root.attributes.has('aria-disabled'), false); assert.equal(popup.handleEvent('close'), true);
    const exit = paint; assert.equal(exit.phase, 'exiting'); assert.equal(exit.generation, active.generation);
    popup.syncDisabled(true); assert.equal(paint, exit); assert.equal(popup.handleEvent('open'), false);
    popup.syncDisabled(false); assert.equal(paint, exit); assert.equal(popup.handleEvent('open'), true);
    popup.destroy();
  }
});

test('five popup families update active and future dismissal without replacing paint generations', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document); root.style.removeProperty = name => { delete root.style[name]; };
    const host = connectLayerHost({ element: root, policy: { key: 'dismissal', capacity: 1 } }).value;
    const popup = create({ root, position: false, autoFocus: false, defaultOpen: true, retainExit: true, closeOnInteractOutside: false, layerHost: host });
    let snapshot, reentrant;
    popup.subscribeLayerPresentation(value => {
      snapshot = value;
      if (value.phase === 'active') {
        try { popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false }); }
        catch (error) { reentrant = error.code; }
      }
    });
    assert.equal(reentrant, 'dom.layer-reentrant');
    const initial = snapshot, semantic = popup.getSnapshot();
    assert.equal(initial.hostOrder, 0);
    assert.equal(popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false }).ok, true);
    document.emit('keydown', { key: 'Escape', preventDefault() {} });
    assert.equal(snapshot, initial); assert.equal(popup.getSnapshot(), semantic);
    assert.equal(popup.syncDismissal({ closeOnEscape: 'invalid', closeOnInteractOutside: false }).ok, false);
    assert.equal(snapshot, initial);
    popup.handleEvent('close'); const exit = snapshot;
    assert.equal(popup.syncDismissal({ closeOnEscape: true, closeOnInteractOutside: true }).ok, true);
    assert.equal(snapshot, exit); assert.equal(snapshot.generation, initial.generation);
    assert.equal(document.listeners.get('pointerdown').size, 1);
    popup.completeLayerExit(initial.generation);
    assert.equal(popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false }).ok, true);
    const modalGuard = create === createDialog || create === createAlertDialog || create === createDrawer;
    assert.equal(document.listeners.get('pointerdown').size, modalGuard ? 1 : 0, 'connected modal guards remain ready for the next opening');
    popup.handleEvent('open'); popup.subscribeLayerPresentation(value => { snapshot = value; });
    assert.notEqual(snapshot.generation, initial.generation);
    document.emit('keydown', { key: 'Escape', preventDefault() {} }); assert.equal(snapshot.phase, 'active');
    popup.syncDismissal({ closeOnEscape: true, closeOnInteractOutside: true });
    document.emit('pointerdown', { target: new Fake(document) }); assert.equal(snapshot.phase, 'exiting');
    popup.destroy(); assert.equal(document.listeners.get('pointerdown').size, 0);
    assert.equal(document.listeners.get('keydown').size, 0);
    assert.equal(popup.syncDismissal({ closeOnEscape: true, closeOnInteractOutside: false }).error.code, 'connection-destroyed');
    host.disconnect();
  }
});

test('popup input origin follows native requests and explicit dispatch without leaking across callbacks', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document), trigger = new Fake(document), requests = [];
    root.style.removeProperty = name => { delete root.style[name]; };
    const failure = new Error('consumer callback'); let fail = false;
    const popup = create({ root, trigger, position: false, autoFocus: false, closeOnInteractOutside: true,
      onOpenChange: (open, inputMethod, reason) => { requests.push([open, inputMethod, reason]); if (fail) throw failure; } });
    try {
      popup.handleEvent('open', 'pointer');
      document.emit('keydown', { key: 'Escape', preventDefault() {} });
      popup.handleEvent('open');
      document.emit('pointerdown', { target: new Fake(document) });
      trigger.emit(create === createTooltip ? 'focus' : 'click', { detail: 0 });
      document.emit('keydown', { key: 'Escape', preventDefault() {} });
      assert.deepEqual(requests, [[true, 'pointer', undefined], [false, 'keyboard', 'escape'], [true, 'programmatic', undefined],
        [false, 'pointer', 'interact-outside'], [true, 'keyboard', undefined], [false, 'keyboard', 'escape']]);
      assert.equal(popup.handleEvent('open', 'touch'), false);
      assert.equal(popup.getSnapshot().state.open, false); assert.equal(requests.length, 6);
      assert.equal(popup.handleEvent('open', 'pointer', 'invalid'), false); assert.equal(requests.length, 6);
      fail = true; assert.throws(() => popup.handleEvent('open', 'pointer'), error => error === failure);
      fail = false; popup.handleEvent('close');
      assert.deepEqual(requests.at(-1), [false, 'programmatic', 'programmatic'], 'failed callback releases scoped input metadata');
      popup.handleEvent('open');
      fail = true; assert.throws(() => popup.handleEvent('close', 'keyboard', 'close-button'), error => error === failure);
      fail = false; popup.handleEvent('open'); popup.handleEvent('close');
      assert.deepEqual(requests.at(-1), [false, 'programmatic', 'programmatic'], 'failed close callback releases its cause');
    } finally { fail = false; popup.destroy(); }
    assert.equal(document.listeners.get('keydown').size, 0); assert.equal(document.listeners.get('pointerdown').size, 0);
  }
  const document = new Fake(), root = new Fake(document), requests = [];
  const popup = createPopover({ root, position: false, open: true, autoFocus: false,
    onOpenChange: (open, method, reason) => { requests.push([open, method, reason]); popup.handleEvent('open', 'pointer', 'swipe'); } });
  try {
    document.emit('keydown', { key: 'Escape', preventDefault() {} });
    assert.deepEqual(requests, [[false, 'keyboard', 'escape']]);
    assert.equal(popup.getSnapshot().state.open, true, 'request origin is not controlled acceptance');
    popup.handleEvent('close');
    assert.deepEqual(requests.at(-1), [false, 'programmatic', 'programmatic'], 'nested dispatch restores outer request metadata');
  } finally { popup.destroy(); }
});

test('Tooltip initial outside policy and observation agree with its live configuration', () => {
  const document = new Fake(), root = new Fake(document), observed = [];
  const popup = createTooltip({ root, position: false, defaultOpen: true, closeOnInteractOutside: true,
    onInteractOutside: event => observed.push(event) });
  document.emit('pointerdown', { target: new Fake(document) });
  assert.equal(observed.length, 1); assert.equal(popup.getSnapshot().state.open, false);
  popup.destroy(); assert.equal(document.listeners.get('pointerdown').size, 0);
});

test('dismissal updates preserve outside callbacks and controlled admission', () => {
  const document = new Fake(), root = new Fake(document), outside = [], requests = [];
  const popup = createPopover({ root, position: false, open: true, autoFocus: false,
    onInteractOutside: event => outside.push(event), onOpenChange: value => requests.push(value) });
  let snapshot; popup.subscribeLayerPresentation(value => { snapshot = value; }); const initial = snapshot;
  popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false });
  document.emit('pointerdown', { target: new Fake(document) }); assert.equal(outside.length, 1); assert.deepEqual(requests, []);
  popup.syncDismissal({ closeOnEscape: true, closeOnInteractOutside: true });
  document.emit('pointerdown', { target: new Fake(document) }); assert.deepEqual(requests, [false]); assert.equal(snapshot, initial);
  popup.destroy(); assert.equal(document.listeners.get('pointerdown').size, 0);
});

test('guard-only modal pointer subscriptions track behavior, suspension and reentrant disposal', () => {
  const document = new Fake(), root = new Fake(document);
  const popup = createDialog({ root, open: true, modal: false, trapFocus: false, autoFocus: false, closeOnInteractOutside: false });
  const listeners = () => document.listeners.get('pointerdown')?.size ?? 0;
  const behavior = (modal, trapFocus) => ({ modal, trapFocus, autoFocus: false, restoreFocus: true });
  try {
    assert.equal(listeners(), 0);
    for (let turn = 0; turn < 3; turn++) {
      popup.syncBehavior(behavior(true, true)); assert.equal(listeners(), 1);
      popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false }); assert.equal(listeners(), 1);
      popup.syncBehavior(behavior(true, false)); assert.equal(listeners(), 0);
      popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: true }); assert.equal(listeners(), 1);
      popup.syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false }); assert.equal(listeners(), 0);
      popup.syncBehavior(behavior(true, true)); const stale = [...document.listeners.get('pointerdown')][0];
      popup.suspend(); assert.equal(listeners(), 0);
      let prevented = 0; stale({ target: new Fake(document), button: 0, preventDefault() { prevented++; } }); assert.equal(prevented, 0);
      popup.syncBehavior(behavior(false, false)); assert.equal(listeners(), 0);
      popup.resume(); assert.equal(listeners(), 0);
    }
    const setAttribute = root.setAttribute.bind(root);
    root.setAttribute = (name, value) => { setAttribute(name, value); if (name === 'aria-modal') popup.disconnect(); };
    popup.syncBehavior(behavior(true, true)); assert.equal(listeners(), 0, 'configuration publishes subscription ownership before native callbacks');
  } finally { popup.destroy(); }
  assert.equal(listeners(), 0);
});

test('dom:modal-pointer:interactive-work derives one Core view per changed stack and releases subscriptions', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), outside = new Fake(document);
    const popups = Array.from({ length: size }, () => createDialog({ root: new Fake(document), open: true, autoFocus: false, closeOnInteractOutside: false }));
    const dispatch = () => {
      const slice = Array.prototype.slice; let copies = 0, prevented = 0;
      Array.prototype.slice = function(...args) { copies++; return slice.apply(this, args); };
      try { document.emit('pointerdown', { target: outside, button: 0, preventDefault() { prevented++; } }); }
      finally { Array.prototype.slice = slice; }
      return { copies, prevented };
    };
    try {
      assert.equal(document.listeners.get('pointerdown').size, size);
      assert.deepEqual(dispatch(), { copies: 1, prevented: 1 });
      assert.deepEqual(dispatch(), { copies: 0, prevented: 1 }, 'stable input reuses Core view across all parent listeners');
      popups.at(-1).syncDismissal({ closeOnEscape: false, closeOnInteractOutside: false });
      assert.deepEqual(dispatch(), { copies: 1, prevented: 1 }, 'policy-only configuration invalidates the cached view');
      popups.at(-1).syncBehavior({ modal: false, trapFocus: false, autoFocus: false, restoreFocus: true });
      assert.deepEqual(dispatch(), { copies: 1, prevented: 1 }, 'modality changes select the next modal boundary');
      popups.at(-1).syncControlledValue(false);
      assert.deepEqual(dispatch(), { copies: 1, prevented: 1 }, 'structural closure invalidates the view');
    } finally { for (const popup of popups) popup.destroy(); }
    assert.equal(document.listeners.get('pointerdown').size, 0); assert.equal(document.listeners.get('keydown').size, 0);
  }
});

test('dom:layer-dismissal:configure-work avoids paint index publication and invalidates prepared ownership', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), manager = getDOMLayerManager(new Fake(document));
    const popups = Array.from({ length: size }, () => createPopover({ root: new Fake(document), position: false, autoFocus: false, defaultOpen: true, closeOnInteractOutside: false }));
    // The existing facade owns one lazy method binding, outside native policy work.
    const update = popups.at(-1).syncDismissal;
    const set = Map.prototype.set; let writes = 0, result;
    Map.prototype.set = function(...args) { writes++; return set.apply(this, args); };
    try { result = update({ closeOnEscape: false, closeOnInteractOutside: false }); }
    finally { Map.prototype.set = set; }
    assert.equal(result.ok, true); assert.equal(writes, 0);
    const prepared = manager.prepare({ id: 'pending', layer: { id: 'pending' }, surface: new Fake(document), owner: new Fake(document), close() {} });
    popups.at(-1).syncDismissal({ closeOnEscape: true, closeOnInteractOutside: false });
    assert.equal(prepared.value().error.code, 'stale-revision');
    for (const popup of popups) popup.destroy();
    assert.equal(document.listeners.get('keydown').size, 0);
  }
});

test('prepared document policy is read-only and commits once against its exact source', () => {
  const document = new Fake(), root = new Fake(document), manager = getDOMLayerManager(root);
  const host = connectLayerHost({ element: root, policy: { key: 'prepared-old', capacity: 1 } }).value;
  const stale = host.preparePolicy({ key: 'prepared-new', capacity: 2 }, [host]);
  manager.register({ id: 'headless', layer: { id: 'headless', parentID: null }, surface: root, owner: root, close() {} });
  assert.equal(stale.value().error.code, 'dom.layer-host-stale');
  const peer = connectLayerHost({ element: root, policy: { key: 'prepared-old', capacity: 1 } });
  assert.equal(peer.ok, true, 'preparation and stale commit did not publish the new policy'); peer.value.disconnect();
  const prepared = host.preparePolicy({ key: 'prepared-new', capacity: 2 }, [host]);
  assert.equal(prepared.value().ok, true); assert.equal(prepared.value().error.code, 'dom.layer-host-stale');
  const epoch = host.preparePolicy({ key: 'epoch-new', capacity: 3 }, [host]); host.disconnect();
  assert.equal(epoch.value().error.code, 'dom.layer-host-stale'); manager.close('headless');
});

test('leaving a paint host preserves canonical generations and releases only participation', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document);
    root.style.removeProperty = name => { delete root.style[name]; };
    const host = connectLayerHost({ element: root, policy: { key: 'leave', capacity: 2 } }).value;
    const first = create({ root, position: false, autoFocus: false, modal: false, defaultOpen: true, retainExit: true, layerHost: host });
    const peer = createPopover({ root: new Fake(document), position: false, autoFocus: false, defaultOpen: true, layerHost: host });
    let snapshot, other; first.subscribeLayerPresentation(value => { snapshot = value; }); peer.subscribeLayerPresentation(value => { other = value; });
    try {
      first.handleEvent('close'); const generation = snapshot.generation;
      assert.equal(other.hostOrder, 1);
      assert.equal(first.syncLayerHost(undefined).ok, true);
      assert.equal(snapshot.generation, generation); assert.equal(snapshot.phase, 'exiting');
      assert.equal(snapshot.hostOrder, undefined); assert.equal(other.hostOrder, 0);
      assert.equal(host.reconfigure({ key: 'leave', capacity: 1 }, [host]).ok, true);
      first.completeLayerExit(generation); first.handleEvent('open');
      assert.equal(first.getLayerOrder(), 1, 'future unmanaged opening does not consume the exhausted paint budget');
    } finally { first.destroy(); peer.destroy(); host.disconnect(); }
  }
});

test('popup host transfer preserves active and retained generations across all five families', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document), policy = { key: 'transfer', capacity: 1 };
    root.style.removeProperty = name => { delete root.style[name]; };
    const source = connectLayerHost({ element: root, policy }).value;
    const target = connectLayerHost({ element: root, policy }).value;
    const popup = create({ root, position: false, defaultOpen: true, retainExit: true, layerHost: source });
    const snapshots = []; popup.subscribeLayerPresentation(value => snapshots.push(value));
    const state = popup.getSnapshot(), initial = snapshots.at(-1);
    assert.equal(popup.syncLayerHost(target).ok, true);
    assert.equal(popup.getSnapshot(), state); assert.equal(snapshots.at(-1), initial);
    source.disconnect(); popup.handleEvent('close');
    const exit = snapshots.at(-1); assert.equal(exit.generation, initial.generation); assert.equal(exit.phase, 'exiting');
    const replacement = connectLayerHost({ element: root, policy }).value;
    assert.equal(popup.syncLayerHost(replacement).ok, true); target.disconnect();
    assert.equal(snapshots.at(-1), exit);
    assert.equal(replacement.reconfigure(policy, [replacement]).ok, true, 'no retired source reservation remains');
    popup.completeLayerExit(exit.generation);
    assert.equal(popup.handleEvent('open'), true, 'future opening uses the accepted target');
    const reopened = []; popup.subscribeLayerPresentation(value => reopened.push(value));
    assert.equal(reopened.at(-1).hostOrder, 0); assert.notEqual(reopened.at(-1).generation, initial.generation);
    popup.destroy(); replacement.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('host transfer rejects unavailable targets and capacity before any publication', () => {
  const document = new Fake(), root = new Fake(document), policy = { key: 'full', capacity: 1 };
  const host = connectLayerHost({ element: root, policy }).value;
  const occupied = createPopover({ root: new Fake(document), position: false, defaultOpen: true, layerHost: host });
  const popup = createPopover({ root, position: false, defaultOpen: true });
  const values = []; popup.subscribeLayerPresentation(value => values.push(value));
  const before = popup.getSnapshot();
  assert.equal(popup.syncLayerHost(host).error.code, 'dom.layer-host-capacity');
  const foreign = connectLayerHost({ element: new Fake(new Fake()), policy }).value;
  assert.equal(popup.syncLayerHost(foreign).error.code, 'dom.layer-host-unavailable'); foreign.disconnect();
  assert.equal(values.length, 1); assert.equal(popup.getSnapshot(), before); assert.equal(popup.getLayerOrder(), 1);
  occupied.destroy(); assert.equal(popup.syncLayerHost(host).ok, true);
  host.disconnect(); assert.equal(popup.syncLayerHost(host).error.code, 'dom.layer-host-unavailable');
  popup.destroy();
  const next = connectLayerHost({ element: root, policy: { key: 'closed', capacity: 0 } }).value;
  const closed = createPopover({ root, position: false });
  assert.equal(closed.syncLayerHost(next).ok, true, 'closed owners configure future admission without reserving');
  assert.equal(closed.handleEvent('open'), false); closed.destroy(); next.disconnect();
});

test('first host participation publishes filtered ranks and keeps accepted ownership after observer failure', () => {
  const document = new Fake(), root = new Fake(document), host = connectLayerHost({ element: root, policy: { key: 'mixed', capacity: 2 } }).value;
  const first = createPopover({ root, position: false, defaultOpen: true });
  const last = createPopover({ root: new Fake(document), position: false, defaultOpen: true, layerHost: host });
  const values = [], lastValues = []; let fail = true;
  const error = new Error('transfer observer');
  first.subscribeLayerPresentation(value => { values.push(value); if (fail && value.hostOrder !== undefined) throw error; });
  last.subscribeLayerPresentation(value => lastValues.push(value));
  const initial = values.at(-1);
  assert.throws(() => first.syncLayerHost(host), value => value === error); fail = false;
  assert.equal(values.at(-1).generation, initial.generation); assert.equal(values.at(-1).hostOrder, 0);
  assert.ok(values.at(-1).revision > initial.revision); assert.equal(lastValues.at(-1).hostOrder, 1);
  const transferred = values.at(-1);
  first.handleEvent('close'); assert.equal(values.at(-1).phase, 'closed'); assert.ok(values.at(-1).revision > transferred.revision);
  assert.equal(first.handleEvent('open'), true);
  const reopened = []; first.subscribeLayerPresentation(value => reopened.push(value)); assert.equal(reopened.at(-1).hostOrder, 1);
  first.destroy(); last.destroy(); host.disconnect();
});

test('host transfer keeps canonical parent dismissal and retained subtree ownership', () => {
  const document = new Fake(), parentRoot = new Fake(document), trigger = new Fake(document);
  parentRoot.children.add(trigger);
  const parent = createPopover({ root: parentRoot, position: false, defaultOpen: true });
  const reasons = [];
  const child = createPopover({ root: new Fake(document), trigger, position: false, defaultOpen: true, retainExit: true,
    onOpenChange: (open, method, reason) => reasons.push(reason) });
  const host = connectLayerHost({ element: parentRoot, policy: { key: 'nested-transfer', capacity: 1 } }).value;
  const values = []; child.subscribeLayerPresentation(value => values.push(value));
  const generation = values.at(-1).generation;
  assert.equal(child.syncLayerHost(host).ok, true); assert.equal(child.getLayerOrder(), 1);
  parent.handleEvent('close');
  assert.equal(child.getSnapshot().state.open, false); assert.equal(values.at(-1).phase, 'exiting');
  assert.deepEqual(reasons, ['ancestor-closed']);
  assert.equal(values.at(-1).generation, generation); assert.equal(values.at(-1).hostOrder, 0);
  child.completeLayerExit(generation); child.destroy(); parent.destroy(); host.disconnect();
});

test('dom:layer-host:transfer-work reassigns hosted ownership without another projection or Core fold', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), root = new Fake(document), manager = getDOMLayerManager(root), policy = { key: 'transfer-work', capacity: size + 1 };
    const source = connectLayerHost({ element: root, policy }).value, target = connectLayerHost({ element: root, policy }).value;
    for (let index = 0; index < size; index++) manager.register({ id: String(index), layer: { id: String(index), parentID: null }, surface: root, owner: root, layerHost: source, close() {} });
    let deliveries = 0; manager.subscribePresentation('0', () => deliveries++);
    const prepared = manager.prepare({ id: 'draft', layer: { id: 'draft', parentID: null }, surface: root, owner: root, layerHost: source, close() {} });
    const set = Map.prototype.set; let writes = 0, accepted = 0;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    try { assert.equal(manager.transferHost('0', target, () => accepted++).ok, true); }
    finally { Map.prototype.set = set; }
    assert.equal(writes, 1); assert.equal(accepted, 1); assert.equal(deliveries, 1);
    assert.equal(prepared.value().error.code, 'stale-revision');
    manager.register({ id: 'headless', layer: { id: 'headless', parentID: null }, surface: root, owner: root, close() {} });
    const generation = manager.getGeneration('headless'); writes = 0;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    try { assert.equal(manager.transferHost('headless', target, () => {}).ok, true); }
    finally { Map.prototype.set = set; }
    assert.equal(writes, 3 * (size + 1) + 1, 'one reservation and three projection indexes, no Core transition');
    assert.equal(manager.getGeneration('headless'), generation); assert.equal(deliveries, 1);
    writes = 0; Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    try { assert.equal(manager.transferHost('headless', undefined, () => {}).ok, true); }
    finally { Map.prototype.set = set; }
    assert.equal(writes, 3 * (size + 1), 'leaving writes only the three canonical projection indexes');
    assert.equal(manager.getGeneration('headless'), generation); assert.equal(deliveries, 1);
    manager.close('headless');
    for (let index = size - 1; index >= 0; index--) manager.close(String(index)); source.disconnect(); target.disconnect();
  }
});

test('shared hosted capacity includes exits while paint rank filters headless generations', () => {
  const document = new Fake(), policy = { key: 'shared', capacity: 2 };
  const host = connectLayerHost({ element: new Fake(document), policy }).value;
  const other = connectLayerHost({ element: new Fake(document), policy }).value;
  const headless = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
  const first = createPopover({ root: new Fake(document), defaultOpen: true, position: false, layerHost: host, retainExit: true });
  const second = createPopover({ root: new Fake(document), defaultOpen: true, position: false, layerHost: other });
  const changes = []; first.subscribeLayerPresentation(value => changes.push(value));
  const ranks = []; second.subscribeLayerPresentation(value => ranks.push(value));
  assert.equal(changes.at(-1).hostOrder, 0); assert.equal(ranks.at(-1).hostOrder, 1);
  const waiting = createPopover({ root: new Fake(document), position: false, layerHost: host });
  const before = waiting.getSnapshot();
  assert.equal(waiting.handleEvent('open'), false); assert.equal(waiting.getSnapshot(), before);
  first.handleEvent('close'); assert.equal(changes.at(-1).phase, 'exiting');
  assert.equal(waiting.handleEvent('open'), false, 'exit still occupies its pair');
  assert.equal(first.handleEvent('open'), true, 'reopen atomically replaces its own reservation');
  const reopened = []; first.subscribeLayerPresentation(value => reopened.push(value));
  assert.equal(reopened.at(-1).hostOrder, 1); assert.equal(ranks.at(-1).hostOrder, 0);
  first.handleEvent('close'); first.completeLayerExit(reopened.at(-1).generation);
  assert.equal(waiting.handleEvent('open'), true);
  for (const popup of [headless, first, second, waiting]) popup.destroy();
  host.disconnect(); other.disconnect(); assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('all popup families reject actual zero-capacity hosts before initial or controlled acceptance', () => {
  const document = new Fake(), host = connectLayerHost({ element: new Fake(document), policy: { key: 'empty', capacity: 0 } }).value;
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const root = new Fake(document);
    root.style.removeProperty = name => { delete root.style[name]; };
    assert.throws(() => create({ root, defaultOpen: true, position: false, layerHost: host }), error => error.code === 'item-ceiling-exceeded');
    assert.equal(root.attributes.size, 0);
    const popup = create({ root, open: false, position: false, layerHost: host });
    const before = popup.getSnapshot();
    assert.equal(popup.syncControlledValue(true).error.code, 'item-ceiling-exceeded');
    assert.equal(popup.getSnapshot(), before); popup.destroy();
  }
  host.disconnect(); assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('pending admission shares hosted capacity with declarative openings, transfers and retained exits', () => {
  for (const create of [createDialog, createDrawer]) {
    const document = new Fake(), root = new Fake(document), policy = { key: 'pending', capacity: 1 };
    root.style.removeProperty = name => { delete root.style[name]; };
    const host = connectLayerHost({ element: root, policy }).value;
    const peer = connectLayerHost({ element: root, policy }).value;
    const reservation = reserveLayerPresentation({ element: root, layerHost: host }).value;
    assert.equal(reserveLayerPresentation({ element: root, layerHost: peer }).error.code, 'dom.layer-host-capacity');
    assert.equal(host.reconfigure({ ...policy, capacity: 0 }, [host, peer]).error.code, 'dom.layer-host-capacity');
    const declarative = createDialog({ root: new Fake(document), layerHost: peer, autoFocus: false });
    assert.equal(declarative.handleEvent('open'), false);
    const headless = createDialog({ root: new Fake(document), defaultOpen: true, modal: false, autoFocus: false });
    assert.equal(headless.syncLayerHost(peer).error.code, 'dom.layer-host-capacity');
    const popup = create({ root, layerHost: host, reservation, defaultOpen: true, retainExit: true, autoFocus: false });
    reservation.release(); reservation.release();
    let paint; popup.subscribeLayerPresentation(value => { paint = value; });
    assert.equal(paint.phase, 'active');
    popup.handleEvent('close'); assert.equal(paint.phase, 'exiting');
    assert.equal(reserveLayerPresentation({ element: root, layerHost: peer }).error.code, 'dom.layer-host-capacity');
    assert.equal(popup.handleEvent('open'), true, 'reopening consumes no stale reservation');
    popup.handleEvent('close'); popup.destroy();
    const next = reserveLayerPresentation({ element: root, layerHost: peer }); assert.equal(next.ok, true);
    next.value.release();
    declarative.destroy(); headless.destroy(); host.disconnect(); peer.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('reservation provenance rejects foreign, forged, revoked and mismatched tickets before effects', () => {
  const document = new Fake(), root = new Fake(document), policy = { key: 'provenance', capacity: 2 };
  const host = connectLayerHost({ element: root, policy }).value;
  const peer = connectLayerHost({ element: root, policy }).value;
  const reservation = reserveLayerPresentation({ element: root, layerHost: host }).value;
  for (const options of [
    { root: new Fake(new Fake()), layerHost: host, reservation },
    { root: new Fake(document), layerHost: peer, reservation },
    { root: new Fake(document), reservation },
    { root: new Fake(document), layerHost: host, reservation: Object.freeze({ release() { throw new Error('forged callback'); } }) },
  ]) {
    assert.throws(() => createDialog({ ...options, defaultOpen: true }), error => error.code === 'layer-presentation-state-invalid');
    assert.equal(options.root.attributes.size, 0);
  }
  const forged = createDialog({ root: new Fake(document), reservation: { release() { throw new Error('forged cleanup'); } }, autoFocus: false });
  forged.destroy();
  const foreignClosed = createDialog({ root: new Fake(new Fake()), reservation, autoFocus: false });
  foreignClosed.destroy();
  assert.equal(host.reconfigure({ ...policy, capacity: 0 }, [host, peer]).error.code, 'dom.layer-host-capacity', 'a foreign disposer does not release the issuing document slot');
  reservation.release();
  assert.throws(() => createDialog({ root, layerHost: host, reservation, defaultOpen: true }), error => error.code === 'layer-presentation-state-invalid');
  const pending = reserveLayerPresentation({ element: root, layerHost: peer }).value;
  peer.disconnect(); pending.release();
  assert.throws(() => createDrawer({ root, layerHost: peer, reservation: pending, defaultOpen: true }), error => error.code === 'layer-presentation-state-invalid');
  assert.equal(host.reconfigure({ ...policy, capacity: 0 }, [host]).ok, true);
  host.disconnect(); assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('pending tickets invalidate prepared admission and policy and release on closed-owner disconnect', () => {
  const document = new Fake(), root = new Fake(document), policy = { key: 'stale-pending', capacity: 2 };
  const host = connectLayerHost({ element: root, policy }).value, manager = getDOMLayerManager(root);
  const ticket = reserveLayerPresentation({ element: root, layerHost: host }).value;
  const registration = { id: 'reserved', layer: { id: 'reserved' }, surface: root, owner: root, close() {}, layerHost: host, reservation: ticket };
  const admission = manager.prepare(registration).value, reconfigure = host.preparePolicy(policy, [host]).value;
  ticket.release(); assert.equal(admission().error.code, 'stale-revision'); assert.equal(reconfigure().error.code, 'dom.layer-host-stale');
  assert.equal(manager.getOrder('reserved'), null);
  for (let cycle = 0; cycle < 64; cycle++) {
    const reservation = reserveLayerPresentation({ element: root, layerHost: host }).value;
    const popup = createDialog({ root, layerHost: host, reservation, autoFocus: false });
    popup.destroy(); reservation.release();
  }
  const pending = reserveLayerPresentation({ element: root, layerHost: host }).value;
  host.disconnect(); pending.release();
  const replacement = connectLayerHost({ element: root, policy: { key: 'released-pending', capacity: 0 } });
  assert.equal(replacement.ok, true); replacement.value.disconnect();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('pending admission preserves the independent Core ceiling and exchanges one ticket for one presentation', () => {
  const document = new Fake(), root = new Fake(document), tickets = [];
  const ceiling = createLayerPresentationState().maxItems;
  for (let index = 0; index < ceiling; index++) tickets.push(reserveLayerPresentation({ element: root }).value);
  assert.equal(reserveLayerPresentation({ element: root }).error.code, 'item-ceiling-exceeded');
  assert.throws(() => createDialog({ root, defaultOpen: true, autoFocus: false }), error => error.code === 'item-ceiling-exceeded');
  const popup = createDialog({ root, reservation: tickets.pop(), defaultOpen: true, autoFocus: false });
  assert.equal(popup.getLayerOrder(), 0);
  assert.equal(reserveLayerPresentation({ element: root }).error.code, 'item-ceiling-exceeded');
  popup.destroy();
  const replacement = reserveLayerPresentation({ element: root }); assert.equal(replacement.ok, true);
  replacement.value.release(); for (const ticket of tickets) ticket.release();
  const retry = createDialog({ root, defaultOpen: true, autoFocus: false }); retry.destroy();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('dom:layer-host:pending-work reserves and releases one slot independently of pending cardinality', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), root = new Fake(document), tickets = [];
    const host = connectLayerHost({ element: root, policy: { key: 'pending-work', capacity: size + 1 } }).value;
    for (let index = 0; index < size; index++) tickets.push(reserveLayerPresentation({ element: root, layerHost: host }).value);
    let writes = 0, deletes = 0;
    const set = Map.prototype.set, remove = Map.prototype.delete;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    Map.prototype.delete = function (...args) { deletes++; return Reflect.apply(remove, this, args); };
    try {
      const ticket = reserveLayerPresentation({ element: root, layerHost: host });
      assert.equal(ticket.ok, true); assert.equal(writes, 1);
      ticket.value.release(); assert.equal(deletes, 1);
    } finally { Map.prototype.set = set; Map.prototype.delete = remove; }
    for (const ticket of tickets) ticket.release(); host.disconnect();
    assert.equal(document.listeners.size, 0);
  }
});

test('document host reconfiguration requires full consent and invalidates prepared admissions', () => {
  const document = new Fake(), root = new Fake(document), policy = { key: 'old', capacity: 2 };
  assert.equal(connectLayerHost({ element: root, policy: { key: 'invalid', capacity: -1 } }).error.code, 'dom.layer-host-policy');
  const wide = connectLayerHost({ element: root, policy: { key: 'wide-admitted-band', capacity: Number.MAX_SAFE_INTEGER } });
  assert.equal(wide.ok, true, 'paint band capacity does not replace the independent Core cardinality ceiling');
  wide.value.disconnect();
  const host = connectLayerHost({ element: root, policy }).value;
  const other = connectLayerHost({ element: root, policy }).value;
  assert.equal(connectLayerHost({ element: root, policy: { key: 'conflict', capacity: 2 } }).error.code, 'dom.layer-host-conflict');
  const manager = getDOMLayerManager(root);
  const draft = manager.prepare({ id: 'draft', layer: { id: 'draft', parentID: null }, owner: root, surface: root, layerHost: host, close() {} });
  assert.equal(host.reconfigure({ key: 'new', capacity: 1 }, [host]).error.code, 'dom.layer-host-participants');
  assert.equal(host.reconfigure({ key: 'new', capacity: 1 }, [host, host]).error.code, 'dom.layer-host-participants');
  assert.equal(host.reconfigure({ key: 'new', capacity: 1 }, [host, other]).ok, true);
  assert.equal(draft.value().error.code, 'stale-revision'); assert.equal(manager.getOrder('draft'), null);
  const popup = createPopover({ root, defaultOpen: true, position: false, layerHost: host });
  assert.equal(other.reconfigure({ key: 'too-small', capacity: 0 }, [host, other]).error.code, 'dom.layer-host-capacity');
  const joined = connectLayerHost({ element: root, policy: { key: 'new', capacity: 1 } });
  assert.equal(joined.ok, true);
  popup.destroy(); host.disconnect(); other.disconnect(); joined.value.disconnect();
});

test('retired host capabilities release identity but preserve occupied policy until exit completion', () => {
  const document = new Fake(), root = new Fake(document);
  for (let cycle = 0; cycle < 16; cycle++) {
    const policy = { key: String(cycle), capacity: 1 };
    const host = connectLayerHost({ element: root, policy }).value;
    const popup = createPopover({ root: new Fake(document), defaultOpen: true, position: false, layerHost: host, retainExit: true });
    let snapshot; popup.subscribeLayerPresentation(value => { snapshot = value; });
    popup.handleEvent('close'); host.disconnect(); host.disconnect(); assert.equal(host.active, false);
    assert.equal(connectLayerHost({ element: root, policy: { key: 'foreign', capacity: 1 } }).error.code, 'dom.layer-host-conflict');
    const peer = connectLayerHost({ element: root, policy }).value;
    assert.equal(peer.reconfigure({ key: 'replacement', capacity: 1 }, [peer]).error.code, 'dom.layer-host-unavailable');
    assert.equal(host.reconfigure(policy, [peer]).error.code, 'dom.layer-host-unavailable');
    assert.throws(() => createPopover({ root: new Fake(document), defaultOpen: true, position: false, layerHost: host }), error => error.code === 'layer-presentation-state-invalid');
    assert.throws(() => createPopover({ root: new Fake(new Fake()), defaultOpen: true, position: false, layerHost: peer }), error => error.code === 'layer-presentation-state-invalid');
    popup.completeLayerExit(snapshot.generation); popup.destroy(); peer.disconnect();
  }
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('dom:layer-host:bounded-work adds one reservation to the canonical projection', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), root = new Fake(document), manager = getDOMLayerManager(root);
    const host = connectLayerHost({ element: root, policy: { key: 'bounded', capacity: size + 1 } }).value;
    const registration = id => ({ id, layer: { id, parentID: null }, surface: new Fake(document), owner: root, layerHost: host, close() {} });
    for (let index = 0; index < size; index++) manager.register(registration(String(index)));
    let writes = 0, calls = 0;
    manager.subscribePresentation('0', () => calls++);
    const set = Map.prototype.set;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    try {
      const prepared = manager.prepare(registration('new'));
      assert.equal(writes, size + 1); writes = 0;
      assert.equal(prepared.value().ok, true); assert.equal(writes, 3 * (size + 1) + 3);
    } finally { Map.prototype.set = set; }
    assert.equal(calls, 1, 'unchanged hosted subscriber remains silent');
    manager.close('new'); for (let index = size - 1; index >= 0; index--) manager.close(String(index));
    host.disconnect();
    const replacement = connectLayerHost({ element: root, policy: { key: 'released', capacity: 0 } });
    assert.equal(replacement.ok, true); replacement.value.disconnect();
  }
});

test('dom:layer-admission:prepared-work creates one canonical candidate and commits one projection', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), root = new Fake(document), manager = getDOMLayerManager(root);
    const registration = id => ({ id, layer: { id, parentID: null }, surface: new Fake(document), owner: root, close() {} });
    let deliveries = 0;
    for (let index = 0; index < size; index++) {
      const id = `base-${index}`; manager.register(registration(id)); manager.subscribePresentation(id, () => deliveries++);
    }
    const set = Map.prototype.set; let writes = 0;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    let prepared;
    try { prepared = manager.prepare(registration('candidate')); }
    finally { Map.prototype.set = set; }
    assert.equal(prepared.ok, true); assert.equal(writes, size + 1, 'only the Core sequence admission index is built');
    assert.equal(manager.getOrder('candidate'), null); assert.equal(deliveries, size);
    writes = 0; Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    try { assert.equal(prepared.value().ok, true); }
    finally { Map.prototype.set = set; }
    assert.equal(writes, 3 * (size + 1) + 2, 'three committed projection indexes and two registration entries; no repeated transition');
    assert.equal(manager.getOrder('candidate'), size); assert.equal(deliveries, size, 'unaffected subscribers remain silent');
    manager.close('candidate'); for (let index = size - 1; index >= 0; index--) manager.close(`base-${index}`);
    assert.equal(document.listeners.size, 0);
  }
});

test('canonical capacity rejection leaves popup initial, event and controlled-sync state uncommitted', () => {
  const document = new Fake(), manager = getDOMLayerManager(new Fake(document));
  const full = createLayerPresentationState([{ id: 'occupied' }], { maxItems: 1 });
  const rejected = applyLayerPresentationEvent(full, { type: 'open-layer', layer: { id: 'overflow' } });
  assert.equal(rejected.error.code, 'item-ceiling-exceeded');
  const prepare = manager.prepare;
  // Inject an actual Core capacity rejection at the host seam. Styled-host
  // capacity selection is separate; this witnesses controller rejection wiring.
  manager.prepare = () => rejected;
  const initialRoot = new Fake(document);
  try {
    assert.throws(() => createPopover({ root: initialRoot, defaultOpen: true, position: false }), error => error.code === 'item-ceiling-exceeded');
    assert.equal(initialRoot.attributes.size, 0); assert.equal(document.listeners.size, 0);
    for (const controlled of [false, true]) {
      let changes = 0;
      const root = new Fake(document), popup = createPopover({ root, position: false, ...(controlled ? { open: false } : {}), onOpenChange() { changes++; } });
      const previous = popup.getSnapshot();
      if (controlled) assert.equal(popup.syncControlledValue(true).error.code, 'item-ceiling-exceeded');
      else assert.equal(popup.handleEvent('open'), false);
      assert.equal(popup.getSnapshot(), previous); assert.equal(popup.getLayerOrder(), null); assert.equal(changes, 0); assert.equal(root.hidden, true);
      popup.destroy();
    }
  } finally { manager.prepare = prepare; }
  const retry = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
  assert.equal(retry.getLayerOrder(), 0); retry.destroy();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('prepared layer admission is read-only and rejects stale or consumed candidates before publication', () => {
  const document = new Fake(), root = new Fake(document), manager = getDOMLayerManager(root);
  const registration = id => ({ id, layer: { id, parentID: null }, surface: new Fake(document), owner: root, close() {} });
  const a = manager.prepare(registration('a')), b = manager.prepare(registration('b'));
  assert.equal(a.ok, true); assert.equal(b.ok, true);
  assert.equal(manager.getOrder('a'), null); assert.equal(manager.getOrder('b'), null);
  assert.equal(a.value().ok, true); assert.equal(manager.getOrder('a'), 0);
  assert.equal(b.value().error.code, 'stale-revision'); assert.equal(manager.getOrder('b'), null);
  assert.equal(a.value().error.code, 'stale-revision');
  const invalid = registration('invalid'); invalid.layer.parentID = 'invalid';
  assert.equal(manager.prepare(invalid).error.code, 'layer-self-parent'); assert.equal(manager.getOrder('a'), 0);
  const noChange = manager.prepare(registration('a')); manager.close('a');
  assert.equal(noChange.value().error.code, 'stale-revision'); assert.equal(manager.getOrder('a'), null);
  assert.equal(document.listeners.size, 0);
});

test('initial popup admission commits before a custom-element attribute callback opens another layer', () => {
  const document = new Fake(), root = new Fake(document);
  const sibling = createPopover({ root: new Fake(document), position: false });
  const setAttribute = root.setAttribute;
  root.setAttribute = function (name, value) {
    Reflect.apply(setAttribute, this, [name, value]);
    if (name === 'role') sibling.handleEvent('open');
  };
  const popup = createPopover({ root, defaultOpen: true, position: false });
  assert.equal(popup.getLayerOrder(), 0); assert.equal(sibling.getLayerOrder(), 1);
  popup.destroy(); sibling.destroy(); assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('initial native callbacks can close the owning ancestor without reviving its admitted child', () => {
  const document = new Fake(), parentRoot = new Fake(document), trigger = new Fake(document), root = new Fake(document);
  parentRoot.children.add(trigger);
  const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false });
  const setAttribute = root.setAttribute;
  root.setAttribute = function (name, value) {
    Reflect.apply(setAttribute, this, [name, value]);
    if (name === 'role') parent.handleEvent('close');
  };
  const popup = createPopover({ root, trigger, defaultOpen: true, position: false });
  assert.equal(popup.getSnapshot().state.open, false); assert.equal(popup.getLayerOrder(), null); assert.equal(root.hidden, true);
  popup.destroy(); parent.destroy(); assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('popup admission precedes actual controller acceptance and controlled requests do not reserve a generation', () => {
  for (const controlled of [false, true]) {
    const document = new Fake(), root = new Fake(document), manager = getDOMLayerManager(root);
    const prepare = manager.prepare; let admissions = 0, changes = 0;
    const popup = createPopover({ root, position: false, ...(controlled ? { open: false } : {}), onOpenChange() { changes++; } });
    manager.prepare = function (registration) {
      admissions++;
      assert.equal(popup.getSnapshot().state.open, false, 'canonical admission is prepared before controller state publication');
      return Reflect.apply(prepare, this, [registration]);
    };
    try {
      assert.equal(popup.handleEvent('open'), true); assert.equal(changes, 1);
      if (controlled) {
        assert.equal(admissions, 0); assert.equal(popup.getLayerOrder(), null);
        assert.equal(popup.syncControlledValue(true).ok, true);
      }
      assert.equal(admissions, 1, 'registration consumes its prepared transition instead of materializing it again');
      assert.equal(popup.getSnapshot().state.open, true); assert.equal(popup.getLayerOrder(), 0);
    } finally { manager.prepare = prepare; popup.destroy(); }
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('accepted popup state reaches the canonical manager before application open-change callbacks', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document), trigger = new Fake(document);
    root.style.setProperty = () => {}; root.style.removeProperty = () => '';
    root.children.add(trigger);
    const sibling = createPopover({ root: new Fake(document), position: false });
    const descendant = createPopover({ root: new Fake(document), trigger, position: false });
    const seen = [];
    const popup = create({ root, position: false, modal: false, onOpenChange(open) {
      seen.push(popup.getLayerOrder());
      if (open) sibling.handleEvent('open');
      else descendant.handleEvent('open');
    } });
    popup.handleEvent('open');
    assert.equal(seen[0], 0, 'accepted open is canonical before application publication');
    assert.equal(sibling.getLayerOrder(), 1, 'callback opening follows its already committed owner');
    popup.handleEvent('close');
    assert.equal(seen[1], null, 'accepted close removes ancestor eligibility before publication');
    assert.equal(descendant.getSnapshot().state.open, true, 'a callback opening is not captured by an already closed parent');
    popup.destroy(); sibling.destroy(); descendant.destroy();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('five popup families reparent live generations and route ancestor closure through the accepted parent', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), oldRoot = new Fake(document), trigger = new Fake(document), targetRoot = new Fake(document), root = new Fake(document);
    oldRoot.children.add(trigger); root.style.setProperty = () => {}; root.style.removeProperty = () => '';
    const previous = createPopover({ root: oldRoot, defaultOpen: true, position: false });
    const popup = create({ root, trigger, defaultOpen: true, position: false, modal: false });
    const target = createPopover({ root: targetRoot, defaultOpen: true, position: false });
    const snapshots = []; popup.subscribeLayerPresentation(value => snapshots.push(value));
    const generation = snapshots[0].generation;
    assert.equal(popup.getLayerOrder(), 1);
    assert.equal(popup.syncLayerParent(targetRoot).ok, true);
    assert.equal(popup.getLayerOrder(), 2); assert.equal(target.getLayerOrder(), 1);
    assert.equal(snapshots.at(-1).generation, generation); assert.equal(snapshots.at(-1).phase, 'active');
    const notifications = snapshots.length;
    assert.equal(popup.syncLayerParent(targetRoot).ok, true); assert.equal(snapshots.length, notifications);
    previous.handleEvent('close'); assert.equal(popup.getSnapshot().state.open, true);
    assert.equal(popup.syncLayerParent(null).ok, true);
    target.handleEvent('close'); assert.equal(popup.getSnapshot().state.open, true, 'explicit detach removes ancestor close ownership');
    target.handleEvent('open'); assert.equal(popup.syncLayerParent(targetRoot).ok, true);
    target.handleEvent('close'); assert.equal(popup.getSnapshot().state.open, false);
    assert.equal(snapshots.at(-1).phase, 'closed'); assert.equal(snapshots.at(-1).generation, generation);
    assert.equal(popup.syncLayerParent(null).error.code, 'layer-id-missing');
    popup.disconnect(); popup.disconnect(); target.disconnect(); previous.disconnect();
    popup.destroy(); assert.equal(popup.syncLayerParent(null).error.code, 'connection-destroyed');
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('reparent rejects inactive, foreign, ambiguous, self and cyclic parent surfaces before publication', () => {
  const document = new Fake(), otherDocument = new Fake(), parentRoot = new Fake(document), childRoot = new Fake(document), trigger = new Fake(document);
  parentRoot.children.add(trigger);
  const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false });
  const child = createPopover({ root: childRoot, trigger, defaultOpen: true, position: false });
  const foreignRoot = new Fake(otherDocument), foreign = createPopover({ root: foreignRoot, defaultOpen: true, position: false });
  const exitingRoot = new Fake(document), exiting = createPopover({ root: exitingRoot, defaultOpen: true, position: false, retainExit: true });
  exiting.handleEvent('close');
  const ambiguousRoot = new Fake(document);
  const duplicateA = createPopover({ root: ambiguousRoot, defaultOpen: true, position: false });
  const duplicateB = createPopover({ root: ambiguousRoot, defaultOpen: true, position: false });
  const snapshots = []; child.subscribeLayerPresentation(value => snapshots.push(value));
  try {
    assert.equal(parent.syncLayerParent(childRoot).error.code, 'layer-parent-cycle');
    assert.equal(child.syncLayerParent(childRoot).error.code, 'layer-self-parent');
    for (const surface of [new Fake(document), foreignRoot, exitingRoot]) assert.equal(child.syncLayerParent(surface).error.code, 'dom.layer-parent-inactive');
    assert.equal(child.syncLayerParent(ambiguousRoot).error.code, 'dom.layer-parent-ambiguous');
    assert.equal(child.getLayerOrder(), 1); assert.equal(snapshots.length, 1);
  } finally { duplicateB.disconnect(); duplicateA.disconnect(); exiting.disconnect(); foreign.disconnect(); child.disconnect(); parent.disconnect(); }
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0); assert.equal(otherDocument.listeners.get('keydown')?.size ?? 0, 0);
});

test('dom:layer-reparent:committed-work drains affected callbacks and rejects reentrant mutations with linear indexing', () => {
  for (const size of [32, 256]) {
    const document = new Fake(), roots = Array.from({ length: size }, () => new Fake(document));
    const popups = roots.map(root => createPopover({ root, defaultOpen: true, position: false }));
    const snapshots = [], failure = new Error('reparent observer failed'); let armed = false, deliveries = 0;
    popups.forEach((popup, index) => popup.subscribeLayerPresentation(value => {
      snapshots[index] = value;
      if (!armed) return;
      deliveries++;
      assert.equal(popup.getLayerOrder(), value.order);
      if (index === 0) {
        assert.throws(() => popup.syncLayerParent(null), error => error.code === 'dom.layer-reentrant');
        throw failure;
      }
    }));
    const generations = snapshots.map(value => value.generation), set = Map.prototype.set; let writes = 0;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    armed = true;
    try { assert.throws(() => popups[0].syncLayerParent(roots.at(-1)), error => error === failure); }
    finally { Map.prototype.set = set; armed = false; }
    assert.equal(deliveries, size);
    assert.ok(writes >= size * 4 && writes <= size * 5 + 1, 'four projection indexes plus at most n+1 first-call facade cache writes');
    assert.equal(popups[0].getLayerOrder(), size - 1);
    assert.deepEqual(snapshots.map(value => value.generation), generations);
    for (const popup of popups) { popup.disconnect(); popup.disconnect(); }
    const witness = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const clean = []; witness.subscribeLayerPresentation(value => clean.push(value)); assert.equal(clean[0].order, 0); witness.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('popup families retain exiting paint without semantic input and complete only its generation', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake(), root = new Fake(document);
    root.style.setProperty = () => {}; root.style.removeProperty = () => '';
    const popup = create({ root, defaultOpen: true, modal: false, position: false, retainExit: true });
    const snapshots = [];
    popup.subscribeLayerPresentation(value => snapshots.push(value));
    const generation = snapshots[0].generation;
    assert.equal(popup.completeLayerExit(generation).ok, true, 'active completion does not clear the exit intent');
    popup.handleEvent('close');
    assert.equal(popup.getLayerOrder(), null);
    assert.deepEqual(snapshots.map(value => [value.phase, value.order]), [['active', 0], ['exiting', 0]]);
    assert.equal(popup.subscribeLayerPresentation(() => {}).error.code, 'dom.layer-inactive');
    const next = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const nextSnapshots = [];
    next.subscribeLayerPresentation(value => nextSnapshots.push(value));
    assert.equal(next.getLayerOrder(), 0, 'semantic rank excludes exiting paint');
    assert.equal(nextSnapshots[0].order, 1, 'paint rank includes exiting paint');
    assert.equal(popup.completeLayerExit(generation).ok, true);
    assert.deepEqual(snapshots.map(value => value.phase), ['active', 'exiting', 'closed']);
    assert.deepEqual(nextSnapshots.map(value => value.order), [1, 0]);
    assert.equal(popup.completeLayerExit(generation).ok, true);
    assert.equal(nextSnapshots.length, 2, 'stale completion is an identity no-op');
    assert.equal(popup.completeLayerExit(NaN).error.code, 'layer-presentation-generation-invalid');
    popup.disconnect(); next.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('retained ancestor closure and same-surface reopen preserve generations with bounded cleanup', () => {
  const document = new Fake();
  for (let cycle = 0; cycle < 16; cycle++) {
    const parentRoot = new Fake(document), trigger = new Fake(document);
    parentRoot.children.add(trigger);
    const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false, retainExit: true });
    const child = createPopover({ root: new Fake(document), trigger, defaultOpen: true, position: false, retainExit: true });
    const snapshots = [], childSnapshots = [];
    parent.subscribeLayerPresentation(value => snapshots.push(value));
    child.subscribeLayerPresentation(value => childSnapshots.push(value));
    const old = snapshots[0].generation;
    parent.handleEvent('close');
    assert.equal(parent.getLayerOrder(), null); assert.equal(child.getLayerOrder(), null);
    assert.deepEqual([snapshots.at(-1).phase, childSnapshots.at(-1).phase], ['exiting', 'exiting']);
    assert.deepEqual([snapshots.at(-1).order, childSnapshots.at(-1).order], [0, 1]);
    parent.handleEvent('open');
    assert.equal(snapshots.at(-1).phase, 'closed', 'same surface atomically cancels old exit');
    const reopened = [];
    parent.subscribeLayerPresentation(value => reopened.push(value));
    assert.ok(reopened[0].generation > old);
    assert.equal(reopened[0].order, 1, 'new paint appends above the retained child');
    parent.completeLayerExit(old);
    assert.equal(parent.getLayerOrder(), 0);
    assert.equal(reopened.length, 1);
    parent.disconnect(); parent.disconnect(); child.disconnect(); child.disconnect();
    const witness = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const clean = [];
    witness.subscribeLayerPresentation(value => clean.push(value));
    assert.equal(clean[0].order, 0, 'disconnect released every owned retained slot');
    witness.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('controlled dismissal requests preserve the admitted generation until the owner accepts close', () => {
  for (const reason of ['escape', 'interact-outside']) {
    const document = new Fake(), root = new Fake(document), requests = [], snapshots = [];
    const popup = createPopover({ root, open: true, position: false, closeOnInteractOutside: true, onOpenChange: value => requests.push(value) });
    popup.subscribeLayerPresentation(value => snapshots.push(value));
    if (reason === 'escape') document.emit('keydown', { key: 'Escape', preventDefault() {} });
    else document.emit('pointerdown', { target: new Fake(document) });
    assert.deepEqual(requests, [false]);
    assert.equal(popup.getSnapshot().state.open, true);
    assert.equal(snapshots.length, 1, 'a rejected request does not close or replace the admitted presentation');
    assert.equal(popup.getLayerOrder(), 0);
    popup.syncControlledValue(false);
    assert.deepEqual(snapshots.map(value => value.phase), ['active', 'closed']);
    assert.equal(snapshots[1].generation, snapshots[0].generation);
    popup.syncControlledValue(true);
    const reopened = [];
    assert.equal(popup.subscribeLayerPresentation(value => reopened.push(value)).ok, true);
    assert.ok(reopened[0].generation > snapshots[0].generation);
    popup.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
    assert.equal(document.listeners.get('pointerdown')?.size ?? 0, 0);
  }
});

test('failed accepted popup close still commits its canonical removal and owned projection cleanup', () => {
  const document = new Fake(), root = new Fake(document), snapshots = [];
  const failure = new Error('accepted change publication failed');
  const popup = createPopover({ root, defaultOpen: true, position: false, onOpenChange: () => { throw failure; } });
  popup.subscribeLayerPresentation(value => snapshots.push(value));
  assert.throws(() => popup.handleEvent('close'), error => error === failure);
  assert.equal(popup.getSnapshot().state.open, false);
  assert.equal(popup.getLayerOrder(), null);
  assert.equal(root.hidden, true);
  assert.deepEqual(snapshots.map(value => value.phase), ['active', 'closed']);
  popup.disconnect();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('canonical publication failure drains the application callback and retains the first failure', () => {
  const document = new Fake(), root = new Fake(document);
  const failure = new Error('canonical observer failed'), later = new Error('application callback failed');
  let changes = 0;
  const popup = createPopover({ root, defaultOpen: true, position: false, onOpenChange(open) {
    changes++;
    assert.equal(open, false); assert.equal(popup.getLayerOrder(), null);
    throw later;
  } });
  popup.subscribeLayerPresentation(snapshot => { if (snapshot.phase === 'closed') throw failure; });
  assert.throws(() => popup.handleEvent('close'), error => error === failure);
  assert.equal(changes, 1); assert.equal(popup.getSnapshot().state.open, false); assert.equal(root.hidden, true);
  popup.destroy(); assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('popup families publish initial and affected canonical presentation generations and release closed subscriptions', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const document = new Fake();
    const lower = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const root = new Fake(document);
    root.style.setProperty = () => {}; root.style.removeProperty = () => '';
    const popup = create({ root, defaultOpen: true, modal: false, position: false });
    const snapshots = [];
    const subscription = popup.subscribeLayerPresentation(snapshot => {
      assert.equal(Object.isFrozen(snapshot), true);
      assert.equal(popup.getLayerOrder(), snapshot.phase === 'active' ? snapshot.order : null);
      snapshots.push(snapshot);
    });
    assert.equal(subscription.ok, true);
    assert.equal(snapshots[0].order, 1);
    assert.equal(popup.subscribeLayerPresentation(() => {}).error.code, 'dom.layer-subscribed');
    const upper = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    assert.equal(snapshots.length, 1, 'unaffected existing rank does not notify');
    lower.handleEvent('close');
    assert.deepEqual(snapshots.map(s => s.order), [1, 0]);
    popup.handleEvent('close');
    assert.deepEqual(snapshots.map(s => s.phase), ['active', 'active', 'closed']);
    assert.equal(popup.subscribeLayerPresentation(() => {}).error.code, 'dom.layer-inactive');
    popup.handleEvent('open');
    const fresh = [];
    const replacement = popup.subscribeLayerPresentation(snapshot => fresh.push(snapshot));
    assert.equal(replacement.ok, true);
    assert.ok(fresh[0].generation > snapshots[0].generation);
    subscription.value(); subscription.value();
    upper.handleEvent('close');
    assert.deepEqual(fresh.map(s => s.order), [1, 0]);
    assert.equal(snapshots.length, 3, 'old generation is not retained or reused');
    popup.disconnect(); popup.disconnect(); lower.disconnect(); upper.disconnect();
    replacement.value(); replacement.value();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('presentation notification rejects writes before controller mutation and drains failures through close cleanup', () => {
  const document = new Fake();
  const lower = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
  const first = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
  const second = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
  const secondRoot = new Fake(document);
  const last = createPopover({ root: secondRoot, defaultOpen: true, position: false });
  let initial = true, delivered = 0;
  const failure = new Error('subscriber failed');
  first.subscribeLayerPresentation(() => {
    const candidate = new Fake(document);
    assert.throws(() => createPopover({ root: candidate, defaultOpen: true, position: false }), error => error.code === 'dom.layer-reentrant');
    assert.equal(candidate.attributes.size, 0, 'rejected admission installs no popup projection or resources');
    assert.throws(() => second.handleEvent('close'), error => error.code === 'dom.layer-reentrant');
    assert.throws(() => second.disconnect(), error => error.code === 'dom.layer-reentrant');
    assert.throws(() => second.syncControlledValue(false), error => error.code === 'dom.layer-reentrant');
    assert.equal(second.getSnapshot().state.open, true);
    if (!initial) throw failure;
  });
  second.subscribeLayerPresentation(() => { delivered++; });
  const stale = last.subscribeLayerPresentation(() => { delivered++; });
  initial = false;
  assert.throws(() => lower.handleEvent('close'), error => error === failure);
  assert.equal(lower.getSnapshot().state.open, false);
  assert.equal(first.getLayerOrder(), 0);
  assert.equal(second.getLayerOrder(), 1);
  assert.equal(delivered, 4, 'later affected subscribers are drained');
  stale.value();
  initial = true;
  second.handleEvent('close');
  assert.equal(delivered, 5, 'explicitly disposed subscriber remains silent');
  for (const popup of [first, second, last, lower]) popup.disconnect();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('presentation subscriptions skip in-batch disposal and initial failure leaves admission recoverable during churn', () => {
  const document = new Fake();
  for (let cycle = 0; cycle < 16; cycle++) {
    const lower = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const first = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const second = createPopover({ root: new Fake(document), defaultOpen: true, position: false });
    const failure = new Error('initial callback failed');
    assert.throws(() => first.subscribeLayerPresentation(() => { throw failure; }), error => error === failure);
    let dispose, delivered = 0;
    const owned = first.subscribeLayerPresentation(() => { dispose?.(); });
    const stale = second.subscribeLayerPresentation(() => { delivered++; });
    dispose = stale.value;
    lower.handleEvent('close');
    assert.equal(delivered, 1, 'disposed before its turn');
    owned.value(); owned.value(); stale.value();
    for (const popup of [lower, first, second]) popup.disconnect();
    assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('dom:layer-presentation:committed-work projects once and delivers affected subscribers at scale', () => {
  for (const size of [32, 256]) {
    const surface = new Fake({}), manager = getDOMLayerManager(surface);
    let delivered = 0;
    for (let index = 0; index < size; index++) {
      const id = String(index);
      manager.register({ id, layer: { id, parentID: null }, surface, owner: surface, close() {} });
      assert.equal(manager.subscribePresentation(id, () => { delivered++; }).ok, true);
    }
    assert.equal(delivered, size);
    delivered = 0;
    const set = Map.prototype.set;
    let writes = 0;
    Map.prototype.set = function (...args) { writes++; return Reflect.apply(set, this, args); };
    try { assert.equal(manager.close('0'), true); }
    finally { Map.prototype.set = set; }
    assert.equal(delivered, size, 'one terminal plus exactly the shifted surviving generations');
    assert.ok(writes <= 5 * size, 'projection and canonical indexes have linear work, not one rebuild per subscriber');
    const get = Map.prototype.get;
    let queries = 0;
    Map.prototype.get = function (...args) { queries++; return Reflect.apply(get, this, args); };
    const orders = [];
    try { for (let index = 1; index < size; index++) orders.push(manager.getOrder(String(index))); }
    finally { Map.prototype.get = get; }
    assert.equal(queries, size - 1, 'one indexed lookup per rank query');
    assert.deepEqual(orders, Array.from({ length: size - 1 }, (_, index) => index));
    for (let index = size - 1; index >= 1; index--) manager.close(String(index));
    assert.equal(delivered, 2 * size - 1, 'each remaining subscriber receives only its terminal change');
  }
});

test('failed presentation notification still closes the canonical descendant and restores popup projection', () => {
  const document = new Fake();
  const parentRoot = new Fake(document), trigger = new Fake(document), childRoot = new Fake(document);
  parentRoot.children.add(trigger);
  const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false });
  const child = createPopover({ root: childRoot, trigger, defaultOpen: true, position: false });
  const failure = new Error('terminal paint subscriber failed');
  let closed = 0;
  parent.subscribeLayerPresentation(snapshot => { if (snapshot.phase === 'closed') throw failure; });
  child.subscribeLayerPresentation(snapshot => { if (snapshot.phase === 'closed') closed++; });
  assert.throws(() => parent.handleEvent('close'), error => error === failure);
  assert.equal(closed, 1);
  assert.equal(parent.getLayerOrder(), null); assert.equal(child.getLayerOrder(), null);
  assert.equal(parent.getSnapshot().state.open, false); assert.equal(child.getSnapshot().state.open, false);
  assert.equal(parentRoot.hidden, true); assert.equal(childRoot.hidden, true);
  parent.disconnect(); child.disconnect();
  assert.equal(document.listeners.get('keydown')?.size ?? 0, 0);
});

test('popup families independently configure Escape and retain explicit close', () => {
  for (const create of [createDialog, createAlertDialog, createDrawer, createPopover, createTooltip]) {
    const ownerDocument = new Fake();
    const root = new Fake(ownerDocument);
    root.style.setProperty = () => {};
    root.style.removeProperty = () => '';
    const connection = create({ root, defaultOpen: true, closeOnEscape: false, position: false });
    assert.equal(connection.getLayerOrder(), 0);
    let prevented = 0;
    const escape = { key: 'Escape', preventDefault() { prevented++; } };
    root.emit('keydown', escape);
    ownerDocument.emit('keydown', escape);
    assert.equal(connection.getSnapshot().state.open, true);
    assert.equal(prevented, 0);
    connection.handleEvent('close');
    assert.equal(connection.getSnapshot().state.open, false);
    assert.equal(connection.getLayerOrder(), null);
    connection.disconnect();
    assert.equal(ownerDocument.listeners.get('keydown')?.size ?? 0, 0);
  }
});

test('Escape blocking preserves top-layer ownership and independent outside dismissal', () => {
  const ownerDocument = new Fake();
  const lower = createDialog({ root: new Fake(ownerDocument), defaultOpen: true, modal: false });
  const upperRoot = new Fake(ownerDocument);
  const upper = createPopover({ root: upperRoot, defaultOpen: true, closeOnEscape: false, closeOnInteractOutside: true, position: false });
  ownerDocument.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(lower.getSnapshot().state.open, true);
  assert.equal(upper.getSnapshot().state.open, true);
  ownerDocument.emit('pointerdown', { target: new Fake(ownerDocument) });
  assert.equal(upper.getSnapshot().state.open, false);
  assert.equal(lower.getSnapshot().state.open, true);
  lower.disconnect(); upper.disconnect();
  assert.equal(ownerDocument.listeners.get('keydown')?.size ?? 0, 0);
  assert.equal(ownerDocument.listeners.get('pointerdown')?.size ?? 0, 0);
});

test('popup layer order follows canonical closure, reopening and connection cleanup', () => {
  const ownerDocument = {};
  const connections = Array.from({ length: 64 }, () => createPopover({
    root: new Fake(ownerDocument), defaultOpen: true, position: false,
  }));
  for (let index = 0; index < connections.length; index++) {
    assert.equal(connections[index].getLayerOrder(), index);
  }
  const removed = connections[23];
  removed.handleEvent('close');
  assert.equal(removed.getLayerOrder(), null);
  for (let index = 24; index < connections.length; index++) {
    assert.equal(connections[index].getLayerOrder(), index - 1);
  }
  removed.handleEvent('open');
  assert.equal(removed.getLayerOrder(), 63);
  for (const connection of connections) {
    connection.disconnect();
    assert.equal(connection.getLayerOrder(), null);
    connection.disconnect();
    assert.equal(connection.getLayerOrder(), null);
  }
});

test('nested layer order disappears when its ancestor closes and respects document isolation', () => {
  const firstDocument = {}; const secondDocument = {};
  const parentRoot = new Fake(firstDocument); const childTrigger = new Fake(firstDocument);
  parentRoot.children.add(childTrigger);
  const parent = createDialog({ root: parentRoot, defaultOpen: true });
  const child = createPopover({ root: new Fake(firstDocument), trigger: childTrigger, defaultOpen: true, position: false });
  const independent = createTooltip({ root: new Fake(secondDocument), defaultOpen: true, position: false });
  assert.equal(parent.getLayerOrder(), 0); assert.equal(child.getLayerOrder(), 1);
  assert.equal(independent.getLayerOrder(), 0);
  parent.handleEvent('close');
  assert.equal(parent.getLayerOrder(), null); assert.equal(child.getLayerOrder(), null);
  assert.equal(independent.getLayerOrder(), 0);
  parent.disconnect(); child.disconnect(); independent.disconnect();
});

test('popup initial and restored focus preserve the scroll position', () => {
  const root = new Fake();
  const trigger = new Fake();
  const calls = [];
  root.focus = (options) => calls.push(['content', options]);
  trigger.focus = (options) => calls.push(['trigger', options]);
  const popup = createPopover({ root, trigger, autoFocus: true, restoreFocus: true });
  popup.handleEvent('open');
  popup.handleEvent('close');
  assert.deepEqual(calls, [
    ['content', { preventScroll: true }],
    ['trigger', { preventScroll: true }],
  ]);
  popup.disconnect();
});

test('DOM popup facades preserve focus, announce, and visibility obligations', () => {
  const trigger = new Fake();
  const root = new Fake();
  let focus = 0;
  const dialog = createDialog({ trigger, root, onInitialFocus: () => focus++ });
  trigger.emit('click');
  assert.equal(dialog.getSnapshot().state.open, true);
  assert.equal(focus, 1);
  assert.equal(root.focused, true);
  assert.equal(root.attributes.get('role'), 'dialog');

  const popoverRoot = new Fake();
  const popoverTrigger = new Fake();
  const popover = createPopover({ root: popoverRoot, trigger: popoverTrigger });
  popoverTrigger.emit('click');
  assert.equal(popover.getSnapshot().state.open, true);
  assert.equal(popoverRoot.attributes.get('aria-modal'), 'false');
  popoverTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(popover.getSnapshot().state.open, false);

  let announced = 0;
  const alert = createAlertDialog({ root: new Fake(), onAnnounce: () => announced++ });
  alert.handleEvent('open');
  assert.equal(announced, 1);
  const tipRoot = new Fake();
  const tip = createTooltip({ root: tipRoot });
  tip.handleEvent('open');
  assert.equal(tipRoot.hidden, false);
});

test('DOM tooltip owns focus, hover, description linkage, and Escape', () => {
  const root = new Fake();
  const trigger = new Fake();
  const tip = createTooltip({ root, trigger, id: 'help-tip' });
  assert.equal(trigger.attributes.get('aria-describedby'), 'help-tip');
  trigger.emit('focus');
  assert.equal(tip.getSnapshot().state.open, true);
  trigger.emit('mouseenter');
  trigger.emit('blur');
  assert.equal(tip.getSnapshot().state.open, true);
  trigger.emit('mouseleave');
  assert.equal(tip.getSnapshot().state.open, false);
  trigger.emit('focus');
  trigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(tip.getSnapshot().state.open, false);
  tip.disconnect();
  for (const type of ['focus', 'blur', 'mouseenter', 'mouseleave']) {
    assert.equal(trigger.listeners.get(type)?.size ?? 0, 0);
  }
});

test('Tooltip supports content hover and event-driven transfer with one bounded native listener', () => {
  const document = new Fake(), root = new Fake(document), trigger = new Fake(document); let measurements = 0, paths = 0;
  root.getBoundingClientRect = () => { measurements++; return { x: 40, y: 40, width: 80, height: 40 }; };
  trigger.getBoundingClientRect = () => { measurements++; return { x: 40, y: 0, width: 40, height: 20 }; };
  const tip = createTooltip({ root, trigger, id: 'transfer-tip', position: false });
  try {
    trigger.emit('mouseenter', { currentTarget: trigger });
    trigger.emit('mouseleave', { currentTarget: trigger, relatedTarget: null, clientX: 60, clientY: 20 });
    assert.equal(tip.getSnapshot().state.open, true); assert.equal(document.listeners.get('mousemove').size, 1);
    assert.equal(measurements, 1);
    const stale = [...document.listeners.get('mousemove')][0];
    for (let y = 21; y < 40; y++) document.emit('mousemove', { target: document, clientX: 60, clientY: y, composedPath() { paths++; return [document]; } });
    assert.equal(measurements, 1); assert.equal(paths, 0); assert.equal(tip.getSnapshot().state.open, true);
    root.emit('mouseenter', { currentTarget: root });
    assert.equal(document.listeners.get('mousemove').size, 0);
    trigger.emit('blur'); assert.equal(tip.getSnapshot().state.open, true);
    root.emit('mouseleave', { currentTarget: root, relatedTarget: null, clientX: 100, clientY: 40 });
    document.emit('mousemove', { target: document, clientX: 200, clientY: 200 });
    assert.equal(tip.getSnapshot().state.open, false); assert.equal(document.listeners.get('mousemove').size, 0);
    stale({ target: document, x: 60, y: 30 }); assert.equal(tip.getSnapshot().state.open, false);
    trigger.emit('mouseenter', { currentTarget: trigger });
    trigger.emit('mouseleave', { currentTarget: trigger, relatedTarget: root });
    assert.equal(tip.getSnapshot().state.open, true); assert.equal(document.listeners.get('mousemove').size, 0);
  } finally { tip.disconnect(); }
  for (const element of [root, trigger]) for (const type of ['mouseenter', 'mouseleave']) assert.equal(element.listeners.get(type).size, 0);
});

test('Tooltip observes focus before binding and retires transfer on Escape, suspension and disconnect', () => {
  const document = new Fake(), root = new Fake(document), trigger = new Fake(document); document.activeElement = trigger;
  let failClose = false; const failure = Error('Tooltip close callback');
  root.getBoundingClientRect = () => ({ x: 40, y: 40, width: 80, height: 40 });
  const tip = createTooltip({ root, trigger, defaultOpen: true, position: false, onOpenChange: open => { if (!open && failClose) throw failure; } });
  trigger.emit('mouseleave'); assert.equal(tip.getSnapshot().state.open, true);
  document.activeElement = undefined; trigger.emit('blur'); assert.equal(tip.getSnapshot().state.open, false);
  const transfer = () => {
    trigger.emit('mouseenter', { currentTarget: trigger });
    trigger.emit('mouseleave', { currentTarget: trigger, relatedTarget: null, clientX: 60, clientY: 20 });
    assert.equal(document.listeners.get('mousemove').size, 1);
    return [...document.listeners.get('mousemove')][0];
  };
  let stale = transfer(); failClose = true;
  assert.throws(() => trigger.emit('keydown', { key: 'Escape', preventDefault() {} }), error => error === failure); failClose = false;
  assert.equal(document.listeners.get('mousemove').size, 0); stale({ target: document, x: 60, y: 30 });
  assert.equal(tip.getSnapshot().state.open, false);
  stale = transfer(); tip.suspend(); assert.equal(document.listeners.get('mousemove').size, 0);
  stale({ target: document, x: 200, y: 200 }); tip.resume(); assert.equal(tip.getSnapshot().state.open, true);
  trigger.emit('mouseleave', { currentTarget: trigger, relatedTarget: null, clientX: 60, clientY: 20 });
  stale = [...document.listeners.get('mousemove')][0]; tip.disconnect();
  assert.equal(document.listeners.get('mousemove').size, 0); stale({ target: document, x: 200, y: 200 });
});

test('Tooltip composes description IDs and disconnects only its own association', async () => {
  const { getTooltipTriggerAttributes, connectTooltipDescription } = await import('../.verification-dist/tooltip.js');
  assert.deepEqual(getTooltipTriggerAttributes({ id: 'tip', describedBy: ' help\tcaption\n' }), { 'aria-describedby': 'help caption tip' });
  assert.deepEqual(getTooltipTriggerAttributes({ id: 'tip', describedBy: 'help tip' }), { 'aria-describedby': 'help tip' });
  const trigger = new Fake(); trigger.setAttribute('aria-describedby', 'help');
  const tip = createTooltip({ root: new Fake(), trigger, id: 'tip', position: false });
  assert.equal(trigger.getAttribute('aria-describedby'), 'help tip');
  trigger.setAttribute('aria-describedby', 'help tip later'); tip.disconnect();
  assert.equal(trigger.getAttribute('aria-describedby'), 'help later');
  trigger.setAttribute('aria-describedby', 'tip help'); const release = connectTooltipDescription(trigger, 'tip'); release(); release();
  assert.equal(trigger.getAttribute('aria-describedby'), 'tip help');
});

test('DOM layer manager routes Escape only to the topmost popup', () => {
  const ownerDocument = {};
  const lowerRoot = new Fake(ownerDocument);
  const lowerTrigger = new Fake(ownerDocument);
  const upperRoot = new Fake(ownerDocument);
  const upperTrigger = new Fake(ownerDocument);
  const lower = createDialog({ root: lowerRoot, trigger: lowerTrigger });
  const upper = createDialog({ root: upperRoot, trigger: upperTrigger });
  lower.handleEvent('open');
  upper.handleEvent('open');
  lowerTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(lower.getSnapshot().state.open, true);
  assert.equal(upper.getSnapshot().state.open, true);
  upperTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(upper.getSnapshot().state.open, false);
  lowerTrigger.emit('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(lower.getSnapshot().state.open, false);
});

test('DOM layer manager closes nested descendants but preserves independent layers', () => {
  const ownerDocument = {};
  const outerRoot = new Fake(ownerDocument);
  const outerTrigger = new Fake(ownerDocument);
  const nestedRoot = new Fake(ownerDocument);
  const nestedTrigger = new Fake(ownerDocument);
  const independentRoot = new Fake(ownerDocument);
  const independentTrigger = new Fake(ownerDocument);
  outerRoot.children.add(nestedTrigger);
  const outer = createDialog({ root: outerRoot, trigger: outerTrigger });
  const nested = createPopover({ root: nestedRoot, trigger: nestedTrigger });
  const independent = createDialog({ root: independentRoot, trigger: independentTrigger });
  outer.handleEvent('open');
  nested.handleEvent('open');
  outer.handleEvent('close');
  assert.equal(outer.getSnapshot().state.open, false);
  assert.equal(nested.getSnapshot().state.open, false);
  outer.handleEvent('open');
  independent.handleEvent('open');
  outer.handleEvent('close');
  assert.equal(outer.getSnapshot().state.open, false);
  assert.equal(independent.getSnapshot().state.open, true);
});

test('Dialog owner closure closes concurrent sibling and nested Popovers while preserving an independent layer', () => {
  const ownerDocument = {};
  const dialogRoot = new Fake(ownerDocument);
  const dialogTrigger = new Fake(ownerDocument);
  const firstRoot = new Fake(ownerDocument);
  const firstTrigger = new Fake(ownerDocument);
  const secondRoot = new Fake(ownerDocument);
  const secondTrigger = new Fake(ownerDocument);
  const nestedRoot = new Fake(ownerDocument);
  const nestedTrigger = new Fake(ownerDocument);
  const independentRoot = new Fake(ownerDocument);
  const independentTrigger = new Fake(ownerDocument);
  dialogRoot.children.add(firstTrigger);
  dialogRoot.children.add(secondTrigger);
  secondRoot.children.add(nestedTrigger);

  const dialog = createDialog({ root: dialogRoot, trigger: dialogTrigger });
  const first = createPopover({ root: firstRoot, trigger: firstTrigger });
  const second = createPopover({ root: secondRoot, trigger: secondTrigger });
  const nested = createPopover({ root: nestedRoot, trigger: nestedTrigger });
  const independent = createDialog({ root: independentRoot, trigger: independentTrigger });

  dialog.handleEvent('open');
  first.handleEvent('open');
  second.handleEvent('open');
  nested.handleEvent('open');
  independent.handleEvent('open');
  assert.equal(firstTrigger.attributes.get('aria-expanded'), 'true');
  assert.equal(secondTrigger.attributes.get('aria-expanded'), 'true');
  assert.equal(nestedTrigger.attributes.get('aria-expanded'), 'true');

  dialog.handleEvent('close');
  for (const [connection, root, trigger] of [
    [first, firstRoot, firstTrigger], [second, secondRoot, secondTrigger], [nested, nestedRoot, nestedTrigger],
  ]) {
    assert.equal(connection.getSnapshot().state.open, false);
    assert.equal(root.hidden, true);
    assert.equal(trigger.attributes.get('aria-expanded'), 'false');
  }
  assert.equal(dialog.getSnapshot().state.open, false);
  assert.equal(independent.getSnapshot().state.open, true);
});

test('DOM layer manager infers the highest containing owner across sibling branches', () => {
  const ownerDocument = {};
  const manager = getDOMLayerManager(new Fake(ownerDocument));
  const rootSurface = new Fake(ownerDocument);
  const firstSurface = new Fake(ownerDocument);
  const secondSurface = new Fake(ownerDocument);
  const nestedSurface = new Fake(ownerDocument);
  const independentSurface = new Fake(ownerDocument);
  const firstOwner = new Fake(ownerDocument);
  const secondOwner = new Fake(ownerDocument);
  const nestedOwner = new Fake(ownerDocument);
  rootSurface.children.add(firstOwner);
  rootSurface.children.add(secondOwner);
  secondSurface.children.add(nestedOwner);
  const closed = [];

  assert.equal(manager.register({ id: 'root', layer: { id: 'root' }, surface: rootSurface, owner: rootSurface, close: () => closed.push('root') }), true);
  assert.equal(manager.register({ id: 'first', layer: { id: 'first' }, surface: firstSurface, owner: firstOwner, close: () => closed.push('first') }), true);
  assert.equal(manager.register({ id: 'second', layer: { id: 'second' }, surface: secondSurface, owner: secondOwner, close: () => closed.push('second') }), true);
  assert.equal(manager.register({ id: 'nested', layer: { id: 'nested' }, surface: nestedSurface, owner: nestedOwner, close: () => closed.push('nested') }), true);
  assert.equal(manager.register({ id: 'independent', layer: { id: 'independent' }, surface: independentSurface, owner: independentSurface, close: () => closed.push('independent') }), true);

  assert.equal(manager.close('root'), true);
  assert.deepEqual(closed, ['nested', 'second', 'first']);
  assert.equal(manager.isTop('independent'), true);
  assert.equal(manager.close('independent'), true);
  assert.deepEqual(closed, ['nested', 'second', 'first']);
});

test('DOM layer manager closes a nested select with its owning dialog', () => {
  const ownerDocument = {};
  const outerRoot = new Fake(ownerDocument);
  const outerTrigger = new Fake(ownerDocument);
  const selectRoot = new Fake(ownerDocument);
  const selectTrigger = new Fake(ownerDocument);
  const selectPopup = new Fake(ownerDocument);
  outerRoot.children.add(selectTrigger);
  const outer = createDialog({ root: outerRoot, trigger: outerTrigger });
  const select = createSelect({
    root: selectRoot,
    trigger: selectTrigger,
    popup: selectPopup,
    items: ['a'],
  });
  outer.handleEvent('open');
  select.handleEvent('open');
  outer.handleEvent('close');
  assert.equal(outer.getSnapshot().state.open, false);
  assert.equal(select.getSnapshot().state.open, false);
});

for (const [label, firstError] of [
  ['Error', new Error('deepest close failed')],
  ['undefined', undefined],
  ['null', null],
]) {
  test(`DOM layer cascade drains cleanup and preserves the first ${label} through ownership churn`, () => {
    const ownerDocument = {};
    const manager = getDOMLayerManager(new Fake(ownerDocument));
    for (let cycle = 0; cycle < 16; cycle += 1) {
      const closed = [];
      const reentrant = [];
      const topmost = [];
      for (const [id, parentID] of [
        ['root', null], ['child', 'root'], ['grandchild', 'child'], ['leaf', 'grandchild'],
      ]) {
        const surface = new Fake(ownerDocument);
        assert.equal(manager.register({
          id, layer: { id, parentID }, surface, owner: surface,
          close: () => {
            closed.push(id);
            topmost.push(manager.isTop('independent'));
            reentrant.push([id, manager.close(id), manager.close('root')]);
            if (id === 'leaf') throw firstError;
            if (id === 'grandchild') throw new Error('later close failed');
          },
        }), true);
      }
      const surface = new Fake(ownerDocument);
      assert.equal(manager.register({
        id: 'independent', layer: { id: 'independent' }, surface, owner: surface,
        close: () => closed.push('independent'),
      }), true);

      assert.throws(() => manager.close('root'), (error) => Object.is(error, firstError));
      assert.deepEqual(closed, ['leaf', 'grandchild', 'child']);
      assert.deepEqual(topmost, [true, true, true]);
      assert.deepEqual(reentrant, [
        ['leaf', true, false], ['grandchild', true, false], ['child', true, false],
      ]);
      for (const id of ['root', 'child', 'grandchild', 'leaf']) {
        assert.equal(manager.close(id), false);
      }
      assert.equal(manager.dismiss('independent', 'escape'), true);
      assert.deepEqual(closed, ['leaf', 'grandchild', 'child', 'independent']);
      assert.equal(manager.isTop('independent'), false);
    }
  });
}

for (const reason of ['escape', 'interact-outside']) {
  test(`DOM ${reason} dismissal unwinds its close guard and accepts a fresh registration`, () => {
    const surface = new Fake({});
    const manager = getDOMLayerManager(surface);
    const failure = new Error('dismiss close failed');
    const closed = [];
    let reentrant;
    assert.equal(manager.register({
      id: 'root', layer: { id: 'root' }, surface, owner: surface,
      close: () => closed.push('root'),
    }), true);
    assert.equal(manager.register({
      id: 'child', layer: { id: 'child', parentID: 'root' }, surface, owner: surface,
      close: () => {
        closed.push('child');
        reentrant = manager.close('child');
        throw failure;
      },
    }), true);

    assert.throws(() => manager.dismiss('child', reason), (error) => error === failure);
    assert.equal(reentrant, true);
    assert.equal(manager.close('child'), false);
    assert.equal(manager.isTop('root'), true);
    assert.equal(manager.register({
      id: 'child', layer: { id: 'child', parentID: 'root' }, surface, owner: surface,
      close: () => closed.push('replacement'),
    }), true);
    assert.equal(manager.dismiss('child', reason), true);
    assert.equal(manager.close('root'), true);
    assert.deepEqual(closed, ['child', 'replacement']);
    assert.equal(manager.isTop('root'), false);
  });
}

class Fake {
  attributes = new Map();
  listeners = new Map();
  children = new Set();
  hidden = false;
  focused = false;
  id = '';
  tabIndex = -1;
  style = {};
  dataset = {};
  disabled = false;

  constructor(ownerDocument) { this.ownerDocument = ownerDocument; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener({ ...event, type }); }
  contains(target) { return target === this || this.children.has(target); }
  querySelectorAll() { return []; }
  focus() { this.focused = true; }
}
