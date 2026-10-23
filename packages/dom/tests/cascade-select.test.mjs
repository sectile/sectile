import assert from 'node:assert/strict';
import test from 'node:test';
import { createCascadeSelect, tryCreateCascadeSelect, toCascadeSelectEvent } from '../.verification-dist/cascade-select.js';
import { createPopover } from '../.verification-dist/popover.js';

const nodes = [
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' },
  { id: 'seoul', parentID: 'kr' }, { id: 'tokyo', parentID: 'jp' },
];

test('CascadeSelect preserves controlled tree state while releasing ancestor-owned resources and stale focus', () => {
  const document = new FakeElement(), parentRoot = new FakeElement(document), root = new FakeElement(document);
  const trigger = new FakeElement(document), popup = new FakeElement(document), option = new FakeElement(document);
  parentRoot.children.add(trigger); popup.querySelectorAll = () => [option];
  const requests = [], queued = []; const queue = globalThis.queueMicrotask; let failUpdate = false;
  const failure = new Error('CascadeSelect subscriber failed'); globalThis.queueMicrotask = callback => queued.push(callback);
  const parent = createPopover({ root: parentRoot, defaultOpen: true, position: false, autoFocus: false });
  const select = createCascadeSelect({ root, trigger, popup, nodes, open: true, defaultValue: 'seoul', position: false,
    onOpenChange: next => requests.push(next), onUpdate() { if (failUpdate) throw failure; } });
  select.setItemAttributes(option, 'europe');
  const listeners = () => [document, root, trigger, popup].reduce((sum, node) => sum + [...node.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
  try {
    let paint; select.subscribeLayerPresentation(next => { paint = next; }); const first = paint.generation;
    for (let turn = 0; turn < 3; turn++) {
      select.handleEvent({ type: 'focus', id: 'asia' }); select.handleEvent({ type: 'focus', id: 'europe' });
      const stale = queued.splice(0); assert.ok(stale.length > 0); const snapshot = select.getSnapshot(), tree = select.tree;
      parent.suspend(); assert.equal(select.getActive(), false); assert.equal(select.getSnapshot(), snapshot); assert.equal(select.tree, tree);
      assert.equal(listeners(), 0); assert.equal(popup.hidden, true);
      select.refresh(); select.syncControlledValues({ open: true }); assert.equal(listeners(), 0);
      parent.resume(); select.resume(); assert.equal(select.getLayerOrder(), 1);
      select.subscribeLayerPresentation(next => { paint = next; }); assert.ok(paint.generation > first);
      option.focused = false; for (const callback of stale) callback(); assert.equal(option.focused, false);
      select.handleEvent({ type: 'focus', id: 'asia' }); select.handleEvent({ type: 'focus', id: 'europe' });
      for (const callback of queued.splice(0)) callback(); assert.equal(option.focused, true);
    }
    document.emit('keydown', { key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
    assert.deepEqual(requests, [false]); assert.equal(select.getSnapshot().state.open, true); assert.equal(select.getLayerOrder(), 1);
    assert.equal(trigger.focused, false);
    parent.handleEvent('close'); assert.deepEqual(requests, [false, false]); assert.equal(select.getActive(), false); assert.equal(popup.hidden, true);
    parent.handleEvent('open'); select.resume(); assert.equal(select.getLayerOrder(), 1);
    failUpdate = true; assert.throws(() => parent.suspend(), error => error === failure); failUpdate = false;
    assert.equal(listeners(), 0); select.disconnect(); select.resume(); select.refresh(); assert.equal(listeners(), 0);
  } finally { failUpdate = false; try { select.destroy(); parent.destroy(); } finally { globalThis.queueMicrotask = queue; } }
});

test('CascadeSelect initial navigation uses canonical branch-path validation', () => {
  const options = { root: new FakeElement(), trigger: new FakeElement(), popup: new FakeElement(), nodes, position: false };
  const select = createCascadeSelect({ ...options, defaultPath: ['asia'], defaultHighlightedValue: 'kr' });
  try { assert.deepEqual(select.getColumns(), [['asia', 'europe'], ['kr', 'jp']]); assert.equal(select.getSnapshot().state.highlighted, 'kr'); }
  finally { select.destroy(); }
  assert.equal(tryCreateCascadeSelect({ ...options, defaultPath: ['seoul'] }).error.code, 'cascade-select-leaf-in-path');
  assert.equal(tryCreateCascadeSelect({ ...options, defaultPath: ['missing'] }).error.code, 'cascade-select-path-outside-tree');
  assert.equal(tryCreateCascadeSelect({ ...options, defaultPath: ['kr'] }).error.code, 'invalid-cascade-select-path');
});

test('DOM cascade select projects columns and commits a leaf', () => {
  const root = new FakeElement(); const trigger = new FakeElement(); const popup = new FakeElement();
  const values = []; const select = createCascadeSelect({ root, trigger, popup, nodes, defaultOpen: true, defaultHighlightedValue: 'asia', onValueChange: (value) => values.push(value) });
  assert.deepEqual(select.getColumns(), [['asia', 'europe']]);
  select.handleEvent({ type: 'select', id: 'asia' });
  assert.deepEqual(select.getColumns(), [['asia', 'europe'], ['kr', 'jp']]);
  select.handleEvent({ type: 'select', id: 'kr' }); select.handleEvent({ type: 'select', id: 'seoul' });
  assert.deepEqual(select.getValuePath(), ['asia', 'kr', 'seoul']); assert.deepEqual(values, ['seoul']); assert.equal(popup.hidden, true);
  select.disconnect();
});

test('DOM cascade select restores exact popup hidden ownership on disconnect', () => {
  const root = new FakeElement(); const trigger = new FakeElement(); const popup = new FakeElement();
  popup.setAttribute('hidden', 'until-found'); popup.hidden = true;
  const select = createCascadeSelect({ root, trigger, popup, nodes });
  assert.equal(popup.getAttribute('hidden'), '');
  select.handleEvent('open');
  assert.equal(popup.getAttribute('hidden'), null);
  select.disconnect();
  assert.equal(popup.getAttribute('hidden'), 'until-found');

  const unmanaged = new FakeElement();
  unmanaged.setAttribute('hidden', 'until-found'); unmanaged.hidden = true;
  const rendererOwned = createCascadeSelect({
    root: new FakeElement(), trigger: new FakeElement(), popup: unmanaged, nodes, manageVisibility: false,
  });
  assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
  rendererOwned.handleEvent('open');
  rendererOwned.refresh();
  assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
  rendererOwned.handleEvent('close');
  assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
  rendererOwned.disconnect();
  assert.equal(unmanaged.getAttribute('hidden'), 'until-found');
});

test('DOM cascade select exposes native keyboard mapping and disabled semantics', () => {
  assert.equal(toCascadeSelectEvent({ key: 'ArrowRight', altKey: false, ctrlKey: false, metaKey: false }), 'right');
  const root = new FakeElement(); const trigger = new FakeElement(); const popup = new FakeElement(); const option = new FakeElement();
  const select = createCascadeSelect({ root, trigger, popup, nodes, disabledItems: ['europe'] });
  select.setItemAttributes(option, 'europe'); assert.equal(option.attributes.get('aria-disabled'), 'true'); assert.equal(option.tabIndex, -1); select.disconnect();
});

test('DOM cascade select preserves closed native trigger activation and auxiliary controls while retaining arrow entry', () => {
  const root = new FakeElement(), trigger = new FakeElement(), popup = new FakeElement(), auxiliary = new FakeElement();
  root.children.add(trigger); root.children.add(popup); root.children.add(auxiliary);
  const select = createCascadeSelect({ root, trigger, popup, nodes, position: false });
  const press = (target, key) => {
    let prevented = false;
    root.emit('keydown', { target, key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() { prevented = true; } });
    return prevented;
  };
  try {
    for (const key of ['Enter', ' ']) {
      assert.equal(press(trigger, key), false, 'The native button must receive its default activation');
      assert.equal(select.getSnapshot().state.open, false);
      trigger.emit('click', {});
      assert.equal(select.getSnapshot().state.open, true, 'One native click toggles once');
      select.handleEvent('close');
    }
    assert.equal(press(auxiliary, 'Enter'), false);
    assert.equal(press(auxiliary, 'ArrowDown'), false);
    assert.equal(select.getSnapshot().state.open, false);
    assert.equal(press(trigger, 'ArrowDown'), true);
    assert.equal(select.getSnapshot().state.open, true);
    assert.equal(select.getSnapshot().state.highlighted, 'asia');
    assert.equal(press(trigger, 'ArrowRight'), true);
    assert.deepEqual(select.getColumns(), [['asia', 'europe'], ['kr', 'jp']]);
  } finally { select.disconnect(); }
  assert.equal([root, trigger, popup].reduce((sum, node) => sum + [...node.listeners.values()].reduce((n, set) => n + set.size, 0), 0), 0);
});

test('DOM cascade select mirrors physical horizontal keys while keeping trigger and value ownership', () => {
  const root = new FakeElement(), trigger = new FakeElement(), popup = new FakeElement();
  const key = (key) => ({ target: trigger, key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(toCascadeSelectEvent(key('ArrowRight')), 'right');
  assert.equal(toCascadeSelectEvent(key('ArrowLeft'), 'rtl'), 'right');
  assert.equal(toCascadeSelectEvent(key('ArrowRight'), 'rtl'), 'left');
  const select = createCascadeSelect({ root, trigger, popup, nodes, direction: 'rtl', position: false, defaultOpen: true, defaultHighlightedValue: 'asia' });
  try {
    root.emit('keydown', key('ArrowLeft'));
    assert.equal(select.getSnapshot().state.highlighted, 'kr');
    root.emit('keydown', key('ArrowRight'));
    assert.equal(select.getSnapshot().state.highlighted, 'asia');
    assert.equal(select.getSnapshot().state.value, null);
  } finally { select.disconnect(); }
  assert.equal([root, trigger, popup].reduce((sum, node) => sum + [...node.listeners.values()].reduce((n, set) => n + set.size, 0), 0), 0);
});

class FakeElement {
  children = new Set(); focused = false;
  constructor(ownerDocument) { this.ownerDocument = ownerDocument; }
  contains(node) { return this === node || this.children.has(node); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  attributes = new Map(); dataset = {}; listeners = new Map(); tabIndex = -1; hidden = false; disabled = false;
  setAttribute(name, value) { this.attributes.set(name, String(value)); } getAttribute(name) { return this.attributes.get(name) ?? null; } removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } querySelectorAll() { return []; } focus() { this.focused = true; }
}
