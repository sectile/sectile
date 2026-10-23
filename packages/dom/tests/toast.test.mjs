import test from 'node:test'; import assert from 'node:assert/strict'; import { createToast, tryCreateToast } from '../.verification-dist/toast.js';
import { scheduler } from './support/clock.mjs';
test('DOM toast projects live-region semantics and delegated dismissal', () => { const root = new FakeElement(); const toast = createToast({ root, autoDismiss: false }); toast.push({ id: 'saved', title: 'Saved', kind: 'success' }); const item = new FakeElement(); const close = new FakeElement(); toast.setToastAttributes(item, 'saved'); toast.setCloseButtonAttributes(close, 'saved'); assert.equal(root.attributes.get('aria-live'), 'polite'); assert.equal(item.attributes.get('role'), 'status'); close.dispatch('click'); assert.equal(toast.state.items.length, 0); toast.destroy(); });
test('Toast hands retiring item focus to its viewport before visibility and close eligibility change', () => {
  for (const manageVisibility of [true, false]) for (const shadow of [false, true]) {
    const root = new FakeElement(), item = new FakeElement(), close = new FakeElement(), outside = {};
    const document = { activeElement: null }; root.ownerDocument = item.ownerDocument = document;
    const scope = shadow ? { activeElement: null } : document;
    item.getRootNode = () => scope;
    item.contains = target => target === close;
    let hidden = false, disabled = false;
    Object.defineProperty(item, 'hidden', { configurable: true, get: () => hidden, set(value) {
      if (value) assert.equal(scope.activeElement === close, false, 'focus leaves before hiding');
      hidden = value;
    } });
    Object.defineProperty(close, 'disabled', { configurable: true, get: () => disabled, set(value) {
      if (value) assert.equal(scope.activeElement === close, false, 'focus leaves before disabling');
      disabled = value;
    } });
    let focused = 0;
    root.focus = options => { assert.deepEqual(options, { preventScroll: true }); focused++; scope.activeElement = root; };
    const toast = createToast({ root, manageVisibility, autoDismiss: false, initialToasts: [{ id: 'a', title: 'A' }] });
    try {
      toast.setToastAttributes(item, 'a'); toast.setCloseButtonAttributes(close, 'a');
      scope.activeElement = close;
      toast.dismiss('a');
      assert.equal(scope.activeElement === root, true); assert.equal(focused, 1); assert.equal(close.disabled, true);
      assert.equal(item.hidden, manageVisibility);
      scope.activeElement = outside; toast.syncItems([{ id: 'a', title: 'A' }]); toast.dismiss('a');
      assert.equal(scope.activeElement === outside, true); assert.equal(focused, 1);
    } finally { toast.disconnect(); }
  }
});
test('Toast refused removal retains focus until accepted and guards reentrant viewport focus callbacks', () => {
  const root = new FakeElement(), item = new FakeElement(), close = new FakeElement();
  const document = { activeElement: null }; root.ownerDocument = item.ownerDocument = document;
  item.contains = target => target === close;
  const proposals = [], a = { id: 'a', title: 'A' };
  let focused = 0;
  root.focus = () => { focused++; document.activeElement = root; };
  const toast = createToast({ root, autoDismiss: false, items: [a], onItemsChange: items => proposals.push(items) });
  try {
    toast.setToastAttributes(item, 'a'); toast.setCloseButtonAttributes(close, 'a'); document.activeElement = close;
    toast.dismiss('a'); assert.equal(focused, 0); assert.equal(document.activeElement, close); assert.equal(close.disabled, false);
    assert.deepEqual(proposals.at(-1), []);
    toast.syncItems([]); assert.equal(focused, 1); assert.equal(document.activeElement, root);
    toast.syncItems([a]); document.activeElement = close;
    root.focus = () => { document.activeElement = root; toast.syncItems([a]); };
    toast.syncItems([]); assert.equal(item.hidden, false); assert.equal(item.dataset.state, 'open'); assert.equal(close.disabled, false);
    document.activeElement = close;
    root.focus = () => { document.activeElement = root; toast.disconnect(); item.dataset.state = 'caller-after-dispose'; };
    toast.syncItems([]); assert.equal(item.dataset.state, 'caller-after-dispose');
  } finally { toast.disconnect(); }
});
test('Toast owns one pending countdown schedule and no empty, persistent-only, paused or expired schedule', t => {
  const clock = scheduler(t), root = new FakeElement(), toast = createToast({ root });
  try {
    assert.equal(clock.intervals.size, 0);
    toast.push({ id: 'persistent', title: 'Persistent', durationMs: null }); assert.equal(clock.intervals.size, 0);
    toast.push({ id: 'timed', title: 'Timed', durationMs: 10 }); assert.equal(clock.intervals.size, 1);
    const original = clock.callback(); clock.advance(3); original();
    assert.equal(toast.state.items[1].remainingMs, 7); assert.equal(clock.callback(), original);
    const items = toast.state.items, some = Array.prototype.some; let scans = 0;
    try {
      Array.prototype.some = function (...args) { if (this === items) scans++; return Reflect.apply(some, this, args); };
      root.dispatch('mouseenter'); assert.equal(clock.intervals.size, 0);
      clock.advance(100); original(); assert.equal(toast.state.items[1].remainingMs, 7);
      root.dispatch('mouseleave'); assert.equal(clock.intervals.size, 1);
    } finally { Array.prototype.some = some; }
    assert.equal(scans, 0, 'pause and resume reuse the current generation deadline fact');
    clock.advance(7); clock.callback()(); assert.equal(clock.intervals.size, 0);
    assert.deepEqual(toast.state.items.map(item => item.id), ['persistent']);
    original(); assert.equal(toast.state.items.length, 1);
  } finally { toast.disconnect(); }
});

test('controlled Toast retires expiry until an external replacement supplies another live duration', t => {
  const clock = scheduler(t), proposals = [], toast = createToast({ root: new FakeElement(),
    items: [{ id: 'a', title: 'A', durationMs: 10 }], onItemsChange: items => proposals.push(items) });
  try {
    const expired = clock.callback(); clock.advance(10); expired();
    assert.equal(toast.state.items[0].remainingMs, 0); assert.equal(clock.intervals.size, 0); assert.equal(proposals.length, 1);
    clock.advance(100); expired(); assert.equal(proposals.length, 1);
    toast.syncItems([{ id: 'a', title: 'A', durationMs: 20 }]); assert.equal(clock.intervals.size, 1);
    const trim = String.prototype.trim; let normalizations = 0;
    try {
      String.prototype.trim = function () { normalizations++; return Reflect.apply(trim, this, []); };
      toast.handleEvent('pause'); toast.handleEvent('resume');
    } finally { String.prototype.trim = trim; }
    assert.equal(normalizations, 0, 'controlled reconciliation preserves canonical countdown provenance');
    toast.syncItems([]); assert.equal(clock.intervals.size, 0);
  } finally { toast.disconnect(); }
});

test('Toast synchronizes resources before throwing or disposing application callbacks', t => {
  const clock = scheduler(t), failure = Error('notification failure');
  const throwing = createToast({ root: new FakeElement(), initialToasts: [{ id: 'a', title: 'A', durationMs: 10 }],
    onItemsChange: items => { if (items.length === 0) throw failure; } });
  clock.advance(10); assert.throws(() => clock.callback()(), error => error === failure);
  assert.equal(clock.intervals.size, 0); assert.equal(throwing.state.items.length, 0); throwing.disconnect();
  let toast, announces = 0, updates = 0;
  toast = createToast({ root: new FakeElement(), onItemsChange: () => toast.disconnect(),
    onAnnounce: () => announces++, onUpdate: () => updates++ });
  toast.push({ id: 'a', title: 'A' });
  assert.equal(clock.intervals.size, 0); assert.equal(announces, 0); assert.equal(updates, 0);
});

test('Toast disconnect removes native and close listeners and makes saved callbacks and registrations inert', t => {
  const clock = scheduler(t), root = new FakeElement(), document = new FakeElement(), view = new FakeElement();
  root.ownerDocument = document; document.defaultView = view;
  const close = new FakeElement(), calls = [];
  const toast = createToast({ root, initialToasts: [{ id: 'a', title: 'A', durationMs: 10 }], onDismiss: id => calls.push(id) });
  toast.setCloseButtonAttributes(close, 'a'); const oldClose = [...close.listeners.get('click')][0], stale = clock.callback();
  toast.setCloseButtonAttributes(new FakeElement(), 'a'); oldClose(); assert.equal(toast.state.items.length, 1);
  const keydown = [...document.listeners.get('keydown')][0]; toast.disconnect(); toast.disconnect();
  clock.advance(10); stale(); keydown({ key: 'F8', preventDefault() { throw Error('stale native input'); } });
  assert.equal(toast.state.items.length, 1); assert.deepEqual(calls, []); assert.equal(clock.intervals.size, 0);
  for (const node of [root, document, view, close]) for (const listeners of node.listeners.values()) assert.equal(listeners.size, 0);
  const revision = toast.getSnapshot().revision;
  assert.equal(toast.push({ id: 'b', title: 'B' }), false);
  assert.equal(toast.syncItems([]).value.revision, revision);
  toast.setCloseButtonAttributes(close, 'a'); assert.equal(close.listeners.get('click').size, 0);
});

test('Toast rejects native delay overflow and accepts the same fractional native delay contract as Timer', t => {
  const clock = scheduler(t);
  for (const tickIntervalMs of [0, -1, NaN, Infinity, 2147483648]) {
    const result = tryCreateToast({ root: new FakeElement(), tickIntervalMs });
    assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.toast-interval-invalid');
  }
  assert.equal(clock.intervals.size, 0);
  const toast = createToast({ root: new FakeElement(), tickIntervalMs: 1.5, initialToasts: [{ id: 'a', title: 'A' }] });
  assert.equal([...clock.intervals.values()][0].delay, 1.5); toast.disconnect();
});

test('Toast queue keeps countdown ownership while viewport and reactive configuration change', t => {
  const clock = scheduler(t), root = new FakeElement(), replacement = new FakeElement(), row = new FakeElement(), close = new FakeElement();
  const toast = createToast({ initialToasts: [{ id: 'a', title: 'A', durationMs: 10 }], maxVisible: 3 });
  try {
    assert.equal(clock.intervals.size, 0); toast.setViewport(root, 'First');
    toast.setToastAttributes(row, 'a'); toast.setCloseButtonAttributes(close, 'a');
    const first = clock.callback(); clock.advance(3); first(); assert.equal(toast.state.items[0].remainingMs, 7);
    assert.equal(toast.syncConfiguration({ closeLabel: 'Localized', hotkey: false }).ok, true);
    assert.equal(clock.callback(), first); assert.equal(close.getAttribute('aria-label'), 'Localized');
    const previous = toast.getSnapshot();
    assert.equal(toast.syncConfiguration({ maxVisible: 0, closeLabel: 'Rejected' }).ok, false);
    assert.equal(toast.getSnapshot(), previous); assert.equal(close.getAttribute('aria-label'), 'Localized');
    const enter = [...root.listeners.get('mouseenter')][0];
    toast.setViewport(undefined); assert.equal(clock.intervals.size, 0); assert.equal(toast.getToastElement('a'), undefined);
    for (const handlers of root.listeners.values()) assert.equal(handlers.size, 0);
    clock.advance(100); first(); assert.equal(toast.state.items[0].remainingMs, 7);
    toast.setViewport(replacement, 'Second'); assert.equal(clock.intervals.size, 1);
    enter({ currentTarget: root }); assert.equal(toast.state.paused, false);
    assert.equal(toast.state.items[0].remainingMs, 7);
    assert.equal(toast.syncConfiguration({ defaultDurationMs: 20 }).ok, true);
    toast.push({ id: 'b', title: 'B' }); assert.equal(toast.state.items[0].remainingMs, 7); assert.equal(toast.state.items[1].durationMs, 20);
    toast.setViewport(undefined); toast.push({ id: 'c', title: 'C' }); assert.equal(clock.intervals.size, 0);
    toast.setViewport(replacement); clock.advance(7); clock.callback()();
    assert.deepEqual(toast.state.items.map(item => item.id), ['b', 'c']);
  } finally { toast.destroy(); }
  toast.setViewport(root); assert.equal(clock.intervals.size, 0); assert.equal(toast.syncConfiguration({ autoDismiss: true }).ok, false);
});

test('Toast configuration input cannot revive or partially reconfigure a disposed queue', t => {
  const clock = scheduler(t), root = new FakeElement();
  const toast = createToast({ initialToasts: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] });
  const previous = toast.getSnapshot();
  toast.syncConfiguration({ get label() { toast.destroy(); return 'Retired'; }, maxVisible: 1 });
  assert.equal(toast.getSnapshot(), previous); toast.setViewport(root);
  assert.equal(clock.intervals.size, 0); assert.equal(root.listeners.size, 0);
});

test('retained Toast facades and saved input callbacks release a disconnected viewport', { skip: typeof global.gc !== 'function' }, async () => {
  let retained, stale, weak;
  await new Promise(resolve => setImmediate(() => {
    const root = new FakeElement(), doc = new FakeElement(); root.ownerDocument = doc;
    retained = createToast({ root, autoDismiss: false });
    stale = [...doc.listeners.get('keydown')][0]; weak = new WeakRef(root); retained.disconnect(); resolve();
  }));
  for (let turn = 0; turn < 20; turn++) { global.gc(); await new Promise(resolve => setImmediate(resolve)); }
  assert.equal(weak.deref(), undefined); assert.equal(retained.getSnapshot().state.items.length, 0);
  stale({ key: 'F8', preventDefault() { throw Error('stale'); } });
});

test('Toast projection resolves all registrations with at most one canonical item pass', t => {
  const measurements = [];
  for (const size of [1_000, 4_000, 16_000]) {
    const toast = createToast({ root: new FakeElement(), autoDismiss: false,
      initialToasts: Array.from({ length: size }, (_, id) => ({ id, title: 'Notification', kind: id % 2 ? 'error' : 'info', durationMs: null })) });
    const entries = [];
    try {
      for (let offset = 0; offset < 16; offset++) {
        const id = size - offset - 1, item = new FakeElement(), close = new FakeElement();
        toast.setToastAttributes(item, id); toast.setCloseButtonAttributes(close, id); entries.push({ id, item, close });
      }
      const absent = new FakeElement(), absentClose = new FakeElement();
      toast.setToastAttributes(absent, size); toast.setCloseButtonAttributes(absentClose, size);
      const visits = projectionWork(toast.state.items, () => toast.handleEvent('pause'));
      const measurement = { size, visits, empty: 0, early: 0 }; measurements.push(measurement);
      for (const { id, item, close } of entries) {
        assert.equal(item.getAttribute('role'), id % 2 ? 'alert' : 'status');
        assert.equal(item.dataset.kind, id % 2 ? 'error' : 'info'); assert.equal(item.hidden, false); assert.equal(close.disabled, false);
      }
      assert.equal(absent.hidden, true); assert.equal(absentClose.disabled, true);
      const first = entries[0]; toast.dismiss(first.id);
      assert.equal(first.item.hidden, true); assert.equal(first.close.disabled, true);
      assert.equal(first.item.dataset.state, 'closed');
      for (const { id } of entries) { toast.setToastAttributes(undefined, id); toast.setCloseButtonAttributes(undefined, id); }
      toast.setToastAttributes(undefined, size); toast.setCloseButtonAttributes(undefined, size);
      measurement.empty = projectionWork(toast.state.items, () => toast.handleEvent('resume'));
      toast.setToastAttributes(new FakeElement(), 0); toast.setCloseButtonAttributes(new FakeElement(), 0);
      measurement.early = projectionWork(toast.state.items, () => toast.handleEvent('pause'));
    } finally { toast.disconnect(); }
  }
  t.diagnostic(JSON.stringify({ metric: 'toast-projection-item-visits', measurements }));
  for (const { size, visits, empty, early } of measurements) {
    assert.ok(visits <= size, `${visits} item visits for ${size} items`);
    assert.equal(empty, 0); assert.equal(early, 1);
  }
});

test('Toast native attribute reentrancy cannot overwrite newer projection or disposed caller state', () => {
  for (const action of ['replace', 'dispose']) {
    const toast = createToast({ root: new FakeElement(), autoDismiss: false, initialToasts: [{ id: 'a', title: 'A' }] });
    const item = new FakeElement(); toast.setToastAttributes(item, 'a'); const original = item.setAttribute;
    let armed = true;
    item.setAttribute = function (name, value) {
      original.call(this, name, value);
      if (name !== 'role' || !armed) return; armed = false;
      if (action === 'replace') toast.updateToast('a', { kind: 'error' });
      else { toast.disconnect(); item.dataset.kind = 'caller-after-dispose'; }
    };
    try {
      toast.updateToast('a', { title: 'Changed' });
      assert.equal(item.dataset.kind, action === 'replace' ? 'error' : 'caller-after-dispose');
      if (action === 'replace') assert.equal(item.getAttribute('role'), 'alert');
    } finally { toast.disconnect(); }
  }
});

test('Toast hidden projection stops between native writes when visibility callbacks replace or dispose it', () => {
  for (const action of ['remove', 'dispose']) {
    const toast = createToast({ root: new FakeElement(), autoDismiss: false, initialToasts: [{ id: 'a', title: 'A' }] });
    const item = new FakeElement(); toast.setToastAttributes(item, 'a'); let hidden = item.hidden, armed = true;
    Object.defineProperty(item, 'hidden', { configurable: true, get: () => hidden, set(value) {
      hidden = value; if (!armed) return; armed = false;
      if (action === 'remove') toast.dismiss('a');
      else { toast.disconnect(); item.setAttribute('hidden', 'until-found'); }
    } });
    try {
      toast.updateToast('a', { title: 'Changed' });
      assert.equal(item.getAttribute('hidden'), action === 'remove' ? '' : 'until-found');
      if (action === 'remove') { assert.equal(item.hidden, true); assert.equal(item.dataset.state, 'closed'); }
    } finally { toast.disconnect(); }
  }
});

function projectionWork(items, run) {
  const find = Array.prototype.find, some = Array.prototype.some, iterator = Array.prototype[Symbol.iterator]; let visits = 0;
  try {
    for (const [name, original] of [['find', find], ['some', some]]) Array.prototype[name] = function (callback, receiver) {
      if (this !== items) return original.call(this, callback, receiver);
      return original.call(this, (...args) => { visits++; return callback.call(receiver, ...args); });
    };
    Array.prototype[Symbol.iterator] = function () {
      const source = iterator.call(this); if (this !== items) return source;
      return { next() { const value = source.next(); if (!value.done) visits++; return value; }, [Symbol.iterator]() { return this; } };
    };
    run(); return visits;
  } finally { Array.prototype.find = find; Array.prototype.some = some; Array.prototype[Symbol.iterator] = iterator; }
}

class FakeElement { attributes = new Map(); listeners = new Map(); dataset = {}; style = { touchAction: '' }; hidden = false; disabled = false; type = ''; setAttribute(n,v){this.attributes.set(n,v)} getAttribute(n){return this.attributes.get(n)??null} removeAttribute(n){this.attributes.delete(n)} addEventListener(t,l){const s=this.listeners.get(t)??new Set();s.add(l);this.listeners.set(t,s)} removeEventListener(t,l){this.listeners.get(t)?.delete(l)} dispatch(t){for(const l of this.listeners.get(t)??[])l({})} }
