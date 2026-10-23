import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createTree } from '@sectile/core/tree';
import { createCheckboxTree, createCheckboxTreeController, connectCheckboxTree } from '../.verification-dist/checkbox-tree.js';
import {
  createTreeView,
  tryCreateTreeView,
  createTreeViewController,
  toTreeViewEffect,
  toTreeViewEvent,
} from '../.verification-dist/tree-view.js';

test('DOM tree-view facade constructs the tree and owns ARIA and keyboard focus', () => {
  const root = new FakeElement();
  let updates = 0;
  const connection = createTreeView({
    nodes: nodes(),
    root,
    defaultHighlightedValue: 'root',
    onUpdate: () => { updates += 1; },
  });
  connection.setTreeAttributes('Files');
  assert.equal(connection.tree.size, 4);
  assert.equal(root.attributes.get('role'), 'tree');
  assert.equal(root.attributes.has('aria-multiselectable'), false);
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'root' });
  const marker = new FakeElement(), button = new FakeElement(); button.tagName = 'BUTTON';
  connection.setDisclosureAttributes(marker, 'root'); connection.setDisclosureAttributes(button, 'root');
  assert.equal(marker.attributes.get('aria-hidden'), 'true'); assert.equal(button.attributes.has('aria-hidden'), false);
  assert.equal(button.attributes.get('aria-expanded'), 'false');
  assert.equal(item.attributes.get('role'), 'treeitem');
  assert.equal(item.attributes.get('aria-expanded'), 'false');
  assert.equal(item.attributes.get('aria-level'), '1');
  assert.equal(item.tabIndex, 0);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), false);
  assert.deepEqual(connection.getSnapshot().state.expansion.ids, ['root']);
  assert.equal(updates, 1);
  connection.disconnect();

  const invalid = tryCreateTreeView({
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
  const connection = createTreeView({
    nodes: nodes(),
    root,
    defaultHighlightedValue: 'root',
  });
  const disclosure = new FakeElement();
  connection.setDisclosureAttributes(disclosure, 'root');
  root.emit('click', { target: disclosure });
  assert.deepEqual(connection.getSnapshot().state.expansion.ids, ['root']);
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'child-a' });
  assert.equal(item.attributes.get('aria-level'), '2');
  root.emit('click', { target: item });
  assert.equal(connection.getSnapshot().state.cursor.current, 'child-a');
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['child-a']);
  const nextItem = new FakeElement();
  connection.setItemAttributes(nextItem, { id: 'child-b' });
  root.emit('click', { target: nextItem });
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['child-b']);
});

test('DOM tree-view exposes and preserves explicit multiple selection', () => {
  const root = new FakeElement();
  const connection = createTreeView({ nodes: nodes(), root, selectionMode: 'multiple', defaultExpandedValues: ['root'] });
  connection.setTreeAttributes('Files');
  assert.equal(root.attributes.get('aria-multiselectable'), 'true');
  const first = new FakeElement(); connection.setItemAttributes(first, { id: 'child-a' });
  const second = new FakeElement(); connection.setItemAttributes(second, { id: 'child-b' });
  root.emit('click', { target: first });
  root.emit('click', { target: second });
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['child-a', 'child-b']);
});

test('DOM tree-view commands project into focus effects', () => {
  assert.deepEqual(toTreeViewEffect({ type: 'focus', id: 'root' }), {
    type: 'focus-element',
    id: 'root',
  });
});

test('DOM tree-view derives disabled semantics and skips unavailable items', () => {
  const root = new FakeElement();
  const connection = createTreeView({ nodes: nodes(), root, defaultExpandedValues: ['root', 'child-a'], defaultHighlightedValue: 'child-a', disabledItems: ['child-b'] });
  const disabled = new FakeElement(); connection.setItemAttributes(disabled, { id: 'child-b' });
  assert.equal(disabled.attributes.get('aria-disabled'), 'true');
  connection.handleEvent('next');
  assert.equal(connection.getSnapshot().state.cursor.current, 'grandchild');
  connection.handleEvent('next');
  assert.equal(connection.getSnapshot().state.cursor.current, 'grandchild');
  assert.equal(connection.handleEvent({ type: 'toggle-select', id: 'child-b' }), true);
  assert.deepEqual(connection.getSnapshot().state.selection.selected, []);
  const dynamic = new FakeElement();
  connection.setItemAttributes(dynamic, { id: 'grandchild', disabled: true });
  assert.equal(dynamic.attributes.get('aria-disabled'), 'true');
  assert.equal(connection.handleEvent({ type: 'toggle-select', id: 'grandchild' }), true);
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

test('read-only DOM tree-view keeps navigation and expansion while rejecting selection', () => {
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    readOnly: true,
    defaultHighlightedValue: 'root',
  }));
  const expanded = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(expanded.ok, true);
  assert.deepEqual(expanded.snapshot.state.expansion.ids, ['root']);
  const moved = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'child-a');
  const selected = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(selected.ok, false);
  assert.equal(selected.error.code, 'interaction-read-only');
  assert.deepEqual(selected.snapshot.state.selection.selected, []);
});

test('controlled DOM tree-view emits expansion proposals until synchronized', () => {
  const expansions = [];
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    expandedValues: [],
    defaultHighlightedValue: 'root',
    onExpandedValuesChange(change) {
      expansions.push(change);
    },
  }));
  const opened = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.snapshot.state.expansion.ids, []);
  assert.deepEqual(expansions, [{ value: ['root'], previousValue: [] }]);
  const synchronized = unwrap(controller.syncControlledValues({ expandedValues: ['root'] }));
  assert.deepEqual(synchronized.state.expansion.ids, ['root']);
});

test('invalid controlled tree-view synchronization is failure-atomic', () => {
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    expandedValues: ['root'],
    defaultHighlightedValue: 'child-a',
  }));
  const initial = controller.getSnapshot();
  const result = controller.syncControlledValues({ expandedValues: [] });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'tree-view-cursor-hidden');
  assert.equal(controller.getSnapshot(), initial);
});

test('DOM checkbox tree aggregates unmounted leaves and publishes accepted checks before callbacks', () => {
  let controller; const observed = [];
  controller = unwrap(createCheckboxTreeController({ tree: tree(), defaultExpandedValues: ['root', 'child-a'], defaultHighlightedValue: 'root', disabledItems: ['child-b'], defaultValue: ['child-b'], onValueChange: ({ value }) => observed.push({ value, checked: controller.getChecked('root') }) }));
  assert.equal(controller.getChecked('root'), false);
  const checked = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(checked.ok, true); assert.deepEqual(checked.snapshot.state.selection.selected, ['grandchild', 'child-b']);
  assert.equal(controller.getChecked('root'), true); assert.deepEqual(observed, [{ value: ['grandchild', 'child-b'], checked: true }]);
  const unchecked = controller.handleEvent({ type: 'toggle-select', id: 'child-a' });
  assert.equal(unchecked.ok, true); assert.deepEqual(unchecked.snapshot.state.selection.selected, ['child-b']);
  assert.equal(controller.getChecked('child-b'), true); assert.equal(controller.isDisabled('child-b'), true);
  assert.equal(controller.handleEvent({ type: 'toggle-select', id: 'child-b' }).ok, false);
});

test('DOM controlled checkbox tree separates proposals and admits complete leaf state atomically', () => {
  const proposals = [];
  const controller = unwrap(createCheckboxTreeController({ tree: tree(), value: ['grandchild'], expandedValues: ['root', 'child-a'], highlightedValue: 'child-a', onValueChange: ({ value }) => proposals.push(value) }));
  assert.equal(controller.getChecked('root'), 'mixed');
  assert.equal(controller.handleEvent({ type: 'toggle-select', id: 'root' }).ok, true);
  assert.deepEqual(proposals, [['grandchild', 'child-b']]); assert.deepEqual(controller.getSnapshot().state.selection.selected, ['grandchild']); assert.equal(controller.getChecked('root'), 'mixed');
  const before = controller.getSnapshot();
  assert.equal(controller.syncControlledValues({ value: ['child-b'], expandedValues: [], highlightedValue: 'child-a' }).ok, false);
  assert.equal(controller.getSnapshot(), before); assert.equal(controller.getChecked('grandchild'), true);
  assert.equal(controller.syncControlledValues({ value: ['root'], expandedValues: ['root'], highlightedValue: 'root' }).ok, false);
  assert.equal(controller.getSnapshot(), before); assert.equal(controller.getChecked('root'), 'mixed');
  assert.equal(controller.syncControlledValues({ value: ['child-b'], expandedValues: ['root'], highlightedValue: 'root' }).ok, true);
  assert.equal(controller.getChecked('grandchild'), false); assert.equal(controller.getChecked('child-b'), true);
});

test('DOM checkbox tree projects checked treeitems through existing delegated focus and cleans listeners', () => {
  const root = new FakeElement();
  const connection = createCheckboxTree({ root, nodes: nodes(), defaultValue: ['grandchild'], defaultExpandedValues: ['root', 'child-a'], defaultHighlightedValue: 'root' });
  connection.setTreeAttributes('Choose folders');
  const item = new FakeElement(); connection.setItemAttributes(item, { id: 'root' });
  assert.equal(item.attributes.get('role'), 'treeitem'); assert.equal(item.attributes.get('aria-checked'), 'mixed'); assert.equal(item.attributes.has('aria-selected'), false);
  root.emit('click', { target: item }); connection.setItemAttributes(item, { id: 'root' });
  assert.equal(item.attributes.get('aria-checked'), 'true'); assert.deepEqual(connection.getSnapshot().state.selection.selected, ['grandchild', 'child-b']);
  assert.equal(connection.getSnapshot().state.cursor.current, 'root');
  connection.disconnect(); assert.ok([...root.listeners.values()].every(listeners => listeners.size === 0));
});

test('DOM checkbox tree refuses reentrant controlled admission while allowing accepted callback synchronization', () => {
  let controller; const nested = [];
  controller = unwrap(createCheckboxTreeController({ tree: tree(), value: [], defaultExpandedValues: ['root', 'child-a'], defaultHighlightedValue: 'root', onValueChange: ({ value }) => { assert.equal(controller.syncControlledValues({ value }).ok, true); } }));
  const values = { get value() {
    nested.push(controller.handleEvent('toggle-select').error.code);
    nested.push(controller.syncControlledValues({ value: [] }).error.code);
    return ['grandchild'];
  } };
  assert.equal(controller.syncControlledValues(values).ok, true);
  assert.ok(nested.length > 0); assert.ok(nested.every(code => code === 'tree-selection-reentrant'));
  assert.deepEqual(controller.getSnapshot().state.selection.selected, ['grandchild']); assert.equal(controller.getChecked('root'), 'mixed');
  assert.equal(controller.handleEvent('toggle-select').ok, true);
  assert.deepEqual(controller.getSnapshot().state.selection.selected, ['grandchild', 'child-b']); assert.equal(controller.getChecked('root'), true);
  const custom = ['grandchild']; custom[Symbol.iterator] = () => { throw Error('external iterator must not run'); };
  assert.equal(controller.syncControlledValues({ value: custom }).ok, true);
  assert.deepEqual(controller.getSnapshot().state.selection.selected, ['grandchild']);
  const oversized = []; oversized.length = tree().preorder().maxItems + 1;
  Object.defineProperty(oversized, 0, { get() { throw Error('over-ceiling element must not run'); } });
  assert.equal(controller.syncControlledValues({ value: oversized }).error.code, 'item-ceiling-exceeded');
  assert.deepEqual(controller.getSnapshot().state.selection.selected, ['grandchild']);
});

test('DOM checkbox tree attaches an accepted controller and releases virtualized row focus bindings', async () => {
  const controller = unwrap(createCheckboxTreeController({ tree: tree(), defaultExpandedValues: ['root', 'child-a'], defaultHighlightedValue: 'grandchild', defaultValue: ['grandchild'] }));
  const root = new FakeElement(), first = connectCheckboxTree({ root, controller });
  const retired = new FakeElement(); let retiredFocus = 0; retired.focus = () => { retiredFocus++; };
  first.setItemAttributes(retired, { id: 'grandchild' });
  first.releaseItem(retired, 'grandchild'); assert.equal(retired.tabIndex, -1);
  first.focusCurrent(); await Promise.resolve(); assert.equal(retiredFocus, 0);
  first.disconnect(); assert.ok([...root.listeners.values()].every(listeners => listeners.size === 0));
  const replacement = new FakeElement(), next = connectCheckboxTree({ root: new FakeElement(), controller }); let nextFocus = 0;
  replacement.focus = () => { nextFocus++; }; next.setItemAttributes(replacement, { id: 'grandchild' });
  assert.equal(next.getChecked('root'), 'mixed'); assert.deepEqual(next.getSnapshot().state.selection.selected, ['grandchild']);
  next.focusCurrent(); await Promise.resolve(); assert.equal(nextFocus, 1); assert.equal(retiredFocus, 0);
  next.disconnect();
  const legacy = createTreeView({ root: new FakeElement(), nodes: nodes(), defaultExpandedValues: ['root', 'child-a'] });
  const oldRow = new FakeElement(), currentRow = new FakeElement();
  legacy.setItemAttributes(oldRow, { id: 'grandchild', disabled: true });
  legacy.setItemAttributes(currentRow, { id: 'grandchild', disabled: true });
  legacy.releaseItem(oldRow, 'grandchild');
  legacy.handleEvent({ type: 'toggle-select', id: 'grandchild' });
  assert.deepEqual(legacy.getSnapshot().state.selection.selected, []);
  legacy.disconnect();
});

test('checked Native handoff materializes selected values at most once and preserves canonical navigation', () => {
  const measure = (operation) => {
    const sorts = [], original = Array.prototype.sort;
    Array.prototype.sort = function(...args) {
      if (Array.isArray(this[0]) && typeof this[0][1] === 'string' && this[0][1].startsWith('leaf-')) sorts.push(this.length);
      return Reflect.apply(original, this, args);
    };
    try { return { result: operation(), sorts }; } finally { Array.prototype.sort = original; }
  };
  for (const size of [32, 512, 4096]) {
    const ids = Array.from({ length: size }, (_, index) => 'leaf-' + index), selected = ids.slice(0, size / 2), target = ids[size - 1];
    const domain = createTree([{ id: 'root', parentID: null }, ...ids.map(id => ({ id, parentID: 'root' }))]); let proposed;
    const controller = unwrap(createCheckboxTreeController({ tree: domain, defaultValue: selected, defaultExpandedValues: ['root'], onValueChange: ({ value }) => { proposed = value; } }));
    const checked = measure(() => controller.handleEvent({ type: 'toggle-select', id: target }));
    assert.equal(checked.result.ok, true); assert.deepEqual(checked.result.snapshot.state.selection.selected, [...selected, target]);
    assert.equal(checked.result.snapshot.state.selection.selected, proposed); assert.ok(checked.sorts.length <= 1); assert.ok(checked.sorts.reduce((a, b) => a + b, 0) <= selected.length + 1);
    const moved = measure(() => controller.handleEvent('previous'));
    assert.equal(moved.result.ok, true); assert.equal(moved.result.snapshot.state.cursor.current, ids[size - 2]);
    assert.equal(moved.result.snapshot.state.selection, checked.result.snapshot.state.selection); assert.deepEqual(moved.sorts, []);
    const controlled = unwrap(createCheckboxTreeController({ tree: domain, value: selected, defaultExpandedValues: ['root'] }));
    const synced = measure(() => controlled.syncControlledValues({ value: [...selected, target] }));
    assert.equal(synced.result.ok, true); assert.deepEqual(synced.result.value.state.selection.selected, [...selected, target]); assert.ok(synced.sorts.length <= 1);
  }
});

test('retired tree callbacks cannot decode input, publish or mutate an independently retained controller', async () => {
  const root = new FakeElement(), controller = unwrap(createCheckboxTreeController({ tree: tree(), defaultHighlightedValue: 'root' })); let updates = 0;
  const connection = connectCheckboxTree({ root, controller, onUpdate: () => { updates++; } });
  const clickHandler = [...root.listeners.get('click')][0], keyHandler = [...root.listeners.get('keydown')][0];
  const before = controller.getSnapshot(); connection.focusCurrent(); connection.disconnect(); connection.disconnect();
  clickHandler({ get target() { throw Error('retired click decoded'); } });
  keyHandler({ get key() { throw Error('retired key decoded'); } });
  await Promise.resolve();
  assert.equal(connection.handleEvent('toggle-select'), false); assert.equal(updates, 0); assert.equal(controller.getSnapshot(), before);
  assert.equal(connection.getChecked('root'), null); assert.equal(connection.getSnapshot(), before);
  assert.equal(connection.syncControlledValues({}).error.code, 'connection-destroyed');
});

test('retained checked-tree connections and saved handlers release retired DOM and caller hooks', { skip: typeof global.gc !== 'function' }, async () => {
  const retained = retiredTreePresentation();
  retained.connection.disconnect();
  for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  for (const reference of retained.references) assert.equal(reference.deref(), undefined);
  assert.ok(retained.handlers.length === 2); assert.equal(retained.connection.tree.size, 4);
});

function retiredTreePresentation() {
  const root = new FakeElement(), marker = { updates: 0 }, controller = unwrap(createCheckboxTreeController({ tree: tree() }));
  const connection = connectCheckboxTree({ root, controller, onUpdate: () => { marker.updates++; } });
  const item = new FakeElement(); connection.setItemAttributes(item, { id: 'root' }); connection.focusCurrent();
  assert.equal(connection.syncControlledValues({}).ok, true); assert.equal(marker.updates, 1);
  return { connection, handlers: [...root.listeners.get('click'), ...root.listeners.get('keydown')], references: [new WeakRef(root), new WeakRef(item), new WeakRef(marker)] };
}

function tree() {
  return createTree(nodes());
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
