import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import {
  createListbox,
  tryCreateListbox,
  createListboxController,
  toListboxEffect,
  toListboxEvent,
} from '../.verification-dist/listbox.js';
import { createSequence } from '@sectile/core/sequence';

test('DOM listbox facade owns construction, keyboard dispatch, ARIA, and activation', async () => {
  const root = new FakeElement();
  const activations = [];
  let updates = 0;
  const connection = createListbox({
    items: ['a', 'b'],
    root,
    defaultHighlightedValue: 'a',
    onActivate: (id) => activations.push(id),
    onUpdate: () => { updates += 1; },
  });
  connection.setListboxAttributes('Letters');
  assert.equal(root.attributes.get('role'), 'listbox');
  assert.equal(root.attributes.get('aria-label'), 'Letters');
  assert.equal(root.tabIndex, 0);
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'a' });
  assert.equal(item.attributes.get('role'), 'option');
  assert.equal(item.attributes.get('aria-selected'), 'false');
  assert.equal(item.tabIndex, -1);
  assert.equal(root.attributes.get('aria-activedescendant'), item.id);

  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowDown')), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Tab')), false);
  await Promise.resolve();
  assert.deepEqual(activations, ['b']);
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.equal(updates, 2);
  connection.disconnect();
  assert.equal(root.listeners.get('keydown')?.size ?? 0, 0);

  assert.throws(
    () => createListbox({ items: ['a', 'a'], root: new FakeElement() }),
    (error) => error.name === 'SectileResultError' && error.code === 'duplicate-id',
  );
  const duplicate = tryCreateListbox({ items: ['a', 'a'], root: new FakeElement() });
  assert.equal(duplicate.ok, false);
});

test('DOM keyboard inputs map onto listbox semantic events', () => {
  assert.equal(toListboxEvent({ key: 'ArrowDown' }), 'next');
  assert.equal(toListboxEvent({ key: 'ArrowUp' }), 'previous');
  assert.equal(toListboxEvent({ key: ' ' }), 'toggle');
  assert.equal(toListboxEvent({ key: 'Enter' }), 'activate');
  assert.equal(toListboxEvent({ key: 'Escape' }), 'clear');
  assert.equal(toListboxEvent({ key: 'Home' }), 'first');
  assert.equal(toListboxEvent({ key: 'End' }), 'last');
  assert.equal(toListboxEvent({ key: 'ArrowRight' }, 'horizontal'), 'next');
  assert.equal(toListboxEvent({ key: 'ArrowDown' }, 'horizontal'), null);
  assert.equal(toListboxEvent({ key: 'ArrowDown', ctrlKey: true }), null);
  assert.equal(toListboxEvent({ key: 'Tab' }), null);
});

test('DOM facade exposes state, send, update, subscribe, and destroy aliases', () => {
  const root = new FakeElement();
  const connection = createListbox({
    items: ['a', 'b'],
    root,
    value: [],
    highlightedValue: 'a',
  });
  const revisions = [];
  const unsubscribe = connection.subscribe((snapshot) => revisions.push(snapshot.revision));

  assert.equal(connection.state.cursor.current, 'a');
  assert.equal(connection.send('next'), true);
  assert.equal(connection.state.cursor.current, 'a');
  assert.deepEqual(revisions, [1]);

  const synchronized = connection.update({ value: ['b'], highlightedValue: 'b' });
  assert.equal(synchronized.ok, true);
  assert.equal(connection.state.cursor.current, 'b');
  assert.deepEqual(connection.state.selection.selected, ['b']);
  assert.deepEqual(revisions, [1, 2]);

  unsubscribe();
  connection.destroy();
  assert.equal(root.listeners.get('keydown')?.size ?? 0, 0);
  assert.equal(connection.send('previous'), false);
});

test('DOM listbox delegates clicks by selection mode and derives disabled semantics', () => {
  const root = new FakeElement();
  const activations = [];
  const connection = createListbox({
    items: ['a', 'b', 'disabled'],
    root,
    selectionMode: 'single',
    disabledItems: ['disabled'],
    defaultHighlightedValue: 'a',
    onActivate: (id) => activations.push(id),
  });
  const item = new FakeElement();
  connection.setItemAttributes(item, { id: 'b' });
  root.emit('click', { target: item });
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['b']);
  assert.deepEqual(activations, ['b']);

  const disabled = new FakeElement();
  connection.setItemAttributes(disabled, { id: 'disabled' });
  assert.equal(disabled.attributes.get('aria-disabled'), 'true');
  root.emit('click', { target: disabled });
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.equal(root.attributes.has('aria-multiselectable'), false);
});

test('DOM listbox typeahead skips disabled items and uses a timeout buffer', () => {
  let now = 0;
  const controller = unwrap(createListboxController({
    domain: createSequence(['alpha', 'blocked', 'bravo', 'beta']),
    disabledItems: ['blocked'],
    defaultHighlightedValue: 'alpha',
    typeahead: { textValue: (id) => id, now: () => now, timeoutMs: 250 },
  }));

  assert.equal(controller.handleKeyboardInput({ key: 'b' }).snapshot.state.cursor.current, 'bravo');
  now = 50;
  assert.equal(controller.handleKeyboardInput({ key: 'r' }).snapshot.state.cursor.current, 'bravo');
  now = 400;
  assert.equal(controller.handleKeyboardInput({ key: 'b' }).snapshot.state.cursor.current, 'beta');
  assert.equal(createListboxController({
    domain: createSequence(['a']), disabledItems: ['missing'],
  }).error.code, 'disabled-item-outside-domain');
});

test('DOM commands project into DOM-specific effects', () => {
  assert.deepEqual(toListboxEffect({ type: 'focus', id: 'a' }), {
    type: 'set-active-descendant',
    id: 'a',
  });
  assert.deepEqual(toListboxEffect({ type: 'activate', id: 'a' }), {
    type: 'dispatch-activation',
    id: 'a',
  });
});

test('uncontrolled DOM controller owns state and rejects stale or unsupported inputs atomically', () => {
  const domain = createSequence(['a', 'b']);
  const values = [];
  const highlights = [];
  const controller = unwrap(createListboxController({
    domain,
    defaultHighlightedValue: 'a',
    onValueChange(change) {
      values.push(change);
    },
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
  }));

  const moved = controller.handleKeyboardInput({ key: 'ArrowDown' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'b');
  assert.deepEqual(moved.commands, [{ type: 'set-active-descendant', id: 'b' }]);
  assert.deepEqual(highlights, [{ value: 'b', previousValue: 'a' }]);

  const selected = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, ['b']);
  assert.deepEqual(values, [{ value: ['b'], previousValue: [] }]);

  const beforeFailure = controller.getSnapshot();
  const unsupported = controller.handleKeyboardInput({ key: 'Tab' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, beforeFailure);
  assert.deepEqual(unsupported.commands, []);
  const stale = controller.handleKeyboardInput({ key: 'ArrowDown' }, 0);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.snapshot, beforeFailure);
});

test('controlled DOM values emit proposals and change only after sync', () => {
  const domain = createSequence(['a', 'b']);
  const values = [];
  const highlights = [];
  const controller = unwrap(createListboxController({
    domain,
    value: ['a'],
    highlightedValue: 'a',
    policies: { deselectable: true },
    onValueChange(change) {
      values.push(change);
    },
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
  }));

  const moved = controller.handleKeyboardInput({ key: 'ArrowDown' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'a');
  assert.deepEqual(moved.commands, [{ type: 'set-active-descendant', id: 'b' }]);
  assert.deepEqual(highlights, [{ value: 'b', previousValue: 'a' }]);

  const toggled = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(toggled.ok, true);
  assert.deepEqual(toggled.snapshot.state.selection.selected, ['a']);
  assert.deepEqual(values, [{ value: [], previousValue: ['a'] }]);

  const synchronized = unwrap(controller.syncControlledValues({ value: [], highlightedValue: 'b' }));
  assert.deepEqual(synchronized.state.selection.selected, []);
  assert.equal(synchronized.state.cursor.current, 'b');
});

test('controlled null highlight overrides defaults and uncontrolled controllers reject sync', () => {
  const domain = createSequence(['a']);
  const controlled = unwrap(createListboxController({
    domain,
    highlightedValue: null,
    defaultHighlightedValue: 'a',
  }));
  assert.equal(controlled.getSnapshot().state.cursor.current, null);

  const uncontrolled = unwrap(createListboxController({ domain }));
  const sync = uncontrolled.syncControlledValues({});
  assert.equal(sync.ok, false);
  assert.equal(sync.error.code, 'uncontrolled-controller-sync');
});

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
