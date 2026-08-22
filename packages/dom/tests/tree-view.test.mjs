import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createTree } from '@sectile/core/tree';
import {
  createTreeView,
  createTreeViewController,
  toTreeViewEffect,
  toTreeViewEvent,
} from '../dist/tree-view.js';

test('DOM tree-view facade constructs the tree and owns ARIA and keyboard focus', () => {
  const root = new FakeElement();
  let updates = 0;
  const connection = unwrap(createTreeView({
    nodes: nodes(),
    root,
    defaultHighlightedValue: 'root',
    onUpdate: () => { updates += 1; },
  }));
  connection.setTreeAttributes('Files');
  assert.equal(connection.tree.size, 4);
  assert.equal(root.attributes.get('role'), 'tree');
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'root' });
  assert.equal(item.attributes.get('role'), 'treeitem');
  assert.equal(item.attributes.get('aria-expanded'), 'false');
  assert.equal(item.attributes.get('aria-level'), '1');
  assert.equal(item.tabIndex, 0);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), false);
  assert.deepEqual(connection.getSnapshot().state.expansion.ids, ['root']);
  assert.equal(updates, 1);
  connection.disconnect();

  const invalid = createTreeView({
    nodes: [{ id: 'child', parentID: 'missing' }],
    root: new FakeElement(),
  });
  assert.equal(invalid.ok, false);
});

test('DOM keys map onto tree-view semantic events', () => {
  assert.equal(toTreeViewEvent({ key: 'ArrowDown' }), 'next');
  assert.equal(toTreeViewEvent({ key: 'ArrowUp' }), 'previous');
  assert.equal(toTreeViewEvent({ key: 'ArrowRight' }), 'right');
  assert.equal(toTreeViewEvent({ key: 'ArrowLeft' }), 'left');
  assert.equal(toTreeViewEvent({ key: ' ' }), 'toggle-select');
  assert.equal(toTreeViewEvent({ key: 'ArrowDown', altKey: true }), null);
});

test('DOM tree-view delegates disclosure and item clicks', () => {
  const root = new FakeElement();
  const connection = unwrap(createTreeView({
    nodes: nodes(),
    root,
    defaultHighlightedValue: 'root',
  }));
  const disclosure = new FakeElement();
  connection.setDisclosureAttributes(disclosure, 'root');
  root.emit('click', { target: disclosure });
  assert.deepEqual(connection.getSnapshot().state.expansion.ids, ['root']);
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'child-a' });
  root.emit('click', { target: item });
  assert.equal(connection.getSnapshot().state.cursor.current, 'child-a');
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['child-a']);
});

test('DOM tree-view commands project into focus effects', () => {
  assert.deepEqual(toTreeViewEffect({ type: 'focus', id: 'root' }), {
    type: 'focus-element',
    id: 'root',
  });
});

test('DOM tree-view derives disabled semantics and skips unavailable items', () => {
  const root = new FakeElement();
  const connection = unwrap(createTreeView({ nodes: nodes(), root, defaultExpandedValue: ['root', 'child-a'], defaultHighlightedValue: 'child-a', disabledItems: ['child-b'] }));
  const disabled = new FakeElement(); connection.setItemAttributes(disabled, { id: 'child-b' });
  assert.equal(disabled.attributes.get('aria-disabled'), 'true');
  connection.handleEvent('next');
  assert.equal(connection.getSnapshot().state.cursor.current, 'grandchild');
  connection.handleEvent('next');
  assert.equal(connection.getSnapshot().state.cursor.current, 'grandchild');
  assert.equal(connection.handleEvent({ type: 'toggle-select', id: 'child-b' }), true);
  assert.deepEqual(connection.getSnapshot().state.selection.selected, []);
});

test('uncontrolled DOM tree-view owns expansion, highlight, and selection', () => {
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    defaultHighlightedValue: 'root',
  }));
  const opened = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.snapshot.state.expansion.ids, ['root']);
  const entered = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(entered.ok, true);
  assert.equal(entered.snapshot.state.cursor.current, 'child-a');
  const selected = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, ['child-a']);
});

test('controlled DOM tree-view emits expansion proposals until synchronized', () => {
  const expansions = [];
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    expandedValue: [],
    defaultHighlightedValue: 'root',
    onExpandedValueChange(change) {
      expansions.push(change);
    },
  }));
  const opened = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.snapshot.state.expansion.ids, []);
  assert.deepEqual(expansions, [{ value: ['root'], previousValue: [] }]);
  const synchronized = unwrap(controller.syncControlledValues({ expandedValue: ['root'] }));
  assert.deepEqual(synchronized.state.expansion.ids, ['root']);
});

test('invalid controlled tree-view synchronization is failure-atomic', () => {
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    expandedValue: ['root'],
    defaultHighlightedValue: 'child-a',
  }));
  const initial = controller.getSnapshot();
  const result = controller.syncControlledValues({ expandedValue: [] });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'tree-view-cursor-hidden');
  assert.equal(controller.getSnapshot(), initial);
});

function tree() {
  return unwrap(createTree(nodes()));
}

function nodes() {
  return [
    { id: 'root', parentID: null },
    { id: 'child-a', parentID: 'root' },
    { id: 'grandchild', parentID: 'child-a' },
    { id: 'child-b', parentID: 'root' },
  ];
}

function keyboardEvent(key) {
  return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelectorAll() {
    return [];
  }

  focus() {}
}
