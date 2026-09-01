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

test('terminal listbox facade owns construction, input dispatch, and activation', () => {
  const activations = [];
  let updates = 0;
  const connection = createListbox({
    items: ['a', 'b'],
    defaultHighlightedValue: 'a',
    onActivate: (id) => activations.push(id),
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'tab' }), false);
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.deepEqual(activations, ['b']);
  assert.equal(updates, 2);

  assert.throws(
    () => createListbox({ items: ['a', 'a'] }),
    (error) => error.name === 'SectileResultError' && error.code === 'duplicate-id',
  );
  const duplicate = tryCreateListbox({ items: ['a', 'a'] });
  assert.equal(duplicate.ok, false);
});

test('terminal listbox preserves mixed primitive identities', () => {
  const connection = createListbox({
    items: [1, '1', -1, '-1'],
    defaultHighlightedValue: 1,
  });
  assert.equal(connection.handleEvent({ type: 'focus', id: '1' }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, '1');
  assert.equal(connection.handleEvent({ type: 'focus', id: -1 }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, -1);
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

test('terminal facade exposes state, send, update, subscribe, and destroy aliases', () => {
  const connection = createListbox({
    items: ['a', 'b'],
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
  assert.equal(connection.send('previous'), false);
});

test('terminal ready listbox publishes host effects and observers before callback errors escape', () => {
  const trace = [];
  const callbackError = new Error('value callback failed');
  const connection = createListbox({
    items: ['a', 'b'],
    defaultHighlightedValue: 'a',
    onActivate: (id) => trace.push(`effect:${id}`),
    onValueChange: () => {
      trace.push('value');
      throw callbackError;
    },
    onUpdate: () => {
      trace.push('update');
      throw new Error('secondary update callback failed');
    },
  });
  connection.subscribe((snapshot) => trace.push(`observer:${snapshot.revision}`));

  assert.throws(
    () => connection.handleEvent({ type: 'activate', id: 'b' }),
    (error) => error === callbackError,
  );
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['b']);
  assert.deepEqual(trace, ['effect:b', 'value', 'observer:1', 'update']);

  connection.destroy();
  assert.equal(connection.send('previous'), false);
});

test('terminal listbox supports single selection, disabled items, typeahead, and direct events', () => {
  let now = 0;
  const connection = createListbox({
    items: ['alpha', 'blocked', 'bravo', 'beta'],
    selectionMode: 'single',
    disabledItems: ['blocked'],
    defaultHighlightedValue: 'alpha',
    typeahead: { textValue: (id) => id, now: () => now, timeoutMs: 250 },
  });

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
  const domain = createSequence(['a', 'b']);
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

test('controlled terminal callback synchronization and nested events preserve the latest live revision', () => {
  const domain = createSequence(['a', 'b', 'c']);
  let controller;
  let callbackCount = 0;
  controller = unwrap(createListboxController({
    domain,
    highlightedValue: 'a',
    onHighlightedValueChange(change) {
      callbackCount += 1;
      unwrap(controller.syncControlledValues({ highlightedValue: change.value }));
      if (callbackCount === 1) {
        assert.equal(controller.handleEvent({ type: 'focus', id: 'c' }).ok, true);
      }
    },
  }));

  const outer = controller.handleEvent({ type: 'focus', id: 'b' });
  assert.equal(outer.ok, true);
  assert.equal(outer.snapshot.revision, 1);
  assert.equal(callbackCount, 2);
  assert.equal(controller.getSnapshot().revision, 4);
  assert.equal(controller.getSnapshot().state.cursor.current, 'c');
});

test('unsupported and stale terminal inputs are failure-atomic', () => {
  const domain = createSequence(['a']);
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
  const connection = createListbox({
    items: ['a', 'b'],
    defaultHighlightedValue: 'a',
    defaultValue: ['a'],
    readOnly: true,
  });
  assert.equal(connection.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, 'b');
  assert.equal(connection.handleKeyboardInput({ key: 'space' }), false);
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['a']);
});
