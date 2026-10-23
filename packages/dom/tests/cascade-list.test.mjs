import assert from 'node:assert/strict';
import test from 'node:test';
import { createCascadeList, toCascadeListEvent } from '../.verification-dist/cascade-list.js';

const nodes = [
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' },
  { id: 'seoul', parentID: 'kr' }, { id: 'tokyo', parentID: 'jp' },
];

test('DOM cascade list keeps named listbox columns visible and commits a leaf', async () => {
  const root = new FakeElement();
  const values = [];
  const list = createCascadeList({
    root,
    nodes,
    label: 'Location',
    defaultHighlightedValue: 'asia',
    onValueChange: (value) => values.push(value),
  });
  const rootColumn = new FakeElement();
  const asia = new FakeElement(root);
  const kr = new FakeElement(root);
  const seoul = new FakeElement(root);
  root.items = [asia, kr, seoul];
  list.setColumnAttributes(rootColumn, null, 'Region');
  list.setItemAttributes(asia, 'asia');
  assert.equal(root.attributes.get('role'), 'group');
  assert.equal(root.attributes.get('aria-label'), 'Location');
  assert.equal(rootColumn.attributes.get('role'), 'listbox');
  assert.equal(rootColumn.attributes.get('aria-label'), 'Region');
  assert.equal(asia.attributes.get('role'), 'option');
  assert.equal(asia.attributes.get('aria-haspopup'), 'listbox');
  assert.equal(asia.attributes.get('aria-expanded'), undefined);
  assert.equal(asia.dataset.expanded, undefined);

  root.dispatch('click', { target: asia });
  assert.deepEqual(list.getColumns(), [['asia', 'europe'], ['kr', 'jp']]);
  list.setItemAttributes(asia, 'asia');
  list.setItemAttributes(kr, 'kr');
  assert.equal(asia.attributes.get('aria-expanded'), undefined);
  assert.equal(asia.dataset.expanded, '');
  root.dispatch('click', { target: kr });
  list.setItemAttributes(seoul, 'seoul');
  root.dispatch('click', { target: seoul });
  await Promise.resolve();
  assert.deepEqual(list.getValuePath(), ['asia', 'kr', 'seoul']);
  assert.deepEqual(values, ['seoul']);
  assert.equal(root.hidden, false);
  list.disconnect();
});

test('DOM cascade list maps navigation without owning Escape and exposes disabled state', () => {
  assert.equal(toCascadeListEvent({ key: 'ArrowRight', altKey: false, ctrlKey: false, metaKey: false }), 'right');
  assert.equal(toCascadeListEvent({ key: 'Escape', altKey: false, ctrlKey: false, metaKey: false }), null);
  const root = new FakeElement();
  const option = new FakeElement(root);
  const list = createCascadeList({ root, nodes, disabledItems: ['europe'] });
  list.setItemAttributes(option, 'europe');
  assert.equal(option.attributes.get('aria-disabled'), 'true');
  assert.equal(option.tabIndex, -1);
  list.disconnect();
});

test('DOM cascade list keeps controlled values external while retaining branch navigation', () => {
  const root = new FakeElement();
  const proposals = [];
  const list = createCascadeList({
    root,
    nodes,
    value: null,
    defaultHighlightedValue: 'asia',
    onValueChange: (value) => proposals.push(value),
  });
  assert.equal(list.handleEvent({ type: 'select', id: 'asia' }), true);
  assert.equal(list.handleEvent({ type: 'select', id: 'kr' }), true);
  assert.equal(list.handleEvent({ type: 'select', id: 'seoul' }), true);
  assert.equal(list.getSnapshot().state.value, null);
  assert.deepEqual(list.getSnapshot().state.path, ['asia', 'kr']);
  assert.deepEqual(proposals, ['seoul']);
  assert.equal(list.syncControlledValues({ value: 'seoul' }).ok, true);
  assert.equal(list.getSnapshot().state.value, 'seoul');
  list.disconnect();
});

test('DOM cascade list mirrors physical horizontal keys without changing logical events or selection', () => {
  const key = (key) => ({ key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(toCascadeListEvent(key('ArrowRight')), 'right');
  assert.equal(toCascadeListEvent(key('ArrowLeft'), 'rtl'), 'right');
  assert.equal(toCascadeListEvent(key('ArrowRight'), 'rtl'), 'left');
  const root = new FakeElement();
  const list = createCascadeList({ root, nodes, direction: 'rtl', defaultHighlightedValue: 'asia' });
  try {
    root.dispatch('keydown', key('ArrowLeft'));
    assert.equal(list.getSnapshot().state.highlighted, 'kr');
    root.dispatch('keydown', key('ArrowRight'));
    assert.equal(list.getSnapshot().state.highlighted, 'asia');
    assert.equal(list.getSnapshot().state.value, null);
  } finally { list.disconnect(); }
  assert.equal([...root.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
});

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  items = [];
  parentElement;
  tabIndex = -1;
  hidden = false;
  focused = false;

  constructor(parentElement = null) { this.parentElement = parentElement; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelectorAll() { return this.items; }
  focus() { this.focused = true; }
  dispatch(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
}
