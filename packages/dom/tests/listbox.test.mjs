import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createListboxController,
  toListboxEffect,
  toListboxEvent,
} from '../dist/listbox.js';
import { createSequence } from '@sectile/primitives/sequence';

test('DOM keyboard inputs map onto listbox semantic events', () => {
  assert.equal(toListboxEvent({ key: 'ArrowDown' }), 'next');
  assert.equal(toListboxEvent({ key: 'ArrowUp' }), 'previous');
  assert.equal(toListboxEvent({ key: ' ' }), 'toggle');
  assert.equal(toListboxEvent({ key: 'Enter' }), 'activate');
  assert.equal(toListboxEvent({ key: 'Escape' }), 'clear');
  assert.equal(toListboxEvent({ key: 'ArrowDown', ctrlKey: true }), null);
  assert.equal(toListboxEvent({ key: 'Tab' }), null);
});

test('DOM commands project into DOM-specific effects', () => {
  assert.deepEqual(toListboxEffect({ type: 'focus', id: 'a' }), {
    type: 'focus-element',
    id: 'a',
  });
  assert.deepEqual(toListboxEffect({ type: 'activate', id: 'a' }), {
    type: 'dispatch-activation',
    id: 'a',
  });
});

test('uncontrolled DOM controller owns state and rejects stale or unsupported inputs atomically', () => {
  const domain = unwrap(createSequence(['a', 'b']));
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
  assert.deepEqual(moved.commands, [{ type: 'focus-element', id: 'b' }]);
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
  const domain = unwrap(createSequence(['a', 'b']));
  const values = [];
  const highlights = [];
  const controller = unwrap(createListboxController({
    domain,
    value: ['a'],
    highlightedValue: 'a',
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
  assert.deepEqual(moved.commands, [{ type: 'focus-element', id: 'b' }]);
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
  const domain = unwrap(createSequence(['a']));
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

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
