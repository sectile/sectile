import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import {
  createListbox,
  createListboxController,
  toListboxEffect,
  toListboxEvent,
} from '../dist/listbox.js';
import { createSequence } from '@sectile/core/sequence';

test('terminal listbox facade owns construction, input dispatch, and activation', () => {
  const activations = [];
  let updates = 0;
  const connection = unwrap(createListbox({
    items: ['a', 'b'],
    defaultHighlightedValue: 'a',
    onActivate: (id) => activations.push(id),
    onUpdate: () => { updates += 1; },
  }));
  assert.equal(connection.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'tab' }), false);
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.deepEqual(activations, ['b']);
  assert.equal(updates, 2);

  const duplicate = createListbox({ items: ['a', 'a'] });
  assert.equal(duplicate.ok, false);
});

test('terminal keys map onto listbox semantic events', () => {
  assert.equal(toListboxEvent({ key: 'down' }), 'next');
  assert.equal(toListboxEvent({ key: 'up' }), 'previous');
  assert.equal(toListboxEvent({ key: 'space' }), 'toggle');
  assert.equal(toListboxEvent({ key: 'enter' }), 'activate');
  assert.equal(toListboxEvent({ key: 'escape' }), 'clear');
  assert.equal(toListboxEvent({ key: 'home' }), 'first');
  assert.equal(toListboxEvent({ key: 'end' }), 'last');
  assert.equal(toListboxEvent({ key: 'right' }, 'horizontal'), 'next');
  assert.equal(toListboxEvent({ key: 'down' }, 'horizontal'), null);
  assert.equal(toListboxEvent({ key: 'tab' }), null);
});

test('terminal listbox supports single selection, disabled items, typeahead, and direct events', () => {
  let now = 0;
  const connection = unwrap(createListbox({
    items: ['alpha', 'blocked', 'bravo', 'beta'],
    selectionMode: 'single',
    disabledItems: ['blocked'],
    defaultHighlightedValue: 'alpha',
    typeahead: { textValue: (id) => id, now: () => now, timeoutMs: 250 },
  }));

  assert.equal(connection.handleKeyboardInput({ key: 'b', text: 'b' }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, 'bravo');
  assert.equal(connection.handleEvent('toggle'), true);
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['bravo']);
  assert.equal(connection.handleEvent('toggle'), true);
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['bravo']);
  now = 400;
  connection.handleKeyboardInput({ key: 'b', text: 'b' });
  assert.equal(connection.getSnapshot().state.cursor.current, 'beta');
});

test('terminal commands project into terminal-specific effects', () => {
  assert.deepEqual(toListboxEffect({ type: 'focus', id: 'a' }), {
    type: 'move-highlight',
    id: 'a',
  });
  assert.deepEqual(toListboxEffect({ type: 'activate', id: 'a' }), {
    type: 'submit-item',
    id: 'a',
  });
});

test('terminal controller supports mixed controlled and uncontrolled state', () => {
  const domain = unwrap(createSequence(['a', 'b']));
  const highlights = [];
  const controller = unwrap(createListboxController({
    domain,
    value: [],
    defaultHighlightedValue: 'a',
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
  }));

  const moved = controller.handleKeyboardInput({ key: 'down' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'b');
  assert.deepEqual(moved.commands, [{ type: 'move-highlight', id: 'b' }]);
  assert.deepEqual(highlights, [{ value: 'b', previousValue: 'a' }]);

  const toggled = controller.handleKeyboardInput({ key: 'space' });
  assert.equal(toggled.ok, true);
  assert.deepEqual(toggled.snapshot.state.selection.selected, []);

  const synchronized = unwrap(controller.syncControlledValues({ value: ['b'] }));
  assert.deepEqual(synchronized.state.selection.selected, ['b']);
  assert.equal(synchronized.state.cursor.current, 'b');
});

test('unsupported and stale terminal inputs are failure-atomic', () => {
  const domain = unwrap(createSequence(['a']));
  const controller = unwrap(createListboxController({ domain }));
  const initial = controller.getSnapshot();
  const unsupported = controller.handleKeyboardInput({ key: 'tab' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, initial);
  assert.deepEqual(unsupported.commands, []);
  const stale = controller.handleKeyboardInput({ key: 'down' }, 1);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.snapshot, initial);
});

test('read-only listbox navigates without changing selection', () => {
  const connection = unwrap(createListbox({
    items: ['a', 'b'],
    defaultHighlightedValue: 'a',
    defaultValue: ['a'],
    readOnly: true,
  }));
  assert.equal(connection.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.equal(connection.handleKeyboardInput({ key: 'space' }), false);
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['a']);
});
